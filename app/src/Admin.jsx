import { useEffect, useState } from 'react'
import { readTeams, writeTeams, withDefaults, makeCred, aiTotalOf, isPin, PIN_RULE } from './store.js'
import { PLAN_STEPS, stepDone, buildPlanText, reviewState, measureName } from './doc.js'
import { getDs } from './data/meta.js'
import { CLASSES, PHASES, readSettings, settingsOf, saveSettings } from './classSettings.js'
import './App.css' // 색 변수(:root)를 학생 화면과 같이 쓴다
import './admin.css'

// 선생님용 관리자 화면 (/admindara). 학생 화면과 따로 열리는 별도 페이지다.
// 지금은 이 브라우저(localStorage)에 저장된 팀만 보인다. 서버(Supabase)를 연결하면 같은 화면에서 모든 반의 팀이 보이도록
// 아래 "팀 자료 읽기·쓰기" 부분만 서버 호출로 바꾸면 된다.

// ---- 팀 자료 읽기·쓰기 (지금은 localStorage) ----
const loadAll = () => Object.entries(readTeams()).map(([name, t]) => ({ name, salt: t.salt, hash: t.hash, game: withDefaults(t.game) }))
const saveTeam = (name, fn) => {
  const teams = readTeams()
  if (!teams[name]) return
  teams[name] = fn(teams[name])
  writeTeams(teams)
}

const ago = ms => {
  if (!ms) return '기록 없음'
  const m = Math.round((Date.now() - ms) / 60000)
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  const h = Math.round(m / 60)
  return h < 24 ? `${h}시간 전` : `${Math.round(h / 24)}일 전`
}

// 한 팀을 표 한 줄로 요약
function summarize({ name, game: g }) {
  const done = PLAN_STEPS.map(s => stepDone(s.id, g))
  const cur = PLAN_STEPS.find((_, i) => !done[i])
  const total = aiTotalOf(g)
  return {
    name, g, cls: g.cls || '미분류',
    n: done.filter(Boolean).length, done,
    cur: cur ? cur.name : '모두 완료',
    dataset: g.dataset || '-',
    coinsUsed: g.ai.used, coinsTotal: total, coinsLeft: Math.max(0, total - g.ai.used),
    reviews: g.reviews.length,
    updatedAt: g.updatedAt,
    members: g.members.map(m => m.name).filter(Boolean).join(', '),
  }
}

function Stat({ label, value, sub }) {
  return <div className="ad-stat"><small>{label}</small><b>{value}</b>{sub && <span>{sub}</span>}</div>
}

// 반 전체에 코인을 더 준다
function giveClassCoins(cls, n) {
  const teams = readTeams()
  let count = 0
  Object.keys(teams).forEach(k => {
    const g = withDefaults(teams[k].game)
    if (g.cls !== cls) return
    teams[k] = { ...teams[k], game: { ...g, ai: { ...g.ai, bonus: (g.ai.bonus || 0) + n } } }
    count++
  })
  writeTeams(teams)
  return count
}

