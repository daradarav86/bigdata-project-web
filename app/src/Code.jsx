import { useState } from 'react'
import { TOPICS, ERRORS, SYMPTOMS, TERMS } from './data/hints.js'
import { TabIntro } from './Guide.jsx'
import { buildCodeMemo, isFreq, isGoogleUrl, statFor, chartFor, missingOf, axisOf } from './doc.js'
import { NOTEBOOK_URL } from './data/meta.js'
import Results from './Results.jsx'

// 3단계에서 보여 주는 "우리 조가 기획에서 고른 것". 코드에 넣어 주지 않고 옆에 따로 보여 준다.
function picksOf(kinds, game) {
  const s = statFor(game), c = chartFor(game), mm = missingOf(game.missingMethod), ax = axisOf(game)
  const none = '(기획에서 아직 안 정했어요)'
  const map = {
    file: ['데이터 파일', game.dataset ? `${game.dataset}.csv` : none],
    G: ['기준 열 (묶는 기준)', game.groupBy || none],
    M: ['사용할 열 (계산할 열)', isFreq(game) ? '없음 (그룹별 개수를 세요)' : game.measure || none],
    S: ['통계 함수', isFreq(game) ? '개수 (count / value_counts)' : s?.ko ? `${s.ko}` : none],
    missing: ['결측값 처리 계획', mm ? mm.ko : none],
    newCol: ['새 열 아이디어', game.newCol?.trim() || '(기획에서 안 정했으면 추천 짝 표를 보세요)'],
    chart: ['그래프 종류', c?.short || c?.ko || none],
    labels: ['축', `가로축 ${game.xLabel?.trim() || ax.x || '?'} / 세로축 ${game.yLabel?.trim() || ax.y || '?'}`],
  }
  return kinds.map(k => map[k]).filter(Boolean)
}

