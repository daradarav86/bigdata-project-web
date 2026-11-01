import { useState } from 'react'
import { reviewQuestion } from './coach.js'
import { Ladder } from './Code.jsx'
import { START } from './store.js'
import { TOPICS } from './data/hints.js'

// 0차시 연습: 저장하지 않는 연습 화면. 수업용 students 데이터로 질문 → 열 고르기 → 코드 생각 순서를 한 번 해 본다.
// 피드백은 AI가 아니라 정해진 기준(기획 탭의 질문 검사와 같은 기준)으로 바로 보여 준다.
const GROUPS = [
  ['studytime', '주간 공부 시간 구간 (1~4)'],
  ['higher', '고등교육 진학 희망 (yes/no)'],
  ['internet', '집 인터넷 (yes/no)'],
  ['address', '도시 U / 농촌 R'],
]
const MEASURES = [
  ['G3', '마지막 학기 성적 (0~20)'],
  ['absences', '결석 횟수'],
]
const STATS = [
  ['mean', '평균', 'mean()'],
  ['median', '중앙값', 'median()'],
  ['count', '개수', 'count()'],
]

function Pick({ label, items, value, onChange }) {
  return (
    <div className="field">
      <b>{label}</b>
      <div className="seg">
        {items.map(([id, ko]) => (
          <button key={id} className={value === id ? 'on' : ''} onClick={() => onChange(id)}>
            <code>{id}</code><small>{ko}</small>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Practice({ go }) {
  const [g, setG] = useState('')
  const [m, setM] = useState('')
  const [s, setS] = useState('mean')
  const [q, setQ] = useState('')
  const [review, setReview] = useState(null)
  const [think, setThink] = useState(false)
  const stat = STATS.find(x => x[0] === s)
  const ready = g && m
  const practiceGame = { ...START, dataset: 'students', groupBy: g, measure: m, stat: s, chart: 'bar' }
  const groupbyTopic = TOPICS.find(t => t.id === 'groupby')

  return (
    <div className="stack practice">
      <section className="panel">
        <h2>0차시 · 사이트 연습해 보기</h2>
        <p className="lead2">수업 데이터 <code>students.csv</code>(학생 1명의 기록이 한 행)로 1차시와 2차시에 할 일을 짧게 연습해요. <b>여기에 쓴 것은 저장되지 않아요.</b></p>
      </section>

      <section className="panel">
        <h3>1. 무엇끼리 비교하고, 무엇을 계산할까?</h3>
        <Pick label="기준 열 (묶는 기준)" items={GROUPS} value={g} onChange={v => { setG(v); setReview(null) }} />
        <Pick label="사용할 열 (계산할 열)" items={MEASURES} value={m} onChange={v => { setM(v); setReview(null) }} />
        <Pick label="통계 함수" items={STATS.map(([id, ko, fn]) => [id, `${ko} · ${fn}`])} value={s} onChange={setS} />
      </section>

      <section className="panel">
        <h3>2. 탐구 질문 써 보기</h3>
        <p className="muted small">예: "○○별로 △△의 평균은 어떻게 다를까?" 고른 열 이름이 질문에 들어가야 해요.</p>
        <textarea rows={2} value={q} maxLength={120} onChange={e => { setQ(e.target.value); setReview(null) }} placeholder={ready ? `${g}별로 ${m}의 ${stat[1]}은 어떻게 다를까?` : '먼저 위에서 열을 골라요'} />
        <button className="primary" disabled={!q.trim()} onClick={() => setReview(reviewQuestion(q, { groupBy: g, measure: m }))}>피드백 보기</button>
        {review && (
          <div className="step">
            <small className="muted">연습용 피드백 · AI가 아니라 정해진 4가지 기준으로 봐요 (기획 탭의 ‘피드백 받기’와 같은 기준)</small>
            <ul className="checks">{review.checks.map(c => <li key={c.label} className={c.ok ? 'ok' : 'no'}>{c.ok ? '✓' : '○'} {c.label}</li>)}</ul>
            <ul>{review.asks.map(a => <li key={a}>{a}</li>)}</ul>
          </div>
        )}
      </section>

      <section className="panel">
        <h3>3. 이렇게 생각하고 코드를 짜요</h3>
        <p className="muted small">2차시에 코드를 쓸 때 생각하는 순서예요. 연습 데이터라서 완성 코드까지 보여 줘요. 우리 조 데이터로 할 때는 이 순서로 직접 써요.</p>
        {!ready ? <p className="muted">먼저 1번에서 기준 열과 사용할 열을 골라요.</p>
          : !think ? <button onClick={() => setThink(true)}>생각 순서 보기</button>
          : (
            <ol className="thinking">
              <li><b>무엇끼리 비교하나?</b> 기준 열 <code>{g}</code> → 그 값끼리 묶어요 → <code>df.groupby("{g}")</code></li>
              <li><b>무엇을 계산하나?</b> 사용할 열 <code>{m}</code> → 그 열만 꺼내요 → <code>["{m}"]</code></li>
              <li><b>어떤 통계로?</b> {stat[1]} → <code>.{stat[2]}</code></li>
              <li><b>한 줄로 합치면</b><pre className="frame">{`result = df.groupby("${g}")["${m}"].${stat[2]}\nprint(result)`}</pre></li>
              <li><b>그래프로 보이기</b> 그룹 비교는 막대 <pre className="frame">{`plt.bar(result.index, result.values)\nplt.title("${g}별 ${m} ${stat[1]}")\nplt.show()`}</pre></li>
              <li><b>결과 읽기</b> 가장 큰 그룹 <code>result.idxmax()</code>, 가장 작은 그룹 <code>result.idxmin()</code>, 차이 <code>result.max() - result.min()</code> → "① 사실 → ② 비교 → ③ 의미 → 한계" 순서로 해석해요.</li>
              {s !== 'count' && <li><b>잊지 말기</b> 먼저 <code>df.isnull().sum()</code>으로 <code>{m}</code>에 결측값이 있는지 보고, 제거(<code>df_removed</code>)·대체(<code>df_filled</code>)를 비교해요.</li>}
            </ol>
          )}
      </section>

      <section className="panel">
        <h3>4. 힌트 사다리 체험</h3>
        <p className="muted small">2차시 [코드] 탭의 힌트는 이렇게 한 단계씩 열려요. 시도한 것을 한 줄 적어야 다음 단계가 열려요.</p>
        <Ladder topic={groupbyTopic} game={practiceGame} />
      </section>

      <section className="panel">
        <h3>5. 기억할 것</h3>
        <ul>
          <li>쓰는 내용은 자동 저장돼요. 수업이 끝나기 전에 위쪽 <b>[저장]</b>을 누르고 ‘저장됨 시각’을 확인해요.</li>
          <li>🔒 잠긴 탭은 선생님이 열면 한 번 눌러 보세요.</li>
          <li>막히면 학습지 → 사이트 힌트 → 오류 해독기 → AI 코치(조마다 10번) 순서로 도움을 받아요.</li>
          <li>할 일은 패들렛 우리 조 칸의 ‘N차시 할 일’ 게시물을 따라 해요.</li>
        </ul>
        <button className="primary" onClick={() => go('plan')}>1차시: 기획 탭으로 가기</button>
      </section>
    </div>
  )
}