// 수업 중에 쓰는 반별 설정: 코치(API)를 막을지 풀지, 지금 어느 단계(기획안 / 코드 / 발표)인지, 반 전체 코인
function ClassPanel({ rows, onChange, filter, setFilter }) {
  const all = readSettings()
  const [coins, setCoins] = useState(3)
  const [msg, setMsg] = useState('')
  const set = (cls, p) => { saveSettings(cls, p); onChange() }
  const setAllClasses = p => { CLASSES.forEach(c => saveSettings(c, p)); onChange() }
  const give = cls => {
    const n = Math.max(1, Math.min(50, Number(coins) || 0))
    const c = giveClassCoins(cls, n)
    setMsg(c ? `${cls}반 ${c}팀에 코인 ${n}개씩 줬어요.` : `${cls}반에는 팀이 아직 없어요.`); onChange()
  }
  return (
    <section className="ad-classes" aria-label="반별 수업 설정">
      <div className="ad-chead">
        <h2>반별 수업 설정</h2>
        <div className="ad-row">
          <span className="ad-note">모든 반 한꺼번에:</span>
          {PHASES.map(p => <button key={p.id} type="button" className="ad-btn" onClick={() => setAllClasses({ phase: p.id })}>{p.ko}</button>)}
          <button type="button" className="ad-btn" onClick={() => setAllClasses({ coach: true })}>코치 모두 열기</button>
          <button type="button" className="ad-btn" onClick={() => setAllClasses({ coach: false })}>코치 모두 닫기</button>
        </div>
      </div>
      <label className="ad-coinbar">반 전체에 줄 코인 <input type="number" min="1" max="50" value={coins} onChange={e => setCoins(e.target.value)} />개씩</label>
      <div className="ad-cgrid">
        {CLASSES.map(cls => {
          const s = settingsOf(all, cls)
          const n = rows.filter(r => r.cls === cls).length
          return (
            <div key={cls} className={'ad-ccard' + (filter === cls ? ' on' : '')}>
              <div className="ad-ctitle">
                <button type="button" className="ad-link" aria-pressed={filter === cls} onClick={() => setFilter(filter === cls ? '' : cls)}>{cls}반</button>
                <small>{n}팀</small>
              </div>
              <div className="ad-seg" role="group" aria-label={`${cls}반 수업 단계`}>
                {PHASES.map(p => <button key={p.id} type="button" aria-pressed={s.phase === p.id} className={s.phase === p.id ? 'on' : ''} title={p.desc} onClick={() => set(cls, { phase: p.id })}>{p.ko}</button>)}
              </div>
              <button type="button" className={'ad-toggle' + (s.coach ? ' on' : '')} role="switch" aria-checked={s.coach} onClick={() => set(cls, { coach: !s.coach })}>
                <i aria-hidden="true" />{s.coach ? '코치(API) 열림' : '코치(API) 닫힘'}
              </button>
              <button type="button" className="ad-btn" onClick={() => give(cls)} disabled={!n}>반 전체 코인 +{Math.max(1, Math.min(50, Number(coins) || 0))}</button>
            </div>
          )
        })}
      </div>
      <p className="ad-note">{msg || '단계를 바꾸면 그 반 학생 화면에서 잠긴 탭이 열리고 닫혀요. 코치를 닫으면 코인은 줄지 않고, 보낼 수 없을 뿐이에요.'}</p>
    </section>
  )
}