export function Ladder({ topic, game }) {
  const [level, setLevel] = useState(1)
  const [tried, setTried] = useState('')
  const next = () => { setLevel(l => l + 1); setTried('') }
  const split = a => a.split(' : ')
  return (
    <div className="ladder">
      <div className="step"><b>먼저 생각해 볼 질문</b><ul>{topic.asks.map(a => <li key={a}>{a}</li>)}</ul></div>
      <div className="step"><b>1단계 · 빈칸 틀</b><small className="muted"> 학습지와 수업 노트북을 보며 빈칸을 채워 보세요</small>
        <pre className="frame">{topic.frame}</pre></div>
      {level >= 2 ? (
        <div className="step"><b>2단계 · 쓸 함수</b>
          <ul>{topic.tools.map(a => { const [k, v] = split(a); return <li key={a}><code>{k}</code>{v && ` ${v}`}</li> })}</ul>
        </div>
      ) : <div className="step locked"><b>2단계 · 쓸 함수</b><small>🔒 시도한 것을 적으면 열려요</small></div>}
      {level >= 3 ? (
        <div className="step"><b>3단계 · 빈칸마다 들어갈 것</b>
          <pre className="frame">{topic.named}</pre>
          <div className="picks"><small className="muted">우리 조가 기획에서 고른 것</small>
            <ul>{picksOf(topic.picks, game).map(([k, v]) => <li key={k}>{k}: <code>{v}</code></li>)}</ul></div>
        </div>
      ) : <div className="step locked"><b>3단계 · 빈칸마다 들어갈 것</b><small>🔒 2단계를 읽고 다시 시도해 본 뒤 열려요</small></div>}
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
      {msg.trim() && !hit && <p className="muted small">아직 모르는 오류예요. 오른쪽 아래 코치에게 물어보세요.</p>}
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

// 기획에서 정한 내용을 Colab 노트북 첫 칸에 붙여 넣을 주석으로 만들어 준다 (정답 코드는 아니고 우리 팀의 선택만 담는다)
function DesignMemo({ game }) {
  const [copied, setCopied] = useState(false)
  const memo = buildCodeMemo(game)
  const copy = async () => {
    try { await navigator.clipboard.writeText(memo); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* 복사 불가 환경 */ }
  }
  return (
    <section className="panel">
      <h3>우리 팀 설계 메모 <small className="muted">기획에서 정한 것을 노트북으로 가져가요</small></h3>
      <p className="hint">아래 메모를 복사해서 프로젝트 노트북의 맨 위 칸에 붙여 두면, 코딩하다가 우리가 무엇을 하기로 했는지 바로 볼 수 있어요. 메모는 <code>#</code> 주석이라 실행에는 영향이 없어요.</p>
      <pre className="frame">{memo}</pre>
      <button type="button" className="primary" onClick={copy}>{copied ? '복사됨' : '메모 복사'}</button>
    </section>
  )
}

// 우리 조의 Colab 노트북과 공유 폴더 주소를 저장해 두고 바로 연다 (선생님도 관리자 화면에서 열 수 있다)
function TeamLinks({ game, patch }) {
  const link = (url, label) => (isGoogleUrl(url)
    ? <a className="primary linkbtn" href={url.trim()} target="_blank" rel="noopener noreferrer">{label} (새 창)</a>
    : null)
  const bad = u => u.trim() && !isGoogleUrl(u)
  return (
    <section className="panel">
      <h3>우리 조 노트북·폴더</h3>
      <p className="hint">코드는 12차시부터 써 온 <b>나의 ~_프로젝트.ipynb</b>(우리 조 데이터의 노트북)에 이어서 써요. 노트북과 조 공유 폴더 주소를 한 번 넣어 두면 다음 시간에도 여기서 바로 열 수 있어요.</p>
      <div className="two-col">
        <label className="field"><span className="lbl">Colab 노트북 주소</span>
          <input value={game.notebookUrl} placeholder="https://colab.research.google.com/drive/…" onChange={e => patch({ notebookUrl: e.target.value })} />
          {bad(game.notebookUrl) && <small className="warn">Colab·구글 드라이브 주소만 넣을 수 있어요</small>}</label>
        <label className="field"><span className="lbl">조 공유 폴더 주소</span>
          <input value={game.folderUrl} placeholder="https://drive.google.com/drive/folders/…" onChange={e => patch({ folderUrl: e.target.value })} />
          {bad(game.folderUrl) && <small className="warn">구글 드라이브 주소만 넣을 수 있어요</small>}</label>
      </div>
      <div className="row start">
        {link(game.notebookUrl, '우리 노트북 열기')}
        {link(game.folderUrl, '조 공유 폴더 열기')}
      </div>
      <p className="muted small">노트북이 없을 때만: <a href={NOTEBOOK_URL} target="_blank" rel="noopener noreferrer">빈 프로젝트 노트북 템플릿</a>을 열고 "Drive에 사본 저장"을 눌러요.</p>
    </section>
  )
}

export default function Code({ game, setDeck, patch }) {
  const [id, setId] = useState(TOPICS[0].id)
  const topic = TOPICS.find(t => t.id === id)
  return (
    <div className="stack">
      <TabIntro>코드는 Colab 노트북에서 실행해요. 이 탭에서는 우리 팀의 설계를 노트북으로 가져가고, 막히면 ① 막힌 부분을 고르고 → ② 힌트를 1단계부터 읽고 → ③ 오류 메시지는 해독기에 붙여 넣고 → ④ 그래도 안 되면 오른쪽 아래 코치에게 물어요. 결과가 나오면 맨 아래 <b>"분석 결과 정리"</b>에 적어요(기획안 4번, 발표 슬라이드에 그대로 들어가요).</TabIntro>
      <TeamLinks game={game} patch={patch} />
      <DesignMemo game={game} />
      <section className="panel">
        <h3>어떤 부분에서 막혔나요?</h3>
        <div className="chips">
          {TOPICS.map(t => <button key={t.id} aria-pressed={id === t.id} className={id === t.id ? 'on' : ''} onClick={() => setId(t.id)}>{t.name}</button>)}
        </div>
        <Ladder key={id} topic={topic} game={game} />
      </section>
      <ErrorDecoder />
      <Results game={game} setDeck={setDeck} />
      <Glossary />
    </div>
  )
}
