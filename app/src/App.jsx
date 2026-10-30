import { useState } from 'react'
import { useGame } from './store.js'
import Gate from './Gate.jsx'
import Plan from './Plan.jsx'
import Code from './Code.jsx'
import Deck from './Deck.jsx'
import { HowTo } from './Guide.jsx'
import { SITE_NAME } from './data/meta.js'
import { PLAN_STEPS, stepDone } from './doc.js'
import './App.css'

const TABS = [
  ['plan', '기획', '기획안 0~3번'],
  ['code', '코드', '막힐 때 도움'],
  ['deck', '발표', '3분 발표 7장'],
]

export default function App() {
  const g = useGame()
  const { game } = g
  const [tab, setTab] = useState('plan')
  const [showHelp, setShowHelp] = useState(false)

  if (!g.current) return <Gate createTeam={g.createTeam} joinTeam={g.joinTeam} teamNames={g.teamNames} />

  const done = PLAN_STEPS.filter(s => stepDone(s.id, game)).length
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
        {tab === 'plan' && <Plan {...g} game={game} go={setTab} />}
        {tab === 'code' && <Code {...g} game={game} />}
        {tab === 'deck' && <Deck {...g} game={game} go={setTab} />}
      </main>
    </div>
  )
}
