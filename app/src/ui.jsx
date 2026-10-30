import { useId, useState } from 'react'
import { fixJosa } from './josa.js'

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
          <button key={o.id} type="button" role="radio" aria-checked={value === o.id} className={value === o.id ? 'on' : ''} onClick={() => onChange(o.id)}>
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
