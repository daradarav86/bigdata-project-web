import { useState } from 'react'
import { HowTo } from './Guide.jsx'
import { MAX_MEMBERS, isPin } from './store.js'
import { CLASSES, GROUPS, teamKey } from './classSettings.js'
import { Seg } from './ui.jsx'
import { SITE_NAME } from './data/meta.js'

const digits = s => s.replace(/\D/g, '').slice(0, 6)

// 반·조는 목록에서 고른다 (직접 쓰지 않으니 오타로 다른 팀이 생기지 않는다)
function TeamPick({ cls, no, setCls, setNo }) {
  return (
    <div className="two-col">
      <label className="field"><span className="lbl">반</span>
        <select value={cls} onChange={e => setCls(e.target.value)}>
          <option value="">반 선택</option>
          {CLASSES.map(c => <option key={c} value={c}>{c}반</option>)}
        </select></label>
      <label className="field"><span className="lbl">조</span>
        <select value={no || ''} onChange={e => setNo(Number(e.target.value))}>
          <option value="">조 선택</option>
          {GROUPS.map(n => <option key={n} value={n}>{n}조</option>)}
        </select></label>
    </div>
  )
}

// 맨 앞 화면: 팀 만들기 / 팀으로 들어가기
export default function Gate({ createTeam, joinTeam, teamNames }) {
  const [mode, setMode] = useState(teamNames.length ? 'join' : 'create')
  const [cls, setCls] = useState('')
  const [no, setNo] = useState(0)
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
  const picked = !!cls && !!no
  const create = () => {
    if (pass !== pass2) return setErr('비밀번호 확인이 달라요.')
    run(() => createTeam({ cls, no, pass, size, members: members.slice(0, size) }))
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
          <TeamPick cls={cls} no={no} setCls={setCls} setNo={setNo} />
          {picked && <p className="hint">우리 팀 이름은 <b>{teamKey(cls, no)}</b>(이)에요. 반과 조 번호가 맞는지 확인해요.</p>}
          <div className="two-col">
            <label className="field"><span className="lbl">비밀번호 (숫자 4~6자리)</span>
              <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={pass} onChange={e => setPass(digits(e.target.value))} autoComplete="new-password" placeholder="예: 4821" /></label>
            <label className="field"><span className="lbl">비밀번호 확인</span>
              <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={pass2} onChange={e => setPass2(digits(e.target.value))} autoComplete="new-password" /></label>
          </div>
          <p className="hint">핀번호처럼 숫자만 써요. 우리 팀만 알고 있어요. 잊으면 선생님께 말씀드려요. 학교 계정이나 다른 사이트 비밀번호는 쓰지 마세요.</p>
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
          <button className="primary" disabled={busy || !picked || !isPin(pass)} type="submit">팀 만들고 시작하기</button>
        </form>
      ) : (
        <form className="panel gate-form" onSubmit={e => { e.preventDefault(); run(() => joinTeam(cls, no, pass)) }}>
          <TeamPick cls={cls} no={no} setCls={setCls} setNo={setNo} />
          <label className="field"><span className="lbl">비밀번호 (숫자)</span>
            <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={pass} onChange={e => setPass(digits(e.target.value))} autoComplete="current-password" /></label>
          {err && <p className="warn" role="alert">{err}</p>}
          <button className="primary" disabled={busy || !picked || !isPin(pass)} type="submit">들어가기</button>
        </form>
      )}
      <p className="muted small">지금은 이 기기의 브라우저에 저장돼요. 서버가 연결되면 다른 기기에서도 같은 팀으로 들어올 수 있어요.</p>
    </div>
  )
}