function Detail({ row, onChange, onClose }) {
  const { g } = row
  const [bonus, setBonus] = useState(5)
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState('')
  const [tab, setTab] = useState('plan')
  const ds = getDs(g.dataset)
  let planText = ''
  try { planText = buildPlanText(g) } catch { planText = '(기획안을 만들 수 없는 상태예요)' }
  const rs = reviewState(g)

  const addCoins = () => {
    const n = Math.max(1, Math.min(50, Number(bonus) || 0))
    saveTeam(row.name, t => ({ ...t, game: { ...t.game, ai: { ...withDefaults(t.game).ai, bonus: (withDefaults(t.game).ai.bonus || 0) + n } } }))
    setMsg(`코인 ${n}개를 더 줬어요.`); onChange()
  }
  const resetPw = async () => {
    if (!isPin(pw)) { setMsg(PIN_RULE); return }
    const cred = await makeCred(pw)
    saveTeam(row.name, t => ({ ...t, ...cred }))
    setPw(''); setMsg('비밀번호를 바꿨어요. 학생에게 새 비밀번호를 알려 주세요.'); onChange()
  }
  const remove = () => {
    if (!confirm(`"${row.name}" 팀의 기록을 모두 지울까요? 되돌릴 수 없어요.`)) return
    const teams = readTeams(); delete teams[row.name]; writeTeams(teams); onClose(); onChange()
  }
  const copy = async () => { try { await navigator.clipboard.writeText(planText); setMsg('기획안을 복사했어요.') } catch { setMsg('복사할 수 없는 환경이에요.') } }

  return (
    <section className="ad-detail" aria-label={`${row.name} 팀 자세히`}>
      <div className="ad-dhead">
        <h2>{row.name} <small>{row.members}</small></h2>
        <button type="button" className="ad-btn" onClick={onClose}>닫기</button>
      </div>
      <div className="ad-steps" aria-label="단계별 진행">
        {PLAN_STEPS.map((s, i) => <span key={s.id} className={row.done[i] ? 'ok' : ''}>{row.done[i] ? '✓ ' : ''}{s.name}</span>)}
      </div>
      <div className="ad-tabs" role="tablist">
        {[['plan', '기획안'], ['review', `질문 피드백 (${row.reviews})`], ['chat', '코치 대화'], ['manage', '관리']].map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === 'plan' && (
        <div>
          <p className="ad-note">데이터: {ds ? `${ds.id} (${ds.rows}행 × ${ds.columns.length}열)` : '아직 고르지 않음'} · 계산할 것: {measureName(g) || '-'}</p>
          <pre className="ad-pre">{planText}</pre>
          <button type="button" className="ad-btn" onClick={copy}>기획안 복사</button>
        </div>
      )}

      {tab === 'review' && (
        <div>
          <p className="ad-note">{rs.got ? '지금 고른 열로 피드백을 받았어요.' : '아직 피드백을 받지 않았어요.'} 남은 횟수 {rs.left}번 (최대 5번)</p>
          {g.reviews.length === 0 && <p className="ad-empty">검토 기록이 없어요.</p>}
          <ol className="ad-list">
            {g.reviews.map((r, i) => (
              <li key={i}><b>{i + 1}번째 · 기준 {r.score}/4 충족</b><p>{r.text}</p><small>고른 열: {String(r.picks).replace('|', ' / ')}</small></li>
            ))}
          </ol>
        </div>
      )}

      {tab === 'chat' && (
        <div className="ad-chats">
          {['plan', 'code'].map(mode => (
            <div key={mode}>
              <h3>{mode === 'plan' ? '기획 코치' : '코드 코치'}</h3>
              {g.chats[mode].length === 0 && <p className="ad-empty">대화가 없어요.</p>}
              {g.chats[mode].map((m, i) => <p key={i} className={`ad-msg ${m.role}`}><b>{m.role === 'user' ? '학생' : '코치'}</b> {m.text}</p>)}
            </div>
          ))}
          <p className="ad-note">최근 20개 메시지만 남아 있어요. 전체 기록은 서버를 연결하면 모아서 볼 수 있어요.</p>
        </div>
      )}

      {tab === 'manage' && (
        <div className="ad-manage">
          <div className="ad-box">
            <h3>코인</h3>
            <p>쓴 코인 {row.coinsUsed} / 전체 {row.coinsTotal} (남음 {row.coinsLeft})</p>
            <div className="ad-row">
              <label>더 줄 개수 <input type="number" min="1" max="50" value={bonus} onChange={e => setBonus(e.target.value)} /></label>
              <button type="button" className="ad-btn primary" onClick={addCoins}>코인 주기</button>
            </div>
          </div>
          <div className="ad-box">
            <h3>비밀번호 초기화</h3>
            <p>팀이 비밀번호를 잊었을 때 새 비밀번호로 바꿔요.</p>
            <div className="ad-row">
              <label>새 비밀번호 (숫자 4~6자리) <input type="text" inputMode="numeric" maxLength={6} value={pw} autoComplete="off" onChange={e => setPw(e.target.value.replace(/\D/g, ''))} /></label>
              <button type="button" className="ad-btn primary" onClick={resetPw}>바꾸기</button>
            </div>
          </div>
          <div className="ad-box danger">
            <h3>팀 지우기</h3>
            <p>이 팀의 기록이 모두 사라지고 되돌릴 수 없어요.</p>
            <button type="button" className="ad-btn danger" onClick={remove}>팀 지우기</button>
          </div>
        </div>
      )}
      {msg && <p className="ad-toast" role="status">{msg}</p>}
    </section>
  )
}

