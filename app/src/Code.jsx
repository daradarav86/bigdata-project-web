import { useState } from 'react'
import { TOPICS, ERRORS, SYMPTOMS, TERMS } from './data/hints.js'
import { TabIntro } from './Guide.jsx'

function Ladder({ topic }) {
  const [level, setLevel] = useState(1)
  const [tried, setTried] = useState('')
  const next = () => { setLevel(l => l + 1); setTried('') }
  const split = a => a.split(' : ')
  return (
    <div className="ladder">
      <div className="step"><b>1단계 · 먼저 생각해 볼 질문</b><ul>{topic.asks.map(a => <li key={a}>{a}</li>)}</ul></div>
      {level >= 2 ? (
        <div className="step"><b>2단계 · 쓸 수 있는 도구</b>
          <ul>{topic.tools.map(a => { const [k, v] = split(a); return <li key={a}><code>{k}</code>{v && ` ${v}`}</li> })}</ul>
        </div>
      ) : <div className="step locked"><b>2단계 · 쓸 수 있는 도구</b><small>🔒 시도한 것을 적으면 열려요</small></div>}
      {level >= 3 ? <div className="step"><b>3단계 · 빈칸 뼈대</b><pre className="frame">{topic.skeleton}</pre></div>
        : <div className="step locked"><b>3단계 · 빈칸 뼈대</b><small>🔒 2단계를 읽고 다시 시도해 본 뒤 열려요</small></div>}
      {level < 3 && (
        <div className="unlock">
          <label className="small" htmlFor="tried">다음 단계를 열기 전에, 지금까지 시도한 것을 한 줄로 적어 보세요.</label>
          <div className="row">
            <input id="tried" value={tried} maxLength={100} onChange={e => setTried(e.target.value)} placeholder="예: groupby를 써 봤는데 NaN이 나왔어요" />
            <button className="primary" disabled={tried.trim().length < 5} onClick={next}>다음 단계</button>
          </div>
        </div>
      )}
    </div>
  )
}

function Accordion({ items }) {
  const [open, setOpen] = useState(-1)
  return items.map((s, i) => (
    <div key={s.q} className="acc">
      <button aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>{s.q}<span aria-hidden="true">{open === i ? '−' : '+'}</span></button>
      {open === i && <ul>{s.a.map(t => <li key={t}>{t}</li>)}</ul>}
    </div>
  ))
}

function ErrorDecoder() {
  const [msg, setMsg] = useState('')
  const hit = msg.trim() ? ERRORS.find(e => e.key.test(msg)) : null
  return (
    <section className="panel">
      <h3>오류 해독기</h3>
      <textarea rows={3} value={msg} aria-label="오류 메시지" placeholder="빨간 오류 메시지의 마지막 줄을 붙여 넣어요 (예: KeyError: 'age')" onChange={e => setMsg(e.target.value)} />
      {msg.trim() && !hit && <p className="muted small">아직 모르는 오류예요. 화면 아래 코치에게 물어보세요.</p>}
      {hit && (
        <div className="decode">
          <b>{hit.name}</b> — {hit.meaning}
          <ul>{hit.check.map(c => <li key={c}>{c}</li>)}</ul>
        </div>
      )}
      <h4>오류는 없는데 이상해요</h4>
      <Accordion items={SYMPTOMS} />
    </section>
  )
}

function Glossary() {
  return (
    <section className="panel">
      <details>
        <summary><b>용어 풀이</b> <span className="muted small">헷갈리는 말이 있으면 열어 봐요</span></summary>
        <dl className="gloss">{TERMS.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      </details>
    </section>
  )
}

export default function Code() {
  const [id, setId] = useState(TOPICS[0].id)
  const topic = TOPICS.find(t => t.id === id)
  return (
    <div className="stack">
        <TabIntro>코드는 노트북(Colab)에서 실행해요. 막히는 곳이 있으면 ① 막힌 부분을 고르고 → ② 힌트를 1단계부터 읽고 → ③ 오류 메시지는 해독기에 붙여 넣고 → ④ 그래도 안 되면 화면 아래 코치에게 물어요.</TabIntro>
        <section className="panel">
          <h3>어떤 부분에서 막혔나요?</h3>
          <div className="chips">
            {TOPICS.map(t => <button key={t.id} aria-pressed={id === t.id} className={id === t.id ? 'on' : ''} onClick={() => setId(t.id)}>{t.name}</button>)}
          </div>
          <Ladder key={id} topic={topic} />
        </section>
        <ErrorDecoder />
        <Glossary />
    </div>
  )
}
