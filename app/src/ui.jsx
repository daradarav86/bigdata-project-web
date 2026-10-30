import { useId } from 'react'

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

export function Text({ label, hint, value, onChange, rows, placeholder, max }) {
  return (
    <Field label={label} hint={hint}>
      {id => rows
        ? <textarea id={id} rows={rows} value={value} maxLength={max} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
        : <input id={id} value={value} maxLength={max} placeholder={placeholder} onChange={e => onChange(e.target.value)} />}
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
