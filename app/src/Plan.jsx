import { useMemo, useState } from 'react'
import datasets from './data/datasets.json'
import { FRAMES, STATS, CHARTS, MISSING, KIND_LABEL, getDs, getCol } from './data/meta.js'
import { PLAN_STEPS, stepDone, draftQuestion, checkCodeDesign, buildPlanText, pct, statFor, chartFor, isFreq, hasMeasure, picksKey, frameOf, nameOf, missingOf, reviewState, MAX_REVIEWS, MAX_CONCERNS, concernText, axisOptions, axisOf, dataCheck } from './doc.js'
import { reviewQuestion } from './coach.js'
import { Text, Seg, Think, Stuck } from './ui.jsx'
import { exportPlanDocx } from './exportDoc.js'
import { EXAMPLE_TITLE, EXAMPLE_STEPS, EXAMPLE_ORDER } from './data/examples.js'

const dsName = d => `${d.field} · ${d.desc}`
const tokens = s => s.split(/[\s,·/()]+/).filter(t => t.length >= 2)

/* ---------- 열 목록 (뜻·종류·결측값) ---------- */
function ColTable({ ds }) {
  return (
    <div className="tablewrap">
      <table>
        <thead><tr><th>열 이름</th><th>뜻</th><th>종류</th><th>결측값(NaN)</th></tr></thead>
        <tbody>
          {ds.columns.map(c => (
            <tr key={c.name}>
              <td><code>{c.name}</code></td>
              <td>{c.meaning}</td>
              <td><span className={`tag ${c.kind}`}>{KIND_LABEL[c.kind]}</span></td>
              <td>{c.missing > 0 ? <b className="warn">{c.missing}</b> : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ---------- 열 고르기 ---------- */
// 선생님 추천 짝에 나온 열 이름을 실제 열로 바꾼다. 설명("마지막 열(압축강도)")이면 마지막 열로 본다.
function recNames(ds, which) {
  const text = ds.pair?.[which] ?? ''
  const real = text.split(',').map(s => s.trim()).filter(n => ds.columns.some(c => c.name === n))
  if (real.length) return real
  return /마지막 열/.test(text) && ds.columns.length ? [ds.columns[ds.columns.length - 1].name] : []
}

// pred: 이 칸에 어울리는 열인지. rec: 선생님 추천 열(종류와 상관없이 항상 맨 위에 "추천"으로 보인다).
function ColPicker({ label, hint, ds, value, onPick, pred, rec = [], warn }) {
  const [all, setAll] = useState(false)
  const base = ds.columns.filter(c => pred(c) || rec.includes(c.name))
  const none = base.length === 0 // 어울리는 열이 하나도 없는 데이터는 처음부터 모든 열을 보여 준다
  const list = (all || none ? ds.columns : base).slice().sort((a, b) => Number(rec.includes(b.name)) - Number(rec.includes(a.name)))
  const cur = getCol(ds, value)
  const w = cur && warn(cur)
  return (
    <div className="field">
      <span className="lbl">{label}</span>
      <p className="hint">{hint}</p>
      {none && <p className="warn small" role="status">이 데이터에는 이 칸에 어울리는 종류의 열이 없어서 모든 열을 보여 줘요. 값이 몇 종류 안 되는 열을 골라요.</p>}
      <div className="colgrid" role="radiogroup" aria-label={label}>
        {list.map(c => (
          <button key={c.name} role="radio" aria-checked={value === c.name} className={`col ${value === c.name ? 'on' : ''}`} onClick={() => onPick(c.name)}>
            <code>{c.name}{rec.includes(c.name) && <span className="recmark">추천</span>}</code>
            <span>{c.meaning}</span>
            <small>{KIND_LABEL[c.kind]}{c.kind === 'group' ? ` · ${c.unique}개 값` : ''}{c.missing ? ` · 결측값 ${c.missing}` : ''}</small>
          </button>
        ))}
      </div>
      {!none && (
        <div className="row start">
          <button type="button" className={`ghost ${all ? 'on' : ''}`} aria-pressed={all} onClick={() => setAll(v => !v)}>
            {all ? `추천 열만 보기 (${base.length}개)` : `모든 열 보기 (${ds.columns.length}개)`}
          </button>
          <small className="muted">{all ? '모든 종류의 열이 보여요. 종류를 꼭 확인해요.' : '이 칸에 어울리는 종류의 열만 보여요.'}</small>
        </div>
      )}
      {w && <p className="warn small" role="status">{w}</p>}
    </div>
  )
}

/* ---------- 각 단계 ---------- */
function TeamStep({ game, patch, setMember }) {
  return (
    <>
      <dl className="facts wide">
        <div><dt>팀 이름</dt><dd><b>{game.team}</b></dd></div>
        <div><dt>인원수</dt><dd>{game.size}명</dd></div>
      </dl>
      <div className="field">
        <span className="lbl">팀원 (학번, 이름)</span>
        <p className="hint">반·조와 팀원은 처음 화면에서 정했어요. 학번이나 이름이 틀렸다면 여기서 고쳐요.</p>
        <div className="members">
          {game.members.map((m, i) => (
            <div key={i} className="mrow">
              <input aria-label={`팀원 ${i + 1} 학번`} value={m.id} maxLength={8} placeholder="학번" onChange={e => setMember(i, { id: e.target.value })} />
              <input aria-label={`팀원 ${i + 1} 이름`} value={m.name} maxLength={8} placeholder={`팀원 ${i + 1} 이름`} onChange={e => setMember(i, { name: e.target.value })} />
            </div>
          ))}
        </div>
      </div>
      <div className="pledge">
        <b>우리가 함께 일하는 방법</b>
        <ol>
          <li>모든 미션은 같은 화면을 보며 함께 의논하고 결정해요. 역할을 나누어 따로 일하지 않아요.</li>
          <li>키보드(코드 입력)는 미션이 바뀔 때마다 돌아가며 잡아요.</li>
          <li>발표는 팀원 모두가 한 문장 이상 말해요.</li>
        </ol>
        <label className="check"><input type="checkbox" checked={game.pledge} onChange={e => patch({ pledge: e.target.checked })} /> 우리 팀은 위 세 가지를 지키기로 했어요.</label>
      </div>
    </>
  )
}
function CareerStep({ game, patch, setMember }) {
  const fields = [...new Set(datasets.map(d => d.field))]
  return (
    <>
      <p className="hint">STEP 1. 팀원이 각자의 진로를 말하고, 서로 달라도 괜찮아요. 비슷한 분야를 찾아 "우리 팀의 진로 키워드"를 하나 정해요.</p>
      <div className="careers">
        {game.members.map((m, i) => (
          <div key={i} className="crow">
            <b>{nameOf(m, i)}</b>
            <input aria-label={`${nameOf(m, i)} 되고 싶은 직업·분야`} value={m.career} maxLength={30} placeholder="되고 싶은 직업·분야 (예: 상담교사)" onChange={e => setMember(i, { career: e.target.value })} />
            <input aria-label={`${nameOf(m, i)} 그 직업이 하는 일`} value={m.job} maxLength={50} placeholder="그 직업이 하는 일 (선택)" onChange={e => setMember(i, { job: e.target.value })} />
          </div>
        ))}
      </div>
      <Think>
        <li>우리 팀원의 진로에 공통점이 있나요? (예: 모두 "학생이 잘 배우도록 돕는 일")</li>
        <li>공통점이 없다면, 가장 가까운 분야 하나를 고르려면 무엇을 기준으로 할까요?</li>
      </Think>
      <Text label="우리 팀의 진로 키워드" value={game.keyword} max={20} placeholder="예: 교육·상담" onChange={v => patch({ keyword: v })} />
      <div className="chips" aria-label="분야 예시">
        {fields.map(f => <button key={f} onClick={() => patch({ keyword: f })}>{f}</button>)}
      </div>
      <Text label="1-1. 이 키워드를 고른 이유 (한두 문장)" rows={3} value={game.keywordWhy} onChange={v => patch({ keywordWhy: v })}
        hint="자유롭게 써도 되고, 어려우면 아래 문장 틀로 시작해요."
        frame={['우리 팀은 ', { key: 'f', ph: '분야', def: game.keyword }, ' 분야를 생각한다. ', { key: 'k', ph: '알고 싶은 것' }, '을(를) 알면 ', { key: 'w', ph: '어떤 때' }, '할 때 도움이 되기 때문이다.']} />
    </>
  )
}

function DataStep({ game, patch, go }) {
  const ds = getDs(game.dataset)
  const mine = useMemo(() => tokens([game.keyword, ...game.members.flatMap(m => [m.career, m.job])].join(' ')), [game.keyword, game.members])
  const score = d => mine.filter(t => (d.field + d.careers.join(' ')).includes(t) || d.field.includes(t)).length
  const choose = id => id !== game.dataset && patch({ dataset: id, groupBy: '', measure: '', usedCols: [], codeDesign: '' })
  // 데이터 확인 기록은 데이터마다 따로 저장한다 (다른 데이터로 바꾸면 그 데이터를 다시 확인해야 한다)
  const { quiz, viewed, ans, correct, passed } = dataCheck(game)
  const qa = { viewed, ans }
  // 항상 "가장 최근 저장값"에 합친다 (빠르게 연달아 눌러도 앞의 답이 사라지지 않게)
  const updateQA = fn => patch(g => {
    const cur = g.dataQA?.[g.dataset] ?? { viewed: false, ans: {} }
    return { dataQA: { ...g.dataQA, [g.dataset]: fn(cur) } }
  })
  const setViewed = () => updateQA(cur => ({ ...cur, viewed: true }))
  const setAns = (id, o) => updateQA(cur => ({ ...cur, ans: { ...cur.ans, [id]: o } }))
  return (
    <>
      <p className="hint">STEP 2. 진로에 맞는 데이터를 하나 골라요. 입력한 진로와 맞는 분야에는 <span className="recmark">추천</span>이 붙어요.</p>
      <div className="dgrid" role="radiogroup" aria-label="데이터 선택">
        {datasets.map(d => (
          <button key={d.id} role="radio" aria-checked={game.dataset === d.id} className={`dcard ${game.dataset === d.id ? 'on' : ''}`} onClick={() => choose(d.id)}>
            <b>{d.field}{score(d) > 0 && <span className="recmark">추천</span>}</b>
            <span>{d.desc}</span>
            <small>{d.rows.toLocaleString()}행 · {d.columns.length}열</small>
          </button>
        ))}
      </div>
      {ds && (
        <section className="detail">
          <h3>{dsName(ds)} <small className="muted">{ds.id}.csv</small></h3>
          <dl className="facts wide">
            <div><dt>관련 진로</dt><dd>{ds.careers.join(', ')}</dd></div>
            <div><dt>수업용 전처리</dt><dd>{ds.prep}</dd></div>
            <div><dt>분석 예시</dt><dd>{ds.example}</dd></div>
            {ds.pair && <div><dt>추천 짝</dt><dd>묶는 기준 <code>{ds.pair.groupBy}</code> → 계산할 열 <code>{ds.pair.measure}</code></dd></div>}
          </dl>
          <details onToggle={e => { if (e.currentTarget.open && !qa.viewed) setViewed() }}><summary>열 목록과 앞 5행 보기 <small className="muted">(꼭 열어 봐요)</small></summary>
            <ColTable ds={ds} />
            <div className="tablewrap preview">
              <table>
                <thead><tr>{ds.header.map(h => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>{ds.preview.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{v || <span className="muted">(NaN)</span>}</td>)}</tr>)}</tbody>
              </table>
            </div>
          </details>
          {ds.id === 'movies' && <p className="warn small">묶을 범주 열이 거의 없는 데이터예요. describe()와 히스토그램으로 분포를 살펴보는 질문이 어울려요.</p>}
        </section>
      )}

      {ds && (
        <section className="datacheck" aria-label="데이터 확인하기">
          <h3>데이터 확인하기 <small className="muted">(꼭 해야 다음으로 넘어가요)</small></h3>
          <p className="hint">고른 데이터를 제대로 봤는지 확인해요. 위의 <b>"열 목록과 앞 5행 보기"</b>를 열어서 살펴보고, 아래 질문 2개에 답해요.</p>
          <p className={qa.viewed ? 'ok-msg small' : 'warn small'} role="status">{qa.viewed ? '✓ 데이터를 열어 봤어요' : '○ 먼저 위의 "열 목록과 앞 5행 보기"를 열어 봐요'}</p>
          {quiz.map((q, n) => {
            const picked = qa.ans?.[q.id]
            const ok = picked === q.answer
            return (
              <div key={q.id} className="quizq">
                <b>{n + 1}. {q.text}</b>
                <div className="seg" role="radiogroup" aria-label={q.text}>
                  {q.options.map(o => (
                    <button key={o} type="button" role="radio" aria-checked={picked === o} disabled={!qa.viewed}
                      className={picked === o ? (ok ? 'on right' : 'on wrong') : ''} onClick={() => setAns(q.id, o)}><b>{o}</b></button>
                  ))}
                </div>
                {picked && (ok
                  ? <p className="ok-msg small" role="status">✓ 맞아요</p>
                  : <p className="warn small" role="status">아니에요. 다시 찾아봐요 — {q.where}</p>)}
              </div>
            )
          })}
          {passed
            ? <p className="ok-msg" role="status">데이터 확인을 마쳤어요. 이제 다음 단계로 갈 수 있어요.</p>
            : <p className="muted small">질문 2개를 모두 맞히면 다음 단계가 열려요. ({correct}/{quiz.length})</p>}
          <button className="primary" disabled={!passed} onClick={() => go('scene')}>다음: 진로 장면 떠올리기</button>
        </section>
      )}
    </>
  )
}

// 진로 장면의 문장 틀 (고민 칸마다 쓸 수 있다)
const CONCERN_FRAME = ['이 일을 하는 사람은 ', { key: 's', ph: '어떤 상황' }, '일 때 ', { key: 'c', ph: '고민' }, '을(를) 가장 자주 고민한다. 왜냐하면 ', { key: 'y', ph: '이유' }, ' 때문이다.']

// 숫자 예시: 수업에서 배운 통계와 "빈도"
function StatExamples() {
  return (
    <div className="statex">
      <b>숫자 예시 — 우리가 배운 것</b>
      <ul>
        {STATS.map(s => <li key={s.id}><b>{s.ko}</b> <span>{s.desc}</span></li>)}
        <li><b>빈도</b> <span>숫자 열 없이 그룹마다 몇 명·몇 개인지 세는 것 (예: 장르별 영화 수, 학년별 학생 수)</span></li>
      </ul>
    </div>
  )
}

// 진로 장면: 직업의 고민(①) → 비교하고 싶은 집단(②) → 확인할 숫자(③). 이 세 줄이 다음 단계에서 열을 고르는 재료가 된다.
function SceneStep({ game, patch }) {
  const parts = game.concernParts
  const setPart = (i, v) => patch(g => {
    const p = g.concernParts.map((x, j) => (j === i ? v : x))
    return { concernParts: p, concern: concernText({ concernParts: p }) }
  })
  const addPart = () => patch(g => (g.concernParts.length >= MAX_CONCERNS ? {} : { concernParts: [...g.concernParts, ''] }))
  return (
    <>
      <p className="hint">STEP 3. 이 직업의 장면에서 데이터 질문의 재료를 찾아요. 팀원이 돌아가며 말하고, 칸마다 <b>한두 줄이면 충분해요.</b> 이 세 줄이 다음 단계에서 열을 고르는 기준이 돼요.</p>

      <section className="scenebox" aria-label="① 가장 자주 고민하는 것">
        <h3>① 이 직업을 가진 사람이 가장 자주 고민하는 것은?</h3>
        <p className="hint">예) 학생이 공부를 어떻게 하게 도울까? 한 칸만 써도 되고, 고민이 더 떠오르면 칸을 하나씩 늘려요.</p>
        {parts.map((v, i) => (
          <Text key={i} label={`고민 ${i + 1}`} rows={3} value={v} onChange={t => setPart(i, t)} frame={CONCERN_FRAME} />
        ))}
        {parts.length < MAX_CONCERNS && (
          <button type="button" className="ghost" disabled={!parts[parts.length - 1].trim()} onClick={addPart}>+ 고민 더 쓰기</button>
        )}
      </section>

      <Text label="② 그 고민에서 비교하고 싶은 집단은? (두 집단 이상)" rows={2} value={game.groupsAsk} onChange={v => patch({ groupsAsk: v })}
        hint="예) 공부 시간이 짧은 학생 vs 긴 학생. 성별, 학년, 지역처럼 나누는 기준을 떠올려 봐요."
        frame={[{ key: 'a', ph: '집단 A' }, '와(과) ', { key: 'b', ph: '집단 B' }, '을(를) 비교해 보고 싶다.']} />

      <Text label="③ 그 집단들의 어떤 숫자를 보면 도움이 될까?" rows={2} value={game.numberAsk} onChange={v => patch({ numberAsk: v })}
        hint="값의 크기(평균·중앙값·최댓값·최솟값)일 수도, 몇 명·몇 개인지(개수·빈도)일 수도 있어요."
        frame={[{ key: 't', ph: '대상(예: 성적)' }, '의 ', { key: 's', ph: '평균/중앙값/최댓값/최솟값/개수' }, '을(를) 보면 도움이 될 것 같다.']} />
      <StatExamples />
    </>
  )
}

const EN_STAT = { mean: 'Mean', sum: 'Total', median: 'Median', max: 'Max', min: 'Min', count: 'Count' }

// 그래프의 가로축(x)·세로축(y)에 무엇을 둘지 고민하는 칸. 고른 것이 코드의 plt.xlabel / plt.ylabel로 이어진다.
function AxisBox({ game, patch, ds }) {
  const o = axisOptions(game, ds)
  const a = axisOf(game)
  if (game.chart === 'pie') {
    return (
      <div className="axisbox">
        <span className="lbl">⑤ 원그래프에 담을 것</span>
        <p className="hint">원그래프는 가로축·세로축이 없어요. 조각 하나는 <b>{game.groupBy || '집단'}</b>의 한 그룹이고, 조각의 크기는 <b>{o.yDefault || '개수·합계'}</b>예요. 원은 "전체 중 몫"을 보여 주니 개수·합계에 어울려요(평균에는 어울리지 않아요).</p>
      </div>
    )
  }
  const stat = isFreq(game) ? 'Count' : (EN_STAT[game.stat] ?? 'Value')
  const sugX = a.x || 'x', sugY = game.chart === 'hist' ? 'Count' : game.chart === 'scatter' ? (a.y || 'y') : (isFreq(game) ? 'Count' : `${stat} of ${game.measure || 'value'}`)
  return (
    <div className="axisbox">
      <span className="lbl">⑤ 그래프의 가로축(x)과 세로축(y)</span>
      <Think>
        <li>읽는 사람이 한눈에 비교하려면 가로축에 무엇을, 세로축에 무엇을 두는 게 좋을까요?</li>
        <li>가로축 후보와 세로축 후보를 서로 바꾸면 그래프가 어떻게 달라질까요?</li>
      </Think>
      <p className="hint">{o.note}</p>
      <div className="two-col">
        <label className="field"><span className="lbl">가로축 (x)</span>
          <select value={a.x} onChange={e => patch({ xAxis: e.target.value })}>{o.x.map(n => <option key={n} value={n}>{n}</option>)}</select></label>
        <label className="field"><span className="lbl">세로축 (y)</span>
          <select value={a.y} onChange={e => patch({ yAxis: e.target.value })}>{o.y.map(n => <option key={n} value={n}>{n}</option>)}</select></label>
      </div>
      {game.chart === 'scatter' && a.x && a.x === a.y && <p className="warn small" role="status">가로축과 세로축이 같아요. 서로 다른 숫자 열을 골라요.</p>}
      <div className="two-col">
        <label className="field"><span className="lbl">가로축 이름</span>
          <input value={game.xLabel} maxLength={40} placeholder={`예: ${sugX}`} onChange={e => patch({ xLabel: e.target.value })} /></label>
        <label className="field"><span className="lbl">세로축 이름</span>
          <input value={game.yLabel} maxLength={40} placeholder={`예: ${sugY}`} onChange={e => patch({ yLabel: e.target.value })} /></label>
      </div>
      <p className="hint">코드의 <code>plt.xlabel("…")</code>, <code>plt.ylabel("…")</code>에 그대로 쓰여요. 노트북 맨 위에서 <code>koreanize_matplotlib</code>를 실행했다면 한글로 써도 돼요(16차시처럼). 한글이 □로 깨지면 영어로 써요.</p>
    </div>
  )
}

function QuestionStep({ game, patch, go }) {
  const [fb, setFb] = useState(null)
  const ds = getDs(game.dataset)
  if (!ds) return <p className="warn">먼저 "데이터 고르기"에서 데이터를 하나 골라 주세요. <button className="link" onClick={() => go('data')}>데이터 고르기로 가기</button></p>
  const fr = frameOf(game.frame)
  const rv = reviewState(game)
  const shown = rv.same ? (fb ?? reviewQuestion(rv.last.text, game)) : null
  const review = () => {
    const r = reviewQuestion(game.question, game)
    patch(g => ({ reviews: [...g.reviews, { text: g.question, picks: picksKey(g), score: r.score, pass: r.pass, at: Date.now() }] }))
    setFb(r)
  }
  const setFrame = id => patch({ frame: id, chart: frameOf(id).chart })
  const rec = ds.pair
  return (
    <>
      {(game.groupsAsk.trim() || game.numberAsk.trim()) && (
        <div className="recap">
          <b>앞에서 떠올린 것</b>
          {game.groupsAsk.trim() && <p><span>비교하고 싶은 집단</span> {game.groupsAsk.trim()}</p>}
          {game.numberAsk.trim() && <p><span>확인하고 싶은 숫자</span> {game.numberAsk.trim()}</p>}
          <small className="muted">이 두 줄에 맞는 열과 통계를 아래에서 골라요.</small>
        </div>
      )}
      <Seg label="질문 틀" hint="STEP 4. 어떤 모양의 질문을 만들까요?" value={game.frame} onChange={setFrame}
        options={FRAMES.map(f => ({ id: f.id, ko: `${f.id}. ${f.name}`, desc: f.text }))} />
      {rec && <p className="hint">선생님 추천 짝: 묶는 기준 <code>{rec.groupBy}</code> → 계산할 열 <code>{rec.measure}</code> {rec.newCol && <>· 새 열 아이디어: {rec.newCol}</>}</p>}
      <ColPicker label="① 묶는 기준 (groupby의 열)" ds={ds} value={game.groupBy} pred={c => c.kind === 'group'} rec={recNames(ds, 'groupBy')} onPick={v => patch({ groupBy: v })}
        hint="글자·구간이 들어 있는 열. 그룹이 2~7개면 읽기 좋아요."
        warn={c => (c.unique > 7 ? `값이 ${c.unique}개나 돼요. 그래프가 복잡해질 수 있어요. (그룹이 많으면 result.head(10))` : c.kind === 'number' ? '숫자 열이라 그룹이 너무 많을 수 있어요.' : '')} />
      <Seg label="② 무엇을 계산할까요?" hint="숫자 열의 값을 통계로 요약할 수도 있고, 숫자 열 없이 그룹마다 몇 개(몇 명)인지 빈도만 셀 수도 있어요."
        value={game.measureMode} onChange={v => patch(v === 'freq' ? { measureMode: 'freq', measure: '', stat: 'count' } : { measureMode: 'column' })}
        options={[{ id: 'column', ko: '숫자 열의 통계', desc: '평균·중앙값·최댓값·최솟값·개수 중에서 골라요' }, { id: 'freq', ko: '빈도(몇 개·몇 명)', desc: '숫자 열 없이 그룹마다 개수를 세요' }]} />
      {!isFreq(game) && (
        <>
          <ColPicker label="계산할 열" ds={ds} value={game.measure} pred={c => c.kind === 'number'} rec={recNames(ds, 'measure')} onPick={v => patch({ measure: v })}
            hint="숫자 열(점수, 길이, 금액 …)만 가능해요."
            warn={c => (!c.numeric ? '숫자 열이 아니면 통계를 낼 수 없어요. info()의 Dtype을 확인해요.' : c.missing / ds.rows > 0.05 ? `결측값(NaN)이 ${c.missing}개(${pct(c.missing, ds.rows)}%)로 많은 편이에요. 결측값(NaN) 처리를 꼭 생각해요.` : '')} />
          <Seg label="③ 통계 (수업에서 배운 것)" value={game.stat} onChange={v => patch({ stat: v })}
            options={[...STATS.map(s => ({ id: s.id, ko: s.ko, desc: s.desc })), { id: 'etc', ko: '기타', desc: '위에 없는 통계를 더 비교하고 싶으면 직접 써요' }]} />
          {game.stat === 'etc' && (
            <label className="field"><span className="lbl">기타 통계 이름</span>
              <input value={game.statEtc} maxLength={20} placeholder="예: 합계, 표준편차" onChange={e => patch({ statEtc: e.target.value })} /></label>
          )}
        </>
      )}
      {isFreq(game) && <p className="hint">빈도는 그룹별 개수를 세는 것이라 통계는 "개수"로 정해져요. 코드는 <code>value_counts()</code> 또는 <code>groupby(...).count()</code>를 써요.</p>}
      <Seg label="⑤ 그래프 종류 (수업에서 배운 것)" hint={`질문 틀 ${fr.id}는 보통 ${fr.chart === 'line' ? '선' : '막대'}그래프예요. 더 비교하고 싶은 그래프가 있으면 "기타"에 써요.`}
        value={game.chart} onChange={v => patch({ chart: v })}
        options={[...CHARTS.map(c => ({ id: c.id, ko: c.ko, desc: c.desc })), { id: 'etc', ko: '기타', desc: '위에 없는 그래프를 직접 써요' }]} />
      {game.chart === 'etc' && (
        <label className="field"><span className="lbl">기타 그래프 이름</span>
          <input value={game.chartEtc} maxLength={20} placeholder="예: 상자그림(box), 가로 막대(barh)" onChange={e => patch({ chartEtc: e.target.value })} /></label>
      )}
      <AxisBox game={game} patch={patch} ds={ds} />

      <div className="field">
        <span className="lbl">1-2. 우리 팀의 탐구 질문 (필수, 한 문장)</span>
        <p className="hint">질문을 쓰고 <b>피드백을 받아요.</b> 한 번은 받아 보고, 마음에 들 때까지 고쳐서 최대 {MAX_REVIEWS}번까지 받을 수 있어요. 확인하는 기준은 이 4가지예요.</p>
        <ul className="criteria">
          <li>한 문장이에요 (10~80자)</li>
          <li>고른 열 이름이 질문에 그대로 들어 있어요</li>
          <li>무엇과 무엇을 비교하는지 보여요</li>
          <li>원인을 단정하지 않아요 ("때문에", "하면 오를까" 같은 말)</li>
        </ul>
        <div className="row start">
          <button className="ghost" disabled={!game.groupBy || !hasMeasure(game)} onClick={() => patch({ question: draftQuestion(game) })}>초안 가져오기</button>
          <small className="muted">{draftQuestion(game)}</small>
        </div>
        <textarea rows={3} aria-label="탐구 질문" value={game.question} maxLength={100}
          onChange={e => patch({ question: e.target.value })} placeholder="예: 공부 시간 구간(studytime)별로 최종 성적(G3)의 평균은 어떻게 다를까?" />
        <div className="reviewbar">
          <span className="dots" role="img" aria-label={`피드백 기회 ${rv.left}번 남음`}>
            {Array.from({ length: MAX_REVIEWS }, (_, i) => <i key={i} className={i < game.reviews.length ? 'used' : ''} />)}
          </span>
          <b>피드백 기회 {rv.left}/{MAX_REVIEWS}</b>
          <span className="spacer" />
          <button className="primary" disabled={!game.groupBy || !hasMeasure(game) || game.question.trim().length < 2 || rv.exhausted || rv.same} onClick={review}>
            {rv.same ? '피드백 받음 (고치면 다시 받을 수 있어요)' : rv.exhausted ? '기회를 모두 썼어요' : '피드백 받기'}
          </button>
        </div>
        {(!game.groupBy || !hasMeasure(game)) && <p className="warn small">먼저 위에서 묶는 기준과 계산할 것(통계 또는 빈도)을 골라요.</p>}
        {shown && (
          <div className={`review ${shown.pass ? 'pass' : ''}`} role="status">
            <b>{shown.pass ? '4가지 기준을 모두 지켰어요' : `4가지 중 ${shown.score}가지를 지켰어요`}</b>
            <ul className="checks">{shown.checks.map(c => <li key={c.label} className={c.ok ? 'ok' : 'no'}>{c.ok ? '✓' : '○'} {c.label}</li>)}</ul>
            <b>코치의 되묻기</b>
            <ul>{shown.asks.map(a => <li key={a}>{a}</li>)}</ul>
          </div>
        )}
        {game.reviews.length > 0 && (
          <details className="rlog"><summary>피드백 기록 ({game.reviews.length}회)</summary>
            <ol>{game.reviews.map((r, i) => <li key={i}><b>{r.score}/4</b> {r.text}</li>)}</ol>
          </details>
        )}
        <details className="examples">
          <summary>이런 질문은 이렇게 고쳐요</summary>
          <div className="ex bad"><b>고치기 전</b> 공부를 많이 하면 성적이 오를까?<small>원인을 단정하고 있어요.</small></div>
          <div className="ex good"><b>고친 뒤</b> 공부 시간 구간별 평균 성적은 어떻게 다를까?</div>
          <div className="ex bad"><b>고치기 전</b> 한국 학생의 성적은 어떨까?<small>데이터에 없는 대상이에요.</small></div>
          <div className="ex good"><b>고친 뒤</b> 이 데이터의 학생들은 활동 참여 여부별 성적이 어떻게 다를까?</div>
        </details>
      </div>

      {rv.accepted ? (
        <>
          <Text label="1-3. 이 질문이 진로에서 중요한 장면 (1~2문장)" rows={3} value={game.scene} onChange={v => patch({ scene: v })}
            hint="우리 진로의 어떤 장면에서 이 질문의 답이 쓰이나요? 어려우면 아래 문장 틀로 시작해요."
            frame={[{ key: 'j', ph: '직업', def: game.keyword }, '이(가) ', { key: 'd', ph: '하는 일' }, '을(를) 할 때 ', { key: 'k', ph: '알아야 할 것' }, '을(를) 알면 ', { key: 'c', ph: '할 수 있는 것' }, '. 그래서 ', { key: 'g', ph: '묶는 기준', def: game.groupBy }, '별로 ', { key: 'm', ph: '계산할 열', def: game.measure }, '을(를) 비교해 보려고 한다.']} />
          <Text label="1-4. 분석 전 예상과 이유 (한두 문장)" rows={3} value={game.expect} onChange={v => patch({ expect: v })}
            hint="분석하기 전에 결과를 예상해 보면, 분석 뒤 맞았는지 비교할 수 있어요."
            frame={[{ key: 'g', ph: '묶는 기준', def: game.groupBy }, '이(가) ', { key: 'u', ph: '어떤 쪽' }, ' ', { key: 'm', ph: '계산할 열', def: game.measure }, '이(가) ', { key: 'r', ph: '높을/낮을/클' }, ' 것이다. 이유: ', { key: 'y', ph: '이유' }, '.']} />
          <details className="optional">
            <summary>1-5. 더 알고 싶은 질문 <small className="muted">(선택 · 시간이 남으면)</small></summary>
            <Text label="같은 데이터의 다른 열로 질문을 하나 더 만들어 보세요" rows={2} value={game.extraQ} onChange={v => patch({ extraQ: v })} />
          </details>
        </>
      ) : (
        <div className="locked" role="status">
          <b>🔒 피드백을 한 번 받으면 이어서 나와요</b>
          <p>위에서 질문을 쓰고 "피드백 받기"를 눌러 보세요. 다음에 1-3 진로 장면, 1-4 분석 전 예상이 나와요.</p>
        </div>
      )}
    </>
  )
}

function UnderstandStep({ game, patch, go }) {
  const ds = getDs(game.dataset)
  if (!ds) return <p className="warn">먼저 데이터를 골라 주세요. <button className="link" onClick={() => go('data')}>데이터 고르기로 가기</button></p>
  const used = game.usedCols
  const toggle = c => patch(g => (g.usedCols.some(u => u.name === c.name)
    ? { usedCols: g.usedCols.filter(u => u.name !== c.name) }
    : g.usedCols.length >= 4 ? {} : { usedCols: [...g.usedCols, { name: c.name, meaning: c.meaning }] }))
  const fromQuestion = () => patch(g => ({
    usedCols: [g.groupBy, g.measure].filter(Boolean).map(n => g.usedCols.find(u => u.name === n) ?? { name: n, meaning: getCol(ds, n)?.meaning ?? '' }),
  }))
  const setMeaning = (name, meaning) => patch(g => ({ usedCols: g.usedCols.map(u => (u.name === name ? { ...u, meaning } : u)) }))
  const blanks = ds.columns.filter(c => c.missing > 0)
  const firstRow = ds.preview[0] ?? []
  const shown = ds.header.slice(0, 8)
  return (
    <>
      <p className="hint">노트북 미션 0~1(<code>head</code>, <code>shape</code>, <code>columns</code>, <code>info</code>)을 실행한 뒤 함께 보며 채워요. 아래 값은 미리 본 값이니 노트북 결과와 같은지 확인해요.</p>
      <dl className="facts wide">
        <div><dt>파일 이름</dt><dd><code>{ds.id}.csv</code></dd></div>
        <div><dt>행 × 열 (shape)</dt><dd>{ds.rows.toLocaleString()}행 × {ds.columns.length}열</dd></div>
        <div><dt>결측값이 있는 열</dt><dd>{blanks.length ? blanks.map(c => `${c.name} ${c.missing}개`).join(', ') : '없음'}</dd></div>
      </dl>

      <div className="rowdemo">
        <b>한 행이란? — 표의 가로 한 줄이에요</b>
        <p className="hint">아래는 이 데이터의 <b>첫 번째 행</b>이에요 (열 {ds.header.length}개 중 앞 {shown.length}개). 이 한 줄은 <b>누구(무엇) 하나</b>에 대한 정보일까요?</p>
        <div className="tablewrap">
          <table>
            <thead><tr>{shown.map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody><tr>{shown.map((h, i) => <td key={h}>{firstRow[i] || <span className="muted">(NaN)</span>}</td>)}</tr></tbody>
          </table>
        </div>
        <p className="hint">예) 학생 1명의 기록 1건 / 영화 1편 / 한 팀의 한 시즌 / 한 도시의 한 시각 측정. 이 데이터는 <b>{ds.desc}</b>예요.</p>
      </div>
      <Text label="이 데이터의 한 행은 무엇 하나를 뜻하나요?" value={game.rowMeaning} max={60} onChange={v => patch({ rowMeaning: v })}
        hint="평균·개수를 셀 때 '무엇 몇 개의 평균인지' 알아야 해서 묻는 거예요. 발표 3장에도 들어가요."
        frame={['이 데이터의 한 행은 ', { key: 'w', ph: '무엇 하나(예: 학생 1명, 영화 1편)' }, '의 기록 1건이다.']} />

      <div className="field">
        <span className="lbl">사용할 열 3~4개 ({used.length}/4)</span>
        <p className="hint">열 이름 · 뜻 · 숫자인지 글자인지. 눌러서 고르고, 뜻은 우리 말로 고쳐 써도 돼요.</p>
        <button type="button" className="ghost" onClick={fromQuestion} disabled={!game.groupBy || !hasMeasure(game)}>질문에서 고른 열 넣기</button>
        <div className="colgrid">
          {ds.columns.map(c => {
            const on = used.some(u => u.name === c.name)
            return (
              <button key={c.name} type="button" aria-pressed={on} className={`col ${on ? 'on' : ''}`} onClick={() => toggle(c)}>
                <code>{c.name}</code><span>{c.meaning}</span><small>{KIND_LABEL[c.kind]}{c.missing ? ` · 결측값 ${c.missing}` : ''}</small>
              </button>
            )
          })}
        </div>
        {used.map(u => (
          <div key={u.name} className="mrow">
            <code>{u.name}</code>
            <input aria-label={`${u.name}의 뜻`} value={u.meaning} onChange={e => setMeaning(u.name, e.target.value)} />
            <small className="muted">{getCol(ds, u.name)?.kind === 'number' ? '숫자' : '글자'}</small>
          </div>
        ))}
      </div>
    </>
  )
}

function MethodStep({ game, patch, go }) {
  const ds = getDs(game.dataset)
  if (!ds || !game.groupBy || !hasMeasure(game)) return <p className="warn">먼저 "열 고르고 질문 만들기"에서 묶는 기준과 계산할 것을 골라 주세요. <button className="link" onClick={() => go('question')}>가기</button></p>
  const s = statFor(game)
  const ch = chartFor(game)
  const mc = getCol(ds, game.measure)
  const gc = getCol(ds, game.groupBy)
  const missCol = mc ?? gc // 결측값(NaN) 처리를 살펴볼 중심 열 (빈도 모드에서는 묶는 기준)
  const checks = checkCodeDesign(game)
  return (
    <>
      <p className="lead2">우리 팀은 <b>{ds.id}</b> 데이터에서 <b>{game.groupBy}</b>(으)로 묶어 {isFreq(game) ? <b>개수(빈도)를</b> : <><b>{game.measure}</b>의 <b>{s.obj}</b></>} 비교하고, <b>{ch.short}</b>그래프로 나타냅니다.</p>
      <div className="plantable">
        <div><b>① 묶는 기준</b><span><code>{game.groupBy}</code> <small>{gc?.meaning}</small></span></div>
        <div><b>② 계산할 것</b><span>{isFreq(game) ? <code>빈도(그룹별 개수)</code> : <><code>{game.measure}</code> <small>{mc?.meaning}</small></>}</span></div>
        <div><b>③ 통계</b><span><code>{isFreq(game) ? 'value_counts() / count()' : s.fn}</code> <small>{isFreq(game) ? '그룹마다 몇 개인지' : s.desc}</small></span></div>
        <div><b>⑤ 그래프 종류</b><span><code>{ch.id === 'etc' ? ch.ko : ch.id}</code> <small>{ch.desc}</small></span></div>
        {!axisOf(game).pie && <div><b>⑤ 그래프 축</b><span>가로 <code>{axisOf(game).x || '?'}</code> · 세로 <code>{axisOf(game).y || '?'}</code> <small>{game.xLabel || game.yLabel ? `축 이름: ${game.xLabel || '?'} / ${game.yLabel || '?'}` : '축 이름은 앞 단계에서 정해요'}</small></span></div>}
      </div>
      <p className="hint">① ② ③ ⑤는 앞 단계에서 정했어요. 바꾸려면 "열 고르고 질문 만들기"로 돌아가요.</p>

      <Seg label="④ 결측값(NaN) 처리" value={game.missingMethod} onChange={v => patch({ missingMethod: v })} options={MISSING.map(m => ({ id: m.id, ko: m.ko, desc: m.guide }))}
        hint={`${isFreq(game) ? '' : `계산할 열 ${game.measure}: 결측값 ${mc.missing}개(전체의 약 ${pct(mc.missing, ds.rows)}%) · `}묶는 기준 ${game.groupBy}: 결측값 ${gc.missing}개 — 노트북 isnull().sum()으로 다시 확인해요.`} />
      <Text label="그렇게 정한 이유" rows={3} value={game.missingWhy} onChange={v => patch({ missingWhy: v })}
        hint="제거했다면 행 수 변화(처음 ___행 → ___행)도 써요. 어려우면 아래 문장 틀로 시작해요."
        frame={[{ key: 'c', ph: '열 이름', def: missCol.name }, ' 열은 결측값(NaN)이 ', { key: 'n', ph: '개수', def: String(missCol.missing) }, '개(전체의 약 ', { key: 'p', ph: '%', def: String(pct(missCol.missing, ds.rows)) }, '%)뿐이라서 ', { key: 'm', ph: '그대로 두었다/제거했다/채웠다', def: missingOf(game.missingMethod)?.ko.replace(/ \(.*\)/, '') }, '.']} />
      <Text label="⑥ 새 열 (선택)" value={game.newCol} onChange={v => patch({ newCol: v })} max={80}
        hint={ds.pair?.newCol ? `추천 아이디어: ${ds.pair.newCol}` : '기존 열을 계산해 새 열을 만들 수 있어요. 이번에 안 만들면 비워 둬요.'} />

      <Text label="⑧ 더 비교해 보고 싶은 것 (선택)" rows={3} value={game.extraCompare} onChange={v => patch({ extraCompare: v })}
        hint="더 해 보고 싶은 친구는 적어요. 같은 데이터로 다른 통계(예: 중앙값도 함께), 다른 그래프, 다른 묶는 기준으로도 비교해 볼 수 있어요. 시간이 되면 도전해요."
        frame={['또한 ', { key: 'a', ph: '다른 통계/그래프/기준' }, '으로(로) 비교해서 ', { key: 'b', ph: '알고 싶은 것' }, '을(를) 확인해 보고 싶다.']} />

      <div className="field">
        <span className="lbl">3-3. 코드 미리 설계하기 <small className="muted">(선택 · 시간이 남으면)</small></span>
        <p className="hint">안 써도 괜찮아요. 쓰면 노트북에서 코딩할 때 도움이 돼요. 아래 틀의 괄호를 우리 팀 선택으로 바꿔서 써 보세요. 열 이름은 대소문자와 띄어쓰기까지 똑같이!</p>
        {/* 16차시 노트북과 같은 모양: result를 만들고 plt.bar / plt.plot(result.index, result.values) */}
        <pre className="frame">{isFreq(game) ? `result = df["(묶는 기준)"].value_counts()\nplt.(bar 또는 plot)(result.index, result.values)` : `result = df.groupby("(묶는 기준)")["(계산할 열)"].(통계 함수)()\nplt.(bar 또는 plot)(result.index, result.values)`}</pre>
        <textarea rows={3} aria-label="코드 설계" value={game.codeDesign} onChange={e => patch({ codeDesign: e.target.value })} spellCheck={false} className="mono" />
        {game.codeDesign.trim() && <ul className="checks">{checks.map(c => <li key={c.label} className={c.ok ? 'ok' : 'no'}>{c.ok ? '✓' : '○'} {c.label}</li>)}</ul>}
      </div>
      <div className="mission">
        {/* 패들렛 "차시별 필수 도구"와 같다. 12~17차시 도구를 모두 썼는지가 평가 기준 */}
        <b>3-4. 필수 미션 (12~17차시 도구를 모두 써요)</b>
        <span>[12] 구조 확인 head·shape·columns·info()</span><span>[13] 통계 요약 describe()·평균과 중앙값·value_counts()</span><span>[14] 결측값 확인 → 제거·대체 비교 (df_removed, df_filled)</span><span>[15] 새 열 1개 + groupby의 sum·mean·count</span><span>[14·15] 함수로 만들기 (def, return)</span><span>[16] 그래프 1개</span><span>[17] 해석 2~3문장 + 한계 1문장</span>
      </div>
    </>
  )
}

function SummaryStep({ game, patch, go, deckOpen = true }) {
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState('')
  const [saveErr, setSaveErr] = useState('')
  const saveDocx = async () => {
    setSaving(true); setSaved(''); setSaveErr('')
    try { setSaved(await exportPlanDocx(game)) } catch { setSaveErr('파일을 만들지 못했어요. 잠시 뒤 다시 해 보세요.') } finally { setSaving(false) }
  }
  const text = buildPlanText(game)
  const copy = async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* 복사 불가 환경 */ } }
  const todo = PLAN_STEPS.filter(s => s.id !== 'summary' && !stepDone(s.id, game))
  return (
    <>
      <Text label="프로젝트 제목 (질문 모양이면 좋아요)" value={game.title} max={60} onChange={v => patch({ title: v })} placeholder="예: 공부 시간이 길수록 성적도 높을까?" />
      <button className="ghost" disabled={!game.question.trim()} onClick={() => patch({ title: game.question })}>질문으로 채우기</button>
      {todo.length > 0
        ? <div className="todo"><b>아직 덜 쓴 단계</b>{todo.map(s => <button key={s.id} className="link" onClick={() => go(s.id)}>{s.name}</button>)}</div>
        : <p className="ok-msg">기획안의 모든 단계를 썼어요. 아래 내용을 확인하고 {deckOpen ? '발표 만들기로 넘어가요.' : 'Word로 저장해 두어요.'}</p>}
      <pre className="docview">{text}</pre>
      <div className="row start">
        <button className="primary" disabled={saving} onClick={saveDocx}>{saving ? '만드는 중…' : '기획안 Word(.docx)로 저장'}</button>
        <button className="ghost" onClick={copy}>{copied ? '복사됨' : '글만 복사'}</button>
        {deckOpen && <button className="ghost" onClick={() => go('deck')}>발표 슬라이드 만들기</button>}
      </div>
      {/* 선생님이 아직 발표 단계를 열지 않았으면 눌러도 아무 일이 없는 버튼 대신 안내를 보여 준다 */}
      {!deckOpen && <p className="hint">🔒 발표 슬라이드는 선생님이 발표 단계를 열면 만들 수 있어요.</p>}
      {saved && <p className="ok-msg" role="status">"{saved}"를 내려받았어요.</p>}
      {saveErr && <p className="warn" role="alert">{saveErr}</p>}
      <div className="howto-docs">
        <b>구글 문서(Docs)로 이어서 쓰려면</b>
        <ol>
          <li>내려받은 .docx 파일을 구글 Drive에 올려요.</li>
          <li>파일을 더블클릭해서 열고, 위쪽의 <b>"Google Docs로 열기"</b> 또는 <b>파일 → Google Docs로 저장</b>을 눌러요.</li>
          <li>이제 구글 문서에서 팀원과 함께 고쳐 쓸 수 있어요. 4번(분석 결과)은 분석한 뒤에 채워요.</li>
        </ol>
        <small className="muted">내용은 이 기기의 브라우저에도 저장돼요. 표 모양은 구글 문서에서 조금 달라질 수 있어요.</small>
      </div>
    </>
  )
}

/* ---------- 단계별 도움 ---------- */
const STUCK = {
  team: [['인원수가 정해지지 않았어요', '일단 지금 모인 사람 수로 고르고, 나중에 바꿔도 돼요.']],
  career: [['진로가 아직 없어요', '"관심 있는 분야"로 써도 돼요. 좋아하는 과목이나 자주 찾아보는 주제를 적어 보세요.'], ['팀원 진로가 모두 달라요', '직업 이름 말고 "하는 일"을 비교해 보세요. 사람을 돕는 일, 자료를 분석하는 일처럼 공통점이 보일 수 있어요.']],
  data: [['확인 질문의 답을 모르겠어요', '"열 목록과 앞 5행 보기"를 열어서 표를 천천히 살펴봐요. 틀리면 어디서 찾을 수 있는지 알려 줘요. 몇 번이든 다시 고를 수 있어요.'], ['어떤 데이터를 골라야 할지 모르겠어요', '"추천" 표시가 붙은 분야부터 열어 보세요. 열 목록의 뜻을 읽고, 질문이 떠오르는 데이터를 고르면 돼요.'], ['고른 뒤에 바꾸고 싶어요', '다른 데이터를 누르면 바뀌어요. 이미 고른 열은 새로 골라야 해요.']],
  scene: [['고민이 떠오르지 않아요', '그 직업의 하루를 상상해 보세요. 어떤 선택을 해야 할 때 "숫자로 알면 좋겠다"는 생각이 들까요? 한 칸만 써도 충분해요.']],
  question: [['어떤 열을 골라야 할지 모르겠어요', '선생님 추천 짝부터 시작해 보세요. 열의 뜻을 읽고, 앞 단계에서 떠올린 고민을 풀어 줄 열(묶는 기준)과 숫자를 찾으면 돼요.'], ['질문이 너무 넓어요', '"무엇으로 묶고, 어떤 숫자를 비교할지" 한 쌍으로 줄여요.'], ['피드백에서 ○가 있어요', '○는 고치면 좋은 점이에요. 고른 열 이름이 질문 문장에 그대로 들어갔는지 보고, 고친 뒤 다시 피드백을 받아도 돼요.']],
  understand: [['"한 행"이 무슨 뜻이에요?', '표에서 가로로 한 줄을 "행"이라고 해요. 위에 보여 준 첫 번째 행을 보고, 그 한 줄이 학생 1명인지 영화 1편인지 어떤 한 번의 측정인지 말해 보세요.'], ['열 뜻이 어려워요', '데이터 고르기 단계의 "열 목록" 뜻을 읽어 보세요. 우리 말로 쉽게 바꿔 써도 돼요.'], ['어떤 열을 골라야 해요?', '질문에서 쓴 열(묶는 기준, 계산할 열)은 꼭 넣고, 그 밖에 질문과 관련 있어 보이는 열을 1~2개 더 골라요. "질문에서 고른 열 넣기" 버튼이 도와줘요.']],
  method: [['결측값(NaN) 처리를 무엇으로 해야 할지 모르겠어요', '결측값(NaN)이 5% 이하이고 계산할 열이 아니면 "그대로 두기"가 무난해요. 확신이 없으면 이유를 솔직하게 쓰면 돼요.'], ['코드 설계 점검이 계속 ○예요', '틀의 괄호를 우리가 고른 열 이름·함수 이름으로 바꿔 썼는지 확인해요. 따옴표 안에 열 이름이 정확히 들어가야 해요.']],
  summary: [['빠진 단계가 있어요', '위의 "아직 덜 쓴 단계"를 눌러 이동해요.']],
}

const RIGHT = { team: TeamStep, career: CareerStep, data: DataStep, scene: SceneStep, question: QuestionStep, understand: UnderstandStep, method: MethodStep, summary: SummaryStep }

// 단계마다 접어 둔 예시. 열어 보고 "이런 느낌으로 쓰는구나"를 잡는 용도라서, 그대로 베끼지 않게 안내한다.
function ExampleBox({ id }) {
  if (id === 'team') return null
  if (id === 'summary') {
    return (
      <details className="example">
        <summary>{EXAMPLE_TITLE} — 완성된 기획안 전체</summary>
        <p className="hint">처음부터 끝까지 이렇게 이어져요. 그대로 베끼지 말고 우리 팀의 진로와 데이터로 써요.</p>
        {EXAMPLE_ORDER.map(([name, key]) => (
          <div key={key} className="exblock">
            <b>{name}</b>
            <dl>{EXAMPLE_STEPS[key].map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          </div>
        ))}
      </details>
    )
  }
  const items = EXAMPLE_STEPS[id]
  if (!items) return null
  return (
    <details className="example">
      <summary>{EXAMPLE_TITLE}</summary>
      <p className="hint">이런 느낌으로 써요. 그대로 베끼지 말고 우리 팀 이야기로 바꿔 써요.</p>
      <dl>{items.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
    </details>
  )
}

export default function Plan(props) {
  const { game, go: goTab } = props
  const [id, setId] = useState(PLAN_STEPS.find(s => !stepDone(s.id, game))?.id ?? 'summary')
  const idx = PLAN_STEPS.findIndex(s => s.id === id)
  const Step = RIGHT[id]
  const done = PLAN_STEPS.filter(s => stepDone(s.id, game)).length
  // 단계 안에서 다른 단계나 발표로 이동할 때 쓰는 go
  // 데이터 확인(필수)을 마치기 전에는 그 뒤 단계로 갈 수 없다. 안쪽 링크로도 우회하지 못하게 여기서 막는다.
  const dataIdx = PLAN_STEPS.findIndex(s => s.id === 'data')
  const dataOk = stepDone('data', game)
  const isLocked = i => i > dataIdx && !dataOk
  const go = target => {
    if (target === 'deck') return goTab('deck')
    const ti = PLAN_STEPS.findIndex(s => s.id === target)
    return setId(isLocked(ti) ? 'data' : target)
  }
  return (
    <div className="plan">
      <nav className="steps" aria-label="기획 단계">
        <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={PLAN_STEPS.length} aria-valuenow={done} aria-label="기획 진행률"><span style={{ width: `${(done / PLAN_STEPS.length) * 100}%` }} /></div>
        <ol>
          {PLAN_STEPS.map((s, i) => (
            <li key={s.id}>
              <button className={`${s.id === id ? 'cur' : ''} ${stepDone(s.id, game) ? 'done' : ''} ${isLocked(i) ? 'locked' : ''}`} aria-current={s.id === id ? 'step' : undefined}
                disabled={isLocked(i)} title={isLocked(i) ? '먼저 "데이터 고르기"에서 데이터를 확인해요' : undefined} onClick={() => setId(s.id)}>
                <span className="dot">{stepDone(s.id, game) ? '✓' : isLocked(i) ? '🔒' : i + 1}</span>
                <span><b>{s.name}</b>{s.doc && <small>기획안 {s.doc}</small>}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <section className="stage">
        <header><small>{idx + 1} / {PLAN_STEPS.length}</small><h2>{PLAN_STEPS[idx].name}</h2></header>
        <ExampleBox id={id} />
        <Step {...props} go={go} />
        <Stuck items={STUCK[id]} />
        <div className="row pager">
          <button className="ghost" disabled={idx === 0} onClick={() => setId(PLAN_STEPS[idx - 1].id)}>← 이전</button>
          {idx < PLAN_STEPS.length - 1 && (
            <button className="primary" disabled={isLocked(idx + 1)} title={isLocked(idx + 1) ? '데이터 확인을 마쳐야 넘어가요' : undefined} onClick={() => setId(PLAN_STEPS[idx + 1].id)}>다음 →</button>
          )}
        </div>
      </section>

    </div>
  )
}
