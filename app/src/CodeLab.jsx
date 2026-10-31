import { useEffect, useState } from 'react'
import { cellsFor, blankLines, explain } from './py/cells.js'
import { getDs } from './data/meta.js'
import { statFor, chartFor, isFreq, missingOf } from './doc.js'

// 파이썬 출력 한 덩어리: 글, 표(pandas가 만든 HTML), 그래프(PNG)
function Output({ items }) {
  return items.map((o, i) => {
    if (o.k === 'text') return <pre key={i} className="py-text">{o.v}</pre>
    if (o.k === 'html') return <div key={i} className="py-html" dangerouslySetInnerHTML={{ __html: o.v }} />
    return <img key={i} className="py-img" alt="그래프 결과" src={'data:image/png;base64,' + o.v} />
  })
}

function ErrorBox({ e, code }) {
  const x = explain(e, code)
  return (
    <div className="py-err" role="alert">
      <b>오류가 났어요</b>
      <code>{x.text}</code>
      {x.line && <p>{x.line}번째 줄 {x.src && <>→ <code>{x.src}</code></>}</p>}
      {x.hit && (
        <div className="decode"><b>{x.hit.name}</b> — {x.hit.meaning}
          <ul>{x.hit.check.map(c => <li key={c}>{c}</li>)}</ul></div>
      )}
      <small className="muted">그래도 모르겠으면 오른쪽 아래 코치에게 물어봐요. (코인 1개)</small>
    </div>
  )
}

function Cell({ cell, code, edited, onChange, onReset, onRun, o, busy, children }) {
  const rows = Math.min(14, Math.max(3, code.split('\n').length + 1))
  const key = e => {
    if (e.key === 'Tab') { // 들여쓰기: 칸 밖으로 포커스가 나가지 않게 공백 4칸
      e.preventDefault()
      const el = e.target, s = el.selectionStart
      onChange(code.slice(0, s) + '    ' + code.slice(el.selectionEnd))
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + 4 })
    } else if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); onRun() }
  }
  return (
    <section className="cell panel">
      <header>
        <h3>{cell.title}</h3>
        {o?.items && !o.err && <span className="ran">실행함 · {o.ms}ms</span>}
      </header>
      <p className="hint">{cell.help}</p>
      <textarea className="mono code" rows={rows} spellCheck={false} value={code} aria-label={cell.title + ' 코드'}
        onChange={e => onChange(e.target.value)} onKeyDown={key} />
      <div className="row start">
        <button type="button" className="primary" disabled={busy} onClick={onRun}>{o?.running ? '실행 중…' : '▶ 실행'}</button>
        {edited && <button type="button" className="ghost" onClick={onReset}>처음 코드로</button>}
        <small className="muted">Shift+Enter로도 실행해요</small>
      </div>
      {o?.blanks && <p className="warn" role="alert">빈칸(___)이 남아 있어요 ({o.blanks.join(', ')}번째 줄). 우리 팀의 선택으로 채운 뒤 실행해요.</p>}
      {o?.timeout && <p className="warn" role="alert">코드가 너무 오래 걸려서 멈췄어요. 반복(while)이 끝나지 않는지 확인해 주세요. 파이썬을 다시 준비했으니 위 칸부터 다시 실행해요.</p>}
      {o?.fatal && <p className="warn" role="alert">{o.fatal}</p>}
      {o?.err && <ErrorBox e={o.err} code={o.code} />}
      {o?.items && o.items.length > 0 && <div className="py-out"><Output items={o.items} /></div>}
      {o?.items && o.items.length === 0 && !o.err && <p className="muted small">(출력할 내용이 없어요. 오류 없이 실행됐어요.)</p>}
      {children}
    </section>
  )
}

