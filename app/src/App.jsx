import { useState } from 'react'
import { useGame } from './store.js'
import Gate from './Gate.jsx'
import Plan from './Plan.jsx'
import Code from './Code.jsx'
import Deck from './Deck.jsx'
import CoachDock from './CoachDock.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import { HowTo } from './Guide.jsx'
import { SITE_NAME } from './data/meta.js'
import { PLAN_STEPS, stepDone } from './doc.js'
import { phaseOf } from './classSettings.js'
import './App.css'

const TABS = [
  ['plan', '기획', '기획안 0~3번'],
  ['code', '코드', 'Colab 준비·도움'],
  ['deck', '발표', '3분 발표 7장'],
]

// 저장 상태 (서버에 저장됐는지 학생이 볼 수 있게)
const SAVE_LABEL = { saved: '저장됨', saving: '저장 중…', error: '저장 실패 · 다시 시도 중' }

export default function App() {
  const g = useGame()
  const { game } = g
  const [want, setTab] = useState('plan')
  const [showHelp, setShowHelp] = useState(false)
  const cs = g.settings // 선생님이 반마다 정한 코치 사용 여부와 수업 단계 (서버에서 주기적으로 받아 온다)
  const phase = phaseOf(cs.phase)

  if (g.loading) return <div className="gate"><p className="lead">우리 팀 기록을 불러오는 중이에요…</p></div>
  if (!g.current) return <Gate createTeam={g.createTeam} joinTeam={g.joinTeam} lastTeam={g.lastTeam} notice={g.notice} server={g.server} />

  const tab = phase.open.includes(want) ? want : phase.tab // 아직 잠긴 탭이면 지금 단계의 탭을 보여 준다
  const done = PLAN_STEPS.filter(s => stepDone(s.id, game)).length
  const dock = tab === 'plan' || tab === 'code' // 발표 탭에서는 코치 바를 숨긴다
  return (
    <div className="app">
      <header className="top">
        <strong className="logo">{SITE_NAME}</strong>
        <span className="chip">{game.team}</span>
        <span className={'save ' + g.saveState} role="status">{SAVE_LABEL[g.saveState]}</span>
        <button className="link small" aria-expanded={showHelp} onClick={() => setShowHelp(v => !v)}>사용법</button>
        <button className="link small" onClick={g.logout}>팀 나가기</button>
        <button className="link small" onClick={() => {
          // 팀원 모두의 기록이 사라지므로 비밀번호를 다시 넣어야 지워진다
          const pin = prompt(`"${game.team}" 팀의 기록을 모두 지울까요? 팀원 모두의 기록이 사라지고 되돌릴 수 없어요.\n지우려면 우리 팀 비밀번호(숫자)를 입력해요.`)
          if (pin) g.removeTeam(pin.trim()).then(r => { if (!r.ok) alert(r.error) })
        }}>팀 지우기</button>
      </header>
      {showHelp && (
        <section className="panel helpbox">
          <HowTo />
          <button className="primary" onClick={() => setShowHelp(false)}>닫기</button>
        </section>
      )}
      <nav className="tabs" aria-label="메뉴">
        {TABS.map(([id, label, sub]) => {
          const locked = !phase.open.includes(id)
          return (
            <button key={id} className={(tab === id ? 'on' : '') + (locked ? ' locked' : '')} aria-current={tab === id ? 'page' : undefined} disabled={locked} onClick={() => setTab(id)}>
              {locked ? '🔒 ' : ''}{label}
              <small>{locked ? '선생님이 아직 열지 않았어요' : id === phase.tab && cs.phase !== 'deck' ? '지금 할 일' : id === 'plan' ? `${done}/${PLAN_STEPS.length} 단계 완료` : sub}</small>
            </button>
          )
        })}
      </nav>
      <main>
        <ErrorBoundary key={tab}>
          {tab === 'plan' && <Plan {...g} game={game} go={setTab} deckOpen={phase.open.includes('deck')} />}
          {tab === 'code' && <Code game={game} />}
          {tab === 'deck' && <Deck {...g} game={game} go={setTab} />}
        </ErrorBoundary>
      </main>
      {dock && <CoachDock mode={tab} game={game} token={g.token} coachOn={cs.coach} aiLeft={g.aiLeft} consumeAi={g.consumeAi} setChat={g.setChat} />}
    </div>
  )
}
