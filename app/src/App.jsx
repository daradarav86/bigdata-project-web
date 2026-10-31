import { useState } from 'react'
import { useGame } from './store.js'
import Gate from './Gate.jsx'
import Plan from './Plan.jsx'
import Code from './Code.jsx'
import Deck from './Deck.jsx'
import CoachDock from './CoachDock.jsx'
import { usePython } from './py/usePython.js'
import ErrorBoundary from './ErrorBoundary.jsx'
import { HowTo } from './Guide.jsx'
import { SITE_NAME } from './data/meta.js'
import { PLAN_STEPS, stepDone } from './doc.js'
import './App.css'

const TABS = [
  ['plan', '기획', '기획안 0~3번'],
  ['code', '코드', '파이썬 실행'],
  ['deck', '발표', '3분 발표 7장'],
]

export default function App() {
  const g = useGame()
  const { game } = g
  const [tab, setTab] = useState('plan')
  const [showHelp, setShowHelp] = useState(false)
  const py = usePython() // 탭을 옮겨도 파이썬 변수가 유지되도록 여기서 한 번만 만든다
  const [out, setOut] = useState({}) // 코드 칸별 실행 결과

  if (!g.current) return <Gate createTeam={g.createTeam} joinTeam={g.joinTeam} teamNames={g.teamNames} />

  const done = PLAN_STEPS.filter(s => stepDone(s.id, game)).length
  const dock = tab === 'plan' || tab === 'code' // 발표 탭에서는 코치 바를 숨긴다
  return (
    <div className="app">
      <header className="top">
        <strong className="logo">{SITE_NAME}</strong>
        <span className="chip">{game.team}</span>
        <button className="link small" aria-expanded={showHelp} onClick={() => setShowHelp(v => !v)}>사용법</button>
        <button className="link small" onClick={g.logout}>팀 나가기</button>
        <button className="link small" onClick={() => { if (confirm(`"${game.team}" 팀의 기록을 모두 지울까요? 되돌릴 수 없어요.`)) g.removeTeam() }}>팀 지우기</button>
      </header>
      {showHelp && (
        <section className="panel helpbox">
          <HowTo />
          <button className="primary" onClick={() => setShowHelp(false)}>닫기</button>
        </section>
      )}
      <nav className="tabs" aria-label="메뉴">
        {TABS.map(([id, label, sub]) => (
          <button key={id} className={tab === id ? 'on' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
            {label}<small>{id === 'plan' ? `${done}/${PLAN_STEPS.length} 단계 완료` : sub}</small>
          </button>
        ))}
      </nav>
      <main>
        <ErrorBoundary key={tab}>
          {tab === 'plan' && <Plan {...g} game={game} go={setTab} />}
          {tab === 'code' && <Code {...g} game={game} py={py} out={out} setOut={setOut} />}
          {tab === 'deck' && <Deck {...g} game={game} go={setTab} />}
        </ErrorBoundary>
      </main>
      {dock && <CoachDock mode={tab} game={game} aiLeft={g.aiLeft} consumeAi={g.consumeAi} setChat={g.setChat} />}
    </div>
  )
}
