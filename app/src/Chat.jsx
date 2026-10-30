import { useRef, useState } from 'react'
import { askCoach } from './api.js'

const MAX_CHARS = 800

// 답변 속 ``` 블록을 코드 상자로 보여 준다
function Reply({ text }) {
  return text.split('```').map((part, i) =>
    i % 2 ? <pre key={i}>{part.replace(/^\w*\n/, '')}</pre> : <p key={i}>{part}</p>
  )
}

export default function Chat({ mode, game, context, aiLeft, consumeAi, setChat, placeholder, examples = [] }) {
  const msgs = game.chats[mode]
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const end = useRef(null)
  const noTeam = !game.team.trim()

  const send = async () => {
    const message = text.trim()
    if (!message || busy || aiLeft <= 0 || noTeam) return
    const next = [...msgs, { role: 'user', text: message }]
    setChat(mode, next)
    setText('')
    setBusy(true)
    setError('')
    try {
      const { reply, remaining } = await askCoach({ mode, team: game.team.trim(), context, message })
      consumeAi(remaining)
      setChat(mode, [...next, { role: 'coach', text: reply }])
    } catch (e) {
      setError(e.message)
      setText(message) // 실패하면 쓴 글을 돌려준다
      setChat(mode, msgs)
    } finally {
      setBusy(false)
      setTimeout(() => end.current?.scrollIntoView({ block: 'nearest' }), 50)
    }
  }

  return (
    <div className="chat">
      <div className="chat-head">
        <b>{mode === 'plan' ? '기획 코치' : '코드 코치'}</b>
        <span className="muted">오늘 남은 질문 {aiLeft}회</span>
      </div>
      <p className="muted small">
        {mode === 'plan'
          ? '막힌 곳을 자유롭게 써 보세요. 코치는 대신 써 주지 않고, 더 나은 생각으로 이끌어요.'
          : '막힌 상황, 오류 메시지, 내가 쓴 코드를 붙여 넣어도 좋아요. 코치는 완성 코드 대신 단서·도구 이름·빈칸 뼈대까지 도와요.'}
      </p>
      <div className="cando">
        <span className="yes">해 줘요 · 되묻기, 단서, 도구 이름, 빈칸 뼈대</span>
        <span className="no">안 해 줘요 · 완성 코드, 대신 써 주기</span>
      </div>
      <p className="notice">대화 내용은 선생님이 학습 지원을 위해 볼 수 있어요.</p>
      {noTeam && <p className="warn small">먼저 "우리 팀" 단계에서 조 이름을 적어 주세요.</p>}
      <div className="log" aria-live="polite">
        {msgs.length === 0 && <p className="muted empty">아직 대화가 없어요.</p>}
        {msgs.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <small>{m.role === 'user' ? '나' : '코치'}</small>
            {m.role === 'user' ? <p>{m.text}</p> : <Reply text={m.text} />}
          </div>
        ))}
        {busy && <div className="msg coach"><small>코치</small><p className="muted">생각 중…</p></div>}
        <div ref={end} />
      </div>
      {error && <p className="warn" role="alert">{error}</p>}
      {msgs.length === 0 && examples.length > 0 && (
        <div className="chips" aria-label="질문 예시">
          {examples.map(e => <button key={e} onClick={() => setText(e)}>{e}</button>)}
        </div>
      )}
      <textarea
        rows={mode === 'code' ? 5 : 3} maxLength={MAX_CHARS} value={text}
        aria-label={mode === 'plan' ? '기획 코치에게 보낼 글' : '코드 코치에게 보낼 글'}
        placeholder={placeholder} onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send() }}
      />
      <div className="row">
        <small className="muted">{text.length}/{MAX_CHARS} · Ctrl+Enter로 보내기</small>
        <button className="primary" onClick={send} disabled={busy || !text.trim() || aiLeft <= 0 || noTeam}>
          {aiLeft <= 0 ? '오늘 질문 소진' : '코치에게 묻기'}
        </button>
      </div>
    </div>
  )
}
