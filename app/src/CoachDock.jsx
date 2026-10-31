import { useEffect, useRef, useState } from 'react'
import { askCoach } from './api.js'
import { contextOf } from './doc.js'
import { TEAM_AI, aiTotalOf } from './store.js'

const MAX_CHARS = 800
const MAX_INPUT_PX = 96
const OPEN_KEY = 'coach-widget-open'
// 예시 질문: 이미 물어본 것은 빼고 앞에서부터 3개씩 보여 준다
const EXAMPLES = {
  plan: [
    '우리 진로와 이 데이터가 잘 맞는지 궁금해요',
    '이 데이터로 어떤 비교가 가능한지 모르겠어요',
    '진로 장면에서 고민을 어떻게 떠올릴지 모르겠어요',
    '묶는 기준을 어떤 열로 정하면 좋을지 모르겠어요',
    '내 질문이 너무 넓은지 봐 주세요',
    '그래프의 가로축과 세로축을 어떻게 정할지 모르겠어요',
    '결측값(NaN)을 어떻게 처리할지 모르겠어요',
    '예상을 어떻게 세워야 할지 모르겠어요',
  ],
  code: [
    '결과가 NaN으로 나와요',
    'groupby를 어떻게 시작할지 모르겠어요',
    '열 이름을 썼는데 KeyError가 나요',
    '결측값(NaN)을 확인하는 코드가 궁금해요',
    '그래프에 막대가 너무 많아요',
    '새 열을 만드는 방법이 궁금해요',
    '그래프 제목과 축 이름은 어떻게 붙여요?',
    '결과를 어떻게 읽어야 할지 모르겠어요',
  ],
}
const PLACEHOLDER = {
  plan: '막힌 곳을 써 보세요',
  code: '막힌 상황을 써 보세요. 오류 메시지나 내 코드를 붙여 넣어도 좋아요.',
}

const readOpen = () => { try { return localStorage.getItem(OPEN_KEY) === '1' } catch { return false } }

// 답변 속 ``` 블록을 코드 상자로 보여 준다
function Reply({ text }) {
  return text.split('```').map((part, i) =>
    i % 2 ? <pre key={i}>{part.replace(/^\w*\n/, '')}</pre> : <p key={i}>{part}</p>
  )
}

// 코인: 팀이 코치에게 물어볼 수 있는 총 횟수. 보낼 때마다 한 개씩 줄어드는 것이 눈에 보이게 한다.
function Coins({ left, spent, total }) {
  return (
    <div className="coins" role="img" aria-label={'남은 코인 ' + left + '개'}>
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={(i < left ? '' : 'empty ') + (spent === i ? 'spent' : '')} />
      ))}
      {spent !== null && <b className="minus" aria-hidden="true">−1</b>}
    </div>
  )
}