export default function Admin() {
  const [, setTick] = useState(0)
  const [pick, setPick] = useState('')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('name')
  const [clsFilter, setClsFilter] = useState('')
  const refresh = () => setTick(t => t + 1)

  // 학생 화면에서 기록이 바뀌면(같은 브라우저) 따라서 새로 읽는다
  useEffect(() => {
    const on = () => refresh()
    window.addEventListener('storage', on)
    const id = setInterval(refresh, 15000)
    return () => { window.removeEventListener('storage', on); clearInterval(id) }
  }, [])
  useEffect(() => { document.title = '관리자 · 원묵고 빅데이터원리탐구 도우미' }, [])

  // 렌더링할 때마다 새로 읽는다 (refresh로 tick이 바뀌면 다시 그려진다). 팀이 수십 개여도 가볍다.
  const rows = loadAll().map(summarize)
  const shown = rows
    .filter(r => !clsFilter || r.cls === clsFilter)
    .filter(r => !q.trim() || (r.name + r.members).includes(q.trim()))
    .sort((a, b) => (sort === 'progress' ? a.n - b.n : sort === 'recent' ? b.updatedAt - a.updatedAt : sort === 'coins' ? a.coinsLeft - b.coinsLeft : a.name.localeCompare(b.name, 'ko')))
  const sel = rows.find(r => r.name === pick)

  const avg = rows.length ? Math.round((rows.reduce((s, r) => s + r.n, 0) / rows.length / PLAN_STEPS.length) * 100) : 0
  const finished = rows.filter(r => r.n === PLAN_STEPS.length).length
  const dry = rows.filter(r => r.coinsLeft === 0).length

  const csv = () => {
    const head = ['팀', '팀원', '완료 단계', '현재 단계', '데이터', '쓴 코인', '전체 코인', '질문 검토', '마지막 수정']
    const lines = rows.map(r => [r.name, r.members, `${r.n}/${PLAN_STEPS.length}`, r.cur, r.dataset, r.coinsUsed, r.coinsTotal, r.reviews, r.updatedAt ? new Date(r.updatedAt).toLocaleString('ko-KR') : ''])
    const esc = v => `"${String(v).replaceAll('"', '""')}"`
    const blob = new Blob(['﻿' + [head, ...lines].map(l => l.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'teams-progress.csv'; a.click(); URL.revokeObjectURL(a.href)
  }

  return (
    <div className="ad">
      <header className="ad-top">
        <h1>관리자 <small>원묵고 빅데이터원리탐구 도우미</small></h1>
        <a href="/" className="ad-btn">학생 화면으로</a>
      </header>

      <p className="ad-banner" role="note">
        <b>데모 모드</b> — 지금은 이 브라우저에 저장된 팀만 보여요. 서버(Supabase)를 연결하면 모든 반의 팀이 여기에 모이고, 로그인한 선생님만 이 화면을 볼 수 있어요.
      </p>

      <div className="ad-stats">
        <Stat label="팀 수" value={rows.length} />
        <Stat label="평균 진행률" value={`${avg}%`} />
        <Stat label="기획 완료" value={`${finished}팀`} />
        <Stat label="코인 다 쓴 팀" value={`${dry}팀`} />
      </div>

      <ClassPanel rows={rows} onChange={refresh} filter={clsFilter} setFilter={setClsFilter} />

      <div className="ad-tools">
        <input type="search" aria-label="팀 이름이나 팀원 검색" placeholder="팀 이름·팀원 검색" value={q} onChange={e => setQ(e.target.value)} />
        <label>정렬
          <select value={sort} onChange={e => setSort(e.target.value)}>
            <option value="name">이름순</option>
            <option value="progress">진행 느린 순</option>
            <option value="recent">최근 수정 순</option>
            <option value="coins">코인 적게 남은 순</option>
          </select>
        </label>
        <button type="button" className="ad-btn" onClick={refresh}>새로고침</button>
        <button type="button" className="ad-btn" onClick={csv} disabled={!rows.length}>진행표 내려받기 (CSV)</button>
      </div>

      {rows.length === 0 ? (
        <p className="ad-empty big">아직 팀이 없어요. 학생이 팀을 만들면 여기에 나타나요.</p>
      ) : (
        <div className="ad-tablewrap">
          <table className="ad-table">
            <caption className="sr">팀별 진행 현황</caption>
            <thead><tr><th>팀{clsFilter && ` (${clsFilter}반만)`}</th><th>진행</th><th>지금 단계</th><th>데이터</th><th>코인</th><th>검토</th><th>마지막 수정</th></tr></thead>
            <tbody>
              {shown.map(r => (
                <tr key={r.name} className={pick === r.name ? 'on' : ''}>
                  <td><button type="button" className="ad-link" onClick={() => setPick(r.name)}>{r.name}</button><small>{r.members}</small></td>
                  <td><div className="ad-bar" role="img" aria-label={`${r.n}/${PLAN_STEPS.length} 단계`}><i style={{ width: `${(r.n / PLAN_STEPS.length) * 100}%` }} /></div><small>{r.n}/{PLAN_STEPS.length}</small></td>
                  <td>{r.cur}</td>
                  <td>{r.dataset}</td>
                  <td className={r.coinsLeft === 0 ? 'warn' : ''}>{r.coinsLeft}/{r.coinsTotal} 남음</td>
                  <td>{r.reviews}/5</td>
                  <td>{ago(r.updatedAt)}</td>
                </tr>
              ))}
              {shown.length === 0 && <tr><td colSpan="7" className="ad-empty">검색 결과가 없어요.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {sel && <Detail key={sel.name} row={sel} onChange={refresh} onClose={() => setPick('')} />}
    </div>
  )
}
