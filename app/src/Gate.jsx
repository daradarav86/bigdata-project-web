import { useState } from 'react'
import { HowTo } from './Guide.jsx'
import { MAX_MEMBERS } from './store.js'
import { Seg } from './ui.jsx'
import { SITE_NAME } from './data/meta.js'

// 맨 앞 화면: 팀 만들기 / 팀으로 들어가기
export default function Gate({ createTeam, joinTeam, teamNames }) {
  const [mode, setMode] = useState(teamNames.length ? 'join' : 'create')
  const [name, setName] = useState('')
  const [pass, setPass] = useState('')
  const [pass2, setPass2] = useState('')
  const [size, setSize] = useState(4)
  const [members, setMembers] = useState(Array.from({ length: MAX_MEMBERS }, () => ({ id: '', name: '' })))
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const setM = (i, p) => setMembers(ms => ms.map((m, j) => (j === i ? { ...m, ...p } : m)))
  const run = async fn => {
    setErr(''); setBusy(true)
    try { const r = await fn(); if (!r.ok) setErr(r.error) } catch { setErr('처리하지 못했어요. 다시 시도해 주세요.') } finally { setBusy(false) }
  }
  const create = () => {
    if (pass !== pass2) return setErr('비밀번호 확인이 달라요.')
    run(() => createTeam({ name, pass, size, members: members.slice(0, size) }))
  }

  return (
    <div className="gate">
      <h1>{SITE_NAME}</h1>
      <p className="lead">데이터 프로젝트를 하다 막혔을 때, 답이 아니라 <b>다음 한 걸음</b>을 찾도록 돕는 곳이에요. 먼저 우리 팀부터 만들어요.</p>
      <details className="gate-how"><summary>이 사이트는 이렇게 써요</summary><HowTo /></details>

      <div className="seg gate-tabs" role="tablist" aria-label="팀 선택">
        <button role="tab" aria-selected={mode === 'create'} className={mode === 'create' ? 'on' : ''} onClick={() => { setMode('create'); setErr('') }}><b>새 팀 만들기</b><small>처음 시작해요</small></button>
        <button role="tab" aria-selected={mode === 'join'} className={mode === 'join' ? 'on' : ''} onClick={() => { setMode('join'); setErr('') }}><b>우리 팀으로 들어가기</b><small>이미 만들었어요</small></button>
      </div>

      {mode === 'create' ? (
        <form className="panel gate-form" onSubmit={e => { e.preventDefault(); create() }}>
          <label className="field"><span className="lbl">팀 이름</span>
            <input value={name} maxLength={16} placeholder="예: 1-3 별빛조" onChange={e => setName(e.target.value)} autoComplete="off" /></label>
          <div className="two-col">
            <label className="field"><span className="lbl">비밀번호 (4글자 이상)</span>
              <input type="password" value={pass} onChange={e => setPass(e.target.value)} autoComplete="new-password" /></label>
            <label className="field"><span className="lbl">비밀번호 확인</span>
              <input type="password" value={pass2} onChange={e => setPass2(e.target.value)} autoComplete="new-password" /></label>
          </div>
          <p className="hint">비밀번호는 우리 팀만 알고 있어요. 잊으면 선생님께 말씀드려요. 학교 계정 비밀번호는 쓰지 마세요.</p>
          <Seg label="인원수" value={size} onChange={setSize} options={[2, 3, 4, 5, 6].map(n => ({ id: n, ko: `${n}명` }))} />
          <div className="field">
            <span className="lbl">팀원 (학번, 이름)</span>
            <div className="members">
              {members.slice(0, size).map((m, i) => (
                <div key={i} className="mrow">
                  <input aria-label={`팀원 ${i + 1} 학번`} value={m.id} maxLength={8} placeholder="학번" inputMode="numeric" onChange={e => setM(i, { id: e.target.value })} />
                  <input aria-label={`팀원 ${i + 1} 이름`} value={m.name} maxLength={8} placeholder={`팀원 ${i + 1} 이름`} onChange={e => setM(i, { name: e.target.value })} />
                </div>
              ))}
            </div>
          </div>
          {err && <p className="warn" role="alert">{err}</p>}
          <button className="primary" disabled={busy} type="submit">팀 만들고 시작하기</button>
        </form>
      ) : (
        <form className="panel gate-form" onSubmit={e => { e.preventDefault(); run(() => joinTeam(name, pass)) }}>
          {teamNames.length > 0 && (
            <div className="field"><span className="lbl">이 기기의 팀</span>
              <div className="chips">{teamNames.map(t => <button type="button" key={t} className={name === t ? 'on' : ''} onClick={() => setName(t)}>{t}</button>)}</div></div>
          )}
          <label className="field"><span className="lbl">팀 이름</span>
            <input value={name} maxLength={16} onChange={e => setName(e.target.value)} autoComplete="off" /></label>
          <label className="field"><span className="lbl">비밀번호</span>
            <input type="password" value={pass} onChange={e => setPass(e.target.value)} autoComplete="current-password" /></label>
          {err && <p className="warn" role="alert">{err}</p>}
          <button className="primary" disabled={busy || !name.trim() || !pass} type="submit">들어가기</button>
        </form>
      )}
      <p className="muted small">지금은 이 기기의 브라우저에 저장돼요. 서버가 연결되면 다른 기기에서도 같은 팀으로 들어올 수 있어요.</p>
    </div>
  )
}