// 오른쪽 아래의 작은 채팅 상담 버튼. 누르면 작은 채팅 창이 열린다.
export default function CoachDock({ mode, game, aiLeft, consumeAi, setChat }) {
  const msgs = game.chats[mode]
  const [open, setOpen] = useState(readOpen)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [spent, setSpent] = useState(null) // 방금 쓴 코인의 자리 (잠깐 반짝)
  const [note, setNote] = useState('')
  const end = useRef(null)
  const input = useRef(null)
  const prevLeft = useRef(aiLeft)
  const noTeam = !game.team.trim()
  const low = aiLeft <= 3

  const toggle = v => {
    setOpen(v)
    try { localStorage.setItem(OPEN_KEY, v ? '1' : '0') } catch { /* 저장 불가 환경 */ }
  }

  // 코인이 줄어들면 그 자리를 잠깐 보여 주고 안내 문구를 띄운다
  useEffect(() => {
    if (aiLeft < prevLeft.current) {
      setSpent(aiLeft)
      setNote('코인 1개를 썼어요. 남은 코인 ' + aiLeft + '개')
      const t1 = setTimeout(() => setSpent(null), 1000)
      const t2 = setTimeout(() => setNote(''), 3500)
      prevLeft.current = aiLeft
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
    prevLeft.current = aiLeft
    return undefined
  }, [aiLeft])

  useEffect(() => { if (open) end.current?.scrollIntoView({ block: 'nearest' }) }, [msgs.length, busy, open])

  // 입력 칸 높이를 글 길이에 맞춘다 (최대 4줄)
  useEffect(() => {
    const el = input.current
    if (!el) return
    el.style.height = 'auto'
    const want = el.scrollHeight + 4
    el.style.height = Math.min(want, MAX_INPUT_PX) + 'px'
    el.style.overflowY = want > MAX_INPUT_PX ? 'auto' : 'hidden'
  }, [text, open])

  const send = async () => {
    const message = text.trim()
    if (!message || busy || aiLeft <= 0 || noTeam) return
    const next = [...msgs, { role: 'user', text: message }]
    setChat(mode, next)
    setText('')
    setBusy(true)
    setError('')
    try {
      const { reply, remaining } = await askCoach({ mode, team: game.team.trim(), context: contextOf(game), message })
      consumeAi(remaining) // 코인은 답이 온 뒤에 줄어든다 (실패하면 줄지 않는다)
      setChat(mode, [...next, { role: 'coach', text: reply }])
    } catch (e) {
      setError(e.message)
      setText(message) // 실패하면 쓴 글을 돌려준다
      setChat(mode, msgs)
    } finally {
      setBusy(false)
    }
  }

  const onKey = e => {
    // 한글 입력 중(조합 중)의 Enter는 보내기가 아니라 글자 확정이다
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) { e.preventDefault(); send() }
  }
  const title = mode === 'plan' ? '기획 코치' : '코드 코치'

  // 질문이 끝나면(마지막이 코치의 답일 때) 아직 안 물어본 예시 질문을 3개 다시 보여 준다
  const asked = new Set(msgs.filter(m => m.role === 'user').map(m => m.text))
  const suggestions = EXAMPLES[mode].filter(e => !asked.has(e)).slice(0, 3)
  const lastIsCoach = msgs.length === 0 || msgs[msgs.length - 1].role === 'coach'
  const showChips = aiLeft > 0 && !busy && lastIsCoach && suggestions.length > 0

  return (
    <div className="cw">
      {open && (
        <section className="cw-panel" role="dialog" aria-label={title}>
          <header className="cw-head">
            <b>{title}</b>
            <span className="spacer" />
            <button type="button" className="cw-x" aria-label="채팅 닫기" onClick={() => toggle(false)}>×</button>
          </header>

          <div className={'cw-coins' + (low ? ' low' : '')}>
            <div className="cw-coinrow">
              <b>우리 팀 코인 {aiLeft}/{aiTotalOf(game)}</b>
              <Coins left={aiLeft} spent={spent} total={aiTotalOf(game)} />
            </div>
            <p>
              {aiLeft <= 0
                ? '우리 팀 코인을 모두 썼어요. 더 필요하면 선생님께 말씀드려요.'
                : '코치는 팀당 ' + TEAM_AI + '번만 물어볼 수 있어요. 한 번 보낼 때마다 코인 1개가 줄고, 다시 채워지지 않아요.' + (low ? ' 꼭 필요할 때 쓰세요!' : '')}
            </p>
            {note && <p className="cw-note" role="status">{note}</p>}
          </div>

          <div className="cw-log log" aria-live="polite">
            <p className="cw-sys">완성 코드나 대신 써 주는 건 하지 않아요. 되묻기와 단서로 도와요. 대화는 선생님이 볼 수 있어요.</p>
            {msgs.length === 0 && <p className="muted empty">아직 대화가 없어요.</p>}
            {msgs.map((m, i) => (
              <div key={i} className={'msg ' + m.role}>
                <small>{m.role === 'user' ? '나' : '코치'}</small>
                {m.role === 'user' ? <p>{m.text}</p> : <Reply text={m.text} />}
              </div>
            ))}
            {busy && <div className="msg coach"><small>코치</small><p className="muted">생각 중…</p></div>}
            <div ref={end} />
          </div>

          {showChips && (
            <div className="cw-suggest">
              <small className="muted">{msgs.length === 0 ? '이런 걸 물어볼 수 있어요 (눌러서 고쳐 보내요)' : '이어서 물어볼 만한 질문'}</small>
              <div className="chips cw-chips" aria-label="질문 예시">
                {suggestions.map(e => (
                  <button key={e} type="button" onClick={() => { setText(e); input.current?.focus() }}>{e}</button>
                ))}
              </div>
            </div>
          )}
          {error && <p className="warn small cw-err" role="alert">{error}</p>}

          <div className="cw-input">
            <textarea ref={input} rows={1} maxLength={MAX_CHARS} value={text} aria-label={title + '에게 보낼 글'}
              placeholder={aiLeft <= 0 ? '우리 팀 코인을 모두 썼어요' : PLACEHOLDER[mode]} disabled={aiLeft <= 0}
              onChange={e => setText(e.target.value)} onKeyDown={onKey} />
            <button type="button" className="primary" onClick={send} disabled={busy || !text.trim() || aiLeft <= 0 || noTeam}>보내기</button>
          </div>
          <small className="muted cw-foot">보내면 코인 1개가 줄어요 · Enter 보내기 · Shift+Enter 줄바꿈</small>
        </section>
      )}

      <button type="button" className="cw-fab" aria-label={title + ' 채팅 ' + (open ? '닫기' : '열기') + ', 남은 코인 ' + aiLeft + '개'} aria-expanded={open} onClick={() => toggle(!open)}>
        <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
        </svg>
        <span className={'cw-badge' + (low ? ' low' : '')}>{aiLeft}</span>
      </button>
    </div>
  )
}
