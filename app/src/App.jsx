import { useState } from 'react'
import { useGame } from './store.js'
import Gate from './Gate.jsx'
import Plan from './Plan.jsx'
import Code from './Code.jsx'
import Deck from './Deck.jsx'
import Practice from './Practice.jsx'
import CoachDock from './CoachDock.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import { HowTo } from './Guide.jsx'
import { SITE_NAME } from './data/meta.js'
import { PLAN_STEPS, stepDone } from './doc.js'
import { phaseOf } from './classSettings.js'
import './App.css'

const TABS = [
  ['practice', '연습', '0차시 · 저장 안 돼요'],
  ['plan', '기획', '기획안 0~3번'],
  ['code', '코드', 'Colab 준비·도움'],
  ['deck', '발표', '3분 발표 7장'],
]

// 저장 상태 (서버에 저장됐는지 학생이 볼 수 있게). 자동 저장도 되고, "저장" 버튼으로 바로 저장할 수도 있다.
const hhmm = t => new Date(t).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
const saveLabel = (state, at) => (state === 'saving' ? '저장 중…' : state === 'error' ? '저장 실패 · 인터넷을 확인하고 다시 눌러요' : at ? `저장됨 ${hhmm(at)}` : '저장됨')

export default function App() {
  const g = useGame()
  const { game } = g
  const [want, setTab] = useState('plan')
  const [showHelp, setShowHelp] = useState(false)
  const cs = g.settings // 선생님이 반마다 정한 코치 사용 여부와 수업 단계 (서버에서 주기적으로 받아 온다)
  const phase = phaseOf(cs.phase)

  if (g.loading) return <div className="gate"><p className="lead">우리 팀 기록을 불러오는 중이에요…</p></div>
  if (!g.current) return <Gate createTeam={g.createTeam} joinTeam={g.joinTeam} lastTeam={g.lastTeam} notice={g.notice} server={g.server} />

  const isOpen = id => id === 'practice' || phase.open.includes(id) // 연습 탭은 언제나 열려 있다
  const tab = isOpen(want) ? want : phase.tab // 아직 잠긴 탭이면 지금 단계의 탭을 보여 준다
  const done = PLAN_STEPS.filter(s => stepDone(s.id, game)).length
  const dock = tab === 'plan' || tab === 'code' // 발표 탭에서는 코치 바를 숨긴다
  return (
    <div className="app">
      <header className="top">
        <strong className="logo">{SITE_NAME}</strong>
        <span className="chip">{game.team}</span>
        <span className={'save ' + g.saveState} role="status">{saveLabel(g.saveState, g.savedAt)}</span>
        <button className="savebtn" disabled={g.saveState === 'saving'} onClick={g.saveNow}>저장</button>
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
          const locked = !isOpen(id)
          return (
            // 탭을 누를 때 선생님 설정을 다시 확인한다 (주기적으로 묻지 않으므로). 잠긴 탭도 눌러서 확인할 수 있게 disabled로 두지 않는다
            <button key={id} className={(tab === id ? 'on' : '') + (locked ? ' locked' : '')} aria-current={tab === id ? 'page' : undefined} aria-disabled={locked} onClick={() => { g.refresh(); setTab(id) }}>
              {locked ? '🔒 ' : ''}{label}
              <small>{locked ? '아직 잠겨 있어요 · 선생님이 열면 다시 눌러요' : id === phase.tab && cs.phase !== 'deck' ? '지금 할 일' : id === 'plan' ? `${done}/${PLAN_STEPS.length} 단계 완료` : sub}</small>
            </button>
          )
        })}
      </nav>
      <main>
        <ErrorBoundary key={tab}>
          {tab === 'practice' && <Practice go={setTab} />}
          {tab === 'plan' && <Plan {...g} game={game} go={setTab} deckOpen={phase.open.includes('deck')} />}
          {tab === 'code' && <Code game={game} setDeck={g.setDeck} patch={g.patch} />}
          {tab === 'deck' && <Deck {...g} game={game} go={setTab} />}
        </ErrorBoundary>
      </main>
      {dock && <CoachDock mode={tab} game={game} token={g.token} onOpen={g.refresh} coachOn={cs.coach} aiLeft={g.aiLeft} consumeAi={g.consumeAi} setChat={g.setChat} />}
    </div>
  )
}
