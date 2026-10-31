import { useEffect, useRef, useState } from 'react'
import { askCoach } from './api.js'
import { contextOf } from './doc.js'

const MAX_CHARS = 800
const MAX_INPUT_PX = 112
const OPEN_KEY = 'coach-dock-open'
const EXAMPLES = {
  plan: ['이 데이터로 어떤 비교가 가능한지 모르겠어요', '내 질문이 너무 넓은지 봐 주세요', '예상을 어떻게 세워야 할지 모르겠어요'],
  code: ['결과가 NaN으로 나와요', 'groupby를 어떻게 시작할지 모르겠어요', '그래프에 막대가 너무 많아요'],
}
const PLACEHOLDER = {
  plan: '막힌 곳을 써 보세요. 예: 간호사가 꿈인데 이 데이터로 뭘 비교할 수 있을지 모르겠어요',
  code: '막힌 상황을 써 보세요. 오류 메시지나 내 코드를 붙여 넣어도 좋아요.',
}

// 기본은 접힌 상태(입력줄만 보임). 학생이 펼쳐 두면 다음에도 펼쳐 둔다.
const readOpen = () => { try { return localStorage.getItem(OPEN_KEY) === '1' } catch { return false } }

// 답변 속 ``` 블록을 코드 상자로 보여 준다
function Reply({ text }) {
  return text.split('```').map((part, i) =>
    i % 2 ? <pre key={i}>{part.replace(/^\w*\n/, '')}</pre> : <p key={i}>{part}</p>
  )
}

// 화면 아래에 계속 떠 있는 채팅 바. 입력 칸은 늘 보이고, 대화 기록은 접고 펼 수 있다.
export default function CoachDock({ mode, game, aiLeft, consumeAi, setChat }) {
  const msgs = game.chats[mode]
  const [open, setOpen] = useState(readOpen)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const end = useRef(null)
  const input = useRef(null)
  const box = useRef(null)
  const noTeam = !game.team.trim()

  const toggle = v => {
    setOpen(v)
    try { localStorage.setItem(OPEN_KEY, v ? '1' : '0') } catch { /* 저장 불가 환경 */ }
  }

  // 바의 높이를 CSS 변수로 알려 줘서, 페이지 아래 여백이 바에 가리지 않게 맞춘다
  useEffect(() => {
    const el = box.current
    if (!el) return undefined
    const set = () => document.documentElement.style.setProperty('--dock-h', el.offsetHeight + 'px')
    set()
    const ro = new ResizeObserver(set)
    ro.observe(el)
    return () => { ro.disconnect(); document.documentElement.style.removeProperty('--dock-h') }
  }, [])

  // 새 글이 오면 맨 아래로
  useEffect(() => { if (open) end.current?.scrollIntoView({ block: 'nearest' }) }, [msgs.length, busy, open])

  // 입력 칸 높이를 글 길이에 맞춘다 (최대 4줄). 테두리 몫(4px)을 더해야 불필요한 스크롤 막대가 안 생긴다.
  useEffect(() => {
    const el = input.current
    if (!el) return
    el.style.height = 'auto'
    const want = el.scrollHeight + 4
    el.style.height = Math.min(want, MAX_INPUT_PX) + 'px'
    el.style.overflowY = want > MAX_INPUT_PX ? 'auto' : 'hidden'
  }, [text])

  const send = async () => {
    const message = text.trim()
    if (!message || busy || aiLeft <= 0 || noTeam) return
    const next = [...msgs, { role: 'user', text: message }]
    setChat(mode, next)
    setText('')
    setBusy(true)
    setError('')
    if (!open) toggle(true) // 보낸 뒤 답이 보이도록 기록을 연다
    try {
      const { reply, remaining } = await askCoach({ mode, team: game.team.trim(), context: contextOf(game), message })
      consumeAi(remaining)
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

  return (
    <section ref={box} className={'dock ' + (open ? 'open' : '')} aria-label={title}>
      <div className="dock-head">
        <b>{title}</b>
        <span className="muted small">오늘 남은 질문 {aiLeft}회</span>
        <span className="spacer" />
        <button type="button" className="link small" aria-expanded={open} onClick={() => toggle(!open)}>
          {open ? '대화 접기 ▾' : '대화 보기' + (msgs.length ? ' (' + Math.ceil(msgs.length / 2) + ')' : '') + ' ▴'}
        </button>
      </div>

      {open && (
        <div className="dock-body">
          <div className="cando">
            <span className="yes">해 줘요 · 되묻기, 단서, 도구 이름, 빈칸 뼈대</span>
            <span className="no">안 해 줘요 · 완성 코드, 대신 써 주기</span>
            <span className="note">대화는 선생님이 학습 지원을 위해 볼 수 있어요.</span>
          </div>
          <div className="log" aria-live="polite">
            {msgs.length === 0 && <p className="muted empty">아직 대화가 없어요. 막힌 곳을 아래에 써서 보내 보세요.</p>}
            {msgs.map((m, i) => (
              <div key={i} className={'msg ' + m.role}>
                <small>{m.role === 'user' ? '나' : '코치'}</small>
                {m.role === 'user' ? <p>{m.text}</p> : <Reply text={m.text} />}
              </div>
            ))}
            {busy && <div className="msg coach"><small>코치</small><p className="muted">생각 중…</p></div>}
            <div ref={end} />
          </div>
        </div>
      )}

      {msgs.length === 0 && (
        <div className="chips" aria-label="질문 예시">
          {EXAMPLES[mode].map(e => (
            <button key={e} type="button" onClick={() => { setText(e); input.current?.focus() }}>{e}</button>
          ))}
        </div>
      )}
      {error && <p className="warn small" role="alert">{error}</p>}
      {noTeam && <p className="warn small">먼저 팀을 만들어 주세요.</p>}

      <div className="dock-input">
        <textarea ref={input} rows={1} maxLength={MAX_CHARS} value={text} aria-label={title + '에게 보낼 글'}
          placeholder={PLACEHOLDER[mode]} onChange={e => setText(e.target.value)} onKeyDown={onKey} />
        <button type="button" className="primary" onClick={send} disabled={busy || !text.trim() || aiLeft <= 0 || noTeam}>
          {aiLeft <= 0 ? '소진' : '보내기'}
        </button>
      </div>
      <small className="muted dock-hint">Enter로 보내기 · Shift+Enter로 줄바꿈 · {text.length}/{MAX_CHARS}</small>
    </section>
  )
}
