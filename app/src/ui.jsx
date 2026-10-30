import { useId, useState } from 'react'

// 한글 받침에 맞춰 조사를 고른다: "방식을(를)" → "방식을", "상담을(를)" → "상담을", "분야이(가)" → "분야가"
// 영문·숫자 뒤는 받침을 알 수 없어 "을(를)"을 그대로 둔다.
const JOSA = { '을(를)': ['을', '를'], '이(가)': ['이', '가'], '은(는)': ['은', '는'], '와(과)': ['과', '와'], '으로(로)': ['으로', '로'] }
export function fixJosa(s) {
  return s.replace(/([가-힣])(을\(를\)|이\(가\)|은\(는\)|와\(과\)|으로\(로\))/g, (_, ch, j) => {
    const final = (ch.charCodeAt(0) - 0xac00) % 28
    const [withFinal, without] = JOSA[j]
    if (j === '으로(로)') return ch + (final === 0 || final === 8 ? without : withFinal) // ㄹ 받침은 "로"
    return ch + (final === 0 ? without : withFinal)
  })
}

// 문장 틀 도우미: 빈칸만 채우면 문장이 만들어진다. 어려운 학생의 출발점이고, 넣은 뒤에도 자유롭게 고칠 수 있다.
// parts: 문자열 또는 { key, ph, def } (def는 기본으로 채워 둘 값)
export function FrameHelper({ parts, onUse }) {
  const [vals, setVals] = useState({})
  const val = p => vals[p.key] ?? p.def ?? ''
  const text = fixJosa(parts.map(p => (typeof p === 'string' ? p : (val(p).trim() || '___'))).join(''))
  return (
    <details className="framehelp">
      <summary>문장 틀로 쓰기 <small>어려우면 빈칸만 채워요</small></summary>
      <p className="fsent">
        {parts.map((p, i) => (typeof p === 'string'
          ? <span key={i}>{p}</span>
          : <input key={i} className="blankin" aria-label={p.ph} placeholder={p.ph} value={val(p)}
            style={{ width: `${Math.max(7, (val(p) || p.ph).length * 1.6 + 2)}ch` }}
            onChange={e => setVals(v => ({ ...v, [p.key]: e.target.value }))} />))}
      </p>
      <button type="button" className="ghost" onClick={() => onUse(text)}>이 문장 넣기</button>
      <small className="muted"> 넣은 뒤에 위 칸에서 마음대로 고쳐도 돼요.</small>
    </details>
  )
}

// 라벨 + 도움말 + 입력 한 묶음
export function Field({ label, hint, children }) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id} className="lbl">{label}</label>
      {hint && <p className="hint">{hint}</p>}
      {children(id)}
    </div>
  )
}

export function Text({ label, hint, value, onChange, rows, placeholder, max, frame }) {
  return (
    <Field label={label} hint={hint}>
      {id => (
        <>
          {rows
            ? <textarea id={id} rows={rows} value={value} maxLength={max} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
            : <input id={id} value={value} maxLength={max} placeholder={placeholder} onChange={e => onChange(e.target.value)} />}
          {frame && <FrameHelper parts={frame} onUse={onChange} />}
        </>
      )}
    </Field>
  )
}

// 세그먼트형 단일 선택
export function Seg({ label, hint, value, options, onChange }) {
  return (
    <div className="field">
      <span className="lbl">{label}</span>
      {hint && <p className="hint">{hint}</p>}
      <div className="seg" role="radiogroup" aria-label={label}>
        {options.map(o => (
          <button key={o.id} role="radio" aria-checked={value === o.id} className={value === o.id ? 'on' : ''} onClick={() => onChange(o.id)}>
            <b>{o.ko}</b>{o.desc && <small>{o.desc}</small>}
          </button>
        ))}
      </div>
    </div>
  )
}

// "생각해 볼 질문" 상자 — 답을 주지 않고 질문만 던진다
export function Think({ children }) {
  return <aside className="think"><b>생각해 볼 질문</b><ul>{children}</ul></aside>
}

// 이 단계에서 막힐 때의 팁 (접이식)
export function Stuck({ items }) {
  return (
    <details className="stuck">
      <summary>이 단계에서 막혔나요?</summary>
      <dl>{items.map(([q, a]) => <div key={q}><dt>{q}</dt><dd>{a}</dd></div>)}</dl>
    </details>
  )
}
