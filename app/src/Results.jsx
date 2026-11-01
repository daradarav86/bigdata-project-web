import { useState } from 'react'
import { LIMITS } from './data/meta.js'
import { missingOf, statFor, isFreq, measureName } from './doc.js'
import { FIELD, shrink, resultDone, RESULT_KEYS } from './deckFields.js'
import { Text } from './ui.jsx'
import { josa } from './josa.js'

// 2차시: 기획안 4번(분석 결과)을 노트북 결과를 보며 적는 곳.
// 발표 탭과 같은 칸(game.deck)을 쓰므로, 여기 적은 것이 3차시 발표 슬라이드 4~6장에 그대로 들어간다.
export default function Results({ game, setDeck }) {
  const d = game.deck
  const [err, setErr] = useState('')
  const field = (k, rows) => (
    <Text key={k} label={FIELD[k][0]} hint={FIELD[k][1]} value={d[k] ?? ''} rows={rows} max={rows ? 2000 : 80} onChange={v => setDeck({ [k]: v })} />
  )
  const load = async file => {
    setErr('')
    try { setDeck({ graph: await shrink(file) }) } catch (e) { setErr(e.message) }
  }
  const onPaste = e => {
    const f = [...(e.clipboardData?.files ?? [])].find(x => x.type.startsWith('image/'))
    if (f) { e.preventDefault(); load(f) }
  }
  const mm = missingOf(game.missingMethod)
  const s = statFor(game)
  const done = resultDone(d)

  return (
    <section className="panel results" onPaste={onPaste} aria-label="분석 결과 정리">
      <h3>분석 결과 정리 <small className="muted">기획안 4번 · 노트북 결과를 보며 적어요 ({done}/{RESULT_KEYS.length})</small></h3>
      <p className="hint">여기 적은 결과는 발표 슬라이드(4~6장)에 그대로 들어가요. 숫자는 노트북 결과에서 그대로 옮겨 적어요.</p>

      <h4>4-1. 결측값(NaN) 처리</h4>
      <p className="small">{mm ? <>기획에서 <b>{mm.ko}</b>로 정했어요. {game.missingWhy}</> : '아직 기획의 "분석 계획"에서 정하지 않았어요.'} 노트북에서 해 보니 다르면 "기획" 탭에서 고쳐요.</p>

      {field('resultTable', 5)}

      <h4>4-3. 결과 읽기 (숫자로)</h4>
      <div className="two-col">{field('hi')}{field('hiVal')}</div>
      <div className="two-col">{field('lo')}{field('loVal')}</div>
      <div className="two-col">{field('diffPts')}{field('diffX')}</div>
      {field('expectCheck', 2)}

      <h4>4-4. 그래프</h4>
      <p className="hint">Colab 그래프를 오른쪽 클릭 → 이미지 복사 → 이 칸 근처에서 붙여넣기(Ctrl+V). 또는 파일을 골라요. 제목·축 이름이 있는지 확인해요.</p>
      <input type="file" accept="image/*" aria-label="그래프 이미지 파일" onChange={e => e.target.files[0] && load(e.target.files[0])} />
      {err && <p className="warn small" role="alert">{err}</p>}
      {d.graph && <div className="graphprev"><img src={d.graph} alt="우리 팀 결과 그래프" /><button className="ghost" onClick={() => setDeck({ graph: '' })}>그래프 지우기</button></div>}

      <h4>4-5. 해석 (위 숫자로 자동으로 만들어져요)</h4>
      <ul className="small">
        <li>① {game.groupBy}별 {isFreq(game) ? '개수(빈도)는' : `${game.measure}의 ${s.topic}`} {d.hi || '___'}{josa(d.hi, '이(가)')} 가장 높고({d.hiVal || '___'}), {d.lo || '___'}{josa(d.lo, '이(가)')} 가장 낮았다({d.loVal || '___'}).</li>
        <li>② 두 집단의 차이는 {d.diffPts ? `${d.diffPts}점으로` : '___(으)로'}, {d.diffX || '___'}배 정도였다.</li>
        <li>③ 이는 {game.groupBy}{josa(game.groupBy, '와(과)')} {measureName(game)}{josa(measureName(game), '이(가)')} 함께 움직이는 경향이 있음을 보여 준다.</li>
      </ul>

      <h4>4-6. 한계</h4>
      {field('limit')}
      <div className="chips" aria-label="한계 후보">
        {/* "…없다." → "…없기": "다만 …없기 때문에"로 이어진다 */}
        {LIMITS.map(l => <button key={l} type="button" onClick={() => setDeck({ limit: l.replace(/다\.$/, '기') })}>{l}</button>)}
      </div>

      <h4>4-7. 우리 진로와 연결</h4>
      {field('use')}
      {field('careful')}
      {field('next')}
    </section>
  )
}