export default function CodeLab({ game, patch, setDeck, py, out, setOut }) {
  const ds = getDs(game.dataset)
  const cells = cellsFor(game)
  const [sent, setSent] = useState('')
  const startPy = py.start
  useEffect(() => { startPy() }, [startPy]) // 코드 탭을 열면 미리 준비해 둔다

  const codeOf = c => game.cells[c.id] ?? c.code
  const setCode = (c, v) => patch(g => ({ cells: { ...g.cells, [c.id]: v } }))
  const reset = c => patch(g => { const rest = { ...g.cells }; delete rest[c.id]; return { cells: rest } })

  const run = async c => {
    const code = codeOf(c)
    const blanks = blankLines(code)
    if (blanks.length) { setOut(o => ({ ...o, [c.id]: { blanks } })); return }
    setOut(o => ({ ...o, [c.id]: { running: true } }))
    const r = await py.run(code)
    if (r.timeout) setOut(o => ({ ...o, [c.id]: { timeout: true } }))
    else if (r.fatal) setOut(o => ({ ...o, [c.id]: { fatal: r.fatal } }))
    else setOut(o => ({ ...o, [c.id]: { items: r.out, err: r.err, ms: r.ms, code } }))
  }

  // 결과를 발표 슬라이드로: 변수 result의 가장 큰·작은 그룹과 차이
  const sendSummary = async () => {
    const s = await py.summary()
    if (!s) { setSent('result가 아직 없어요. 미션 3-2를 먼저 실행해요.'); return }
    setDeck({ hi: s.hi, hiVal: String(s.hiVal), lo: s.lo, loVal: String(s.loVal), diffPts: String(s.diff), diffX: s.ratio == null ? '' : String(s.ratio) })
    setSent('가장 큰·작은 값과 차이를 발표 4~5장에 넣었어요.')
  }
  const sendGraph = c => {
    const img = out[c.id]?.items?.find(i => i.k === 'img')
    if (!img) return
    setDeck({ graph: 'data:image/png;base64,' + img.v })
    setSent('그래프를 발표 4장에 넣었어요.')
  }

  const busy = py.status === 'running' || py.status === 'loading'
  const st = statFor(game), ch = chartFor(game)
  return (
    <div className="stack">
      <section className="panel pystatus">
        {py.fatal
          ? <><b className="warn">파이썬을 불러오지 못했어요</b><p className="small">{py.fatal}</p><button className="ghost" onClick={py.start}>다시 시도</button></>
          : py.status === 'loading' || py.status === 'idle'
            ? <><b>파이썬을 준비하고 있어요</b> <span className="muted small">{py.stage || '시작하는 중'}</span><div className="bar indeterminate" aria-hidden="true"><span /></div>
              <p className="muted small">처음 한 번만 오래 걸려요(약 30초~1분). 기다리는 동안 아래 우리 팀 설계를 읽어 두세요.</p></>
            : <><b className="ok-msg">파이썬 준비 완료</b> <span className="muted small">위 칸부터 순서대로 실행해요. 칸 사이에 변수(df, df_use, result)가 이어져요.</span></>}
      </section>

      <section className="panel design">
        <h3>우리 팀 설계 <small className="muted">기획에서 정한 내용이에요</small></h3>
        <dl className="facts wide">
          <div><dt>질문</dt><dd>{game.question || '(기획에서 질문을 써요)'}</dd></div>
          <div><dt>데이터</dt><dd>{ds ? ds.id + '.csv' : '(기획에서 데이터를 골라요)'}</dd></div>
          <div><dt>분석</dt><dd>{game.groupBy || '?'}(으)로 묶어 {isFreq(game) ? '개수(빈도)' : (game.measure || '?') + '의 ' + st.ko} → {ch.ko} 그래프</dd></div>
          <div><dt>빈칸 처리</dt><dd>{missingOf(game.missingMethod)?.ko ?? '(기획에서 정해요)'}{game.missingWhy ? ' — ' + game.missingWhy : ''}</dd></div>
        </dl>
      </section>

      {cells.map(c => (
        <Cell key={c.id} cell={c} code={codeOf(c)} edited={game.cells[c.id] !== undefined && game.cells[c.id] !== c.code}
          onChange={v => setCode(c, v)} onReset={() => reset(c)} onRun={() => run(c)} o={out[c.id]} busy={busy}>
          {c.id === 'm4' && out.m4?.items?.some(i => i.k === 'img') && <button type="button" className="ghost" onClick={() => sendGraph(c)}>이 그래프를 발표 슬라이드에 넣기</button>}
          {c.id === 'm5' && out.m5?.items && !out.m5.err && <button type="button" className="ghost" onClick={sendSummary}>이 결과를 발표 슬라이드에 넣기</button>}
        </Cell>
      ))}
      {sent && <p className="ok-msg" role="status">{sent}</p>}
    </div>
  )
}
