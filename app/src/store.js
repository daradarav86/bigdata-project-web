import { useCallback, useEffect, useRef, useState } from 'react'
import { CLASSES, GROUPS, DEFAULT_SETTINGS } from './classSettings.js'
import { backend, SERVER, TEAM_AI } from './backend.js'

export { TEAM_AI } // 코치는 팀당 총 10번 (하루 단위가 아니다)
export const MAX_MEMBERS = 6
// 비밀번호는 핀번호처럼 숫자 4~6자리
export const isPin = s => /^\d{4,6}$/.test(s)
export const PIN_RULE = '비밀번호는 숫자 4~6자리로 정해 주세요. (예: 4821)'

const member = () => ({ id: '', name: '', career: '', job: '' })

// 기획안 v2의 항목 순서를 그대로 따른다 (0 팀 → 1 진로·질문 → 2 데이터 → 3 분석 계획 → 4 결과 → 5 발표)
export const START = {
  team: '', cls: '', no: 0, size: 4, // team: "1-3 5조"처럼 반·조에서 만든 이름
  members: Array.from({ length: 4 }, member), pledge: false,
  keyword: '', keywordWhy: '',
  dataset: '',
  dataQA: {}, // 데이터 확인 기록: 데이터 id → { viewed: 열 목록을 열어 봤는지, ans: { 질문 id → 고른 보기 } }
  concern: '', groupsAsk: '', numberAsk: '',
  concernParts: [''], // 진로 장면: 고민은 한 칸만 필수, 더 쓰면 칸이 늘어난다 (concern에는 합친 글이 들어간다)
  frame: 'A', groupBy: '', measure: '', stat: 'mean', chart: 'bar',
  measureMode: 'column', // 'column': 숫자 열의 통계 / 'freq': 그룹별 개수(빈도)
  statEtc: '', chartEtc: '', extraCompare: '',
  xAxis: '', yAxis: '', xLabel: '', yLabel: '', // 그래프의 가로축(x)·세로축(y)에 올 것, 그래프에 쓸 영어 축 이름
  question: '', reviews: [], // reviews: 질문 검토 기록 (최대 5회) [{ text, picks, score, pass, at }]
  scene: '', extraQ: '', expect: '',
  title: '',
  rowMeaning: '', usedCols: [],
  missingMethod: '', missingWhy: '', newCol: '', codeDesign: '',
  deck: {}, // 발표 슬라이드 입력 (결과·해석·진로 연결·Q&A 등)
  ai: { used: 0, bonus: 0 }, chats: { plan: [], code: [] }, // 코치 코인(서버가 세고, 기록에는 저장하지 않는다): 쓴 횟수, 선생님이 더 준 개수 / 대화 기록
  updatedAt: 0, // 마지막으로 고친 시각 (관리자 화면에서 "언제 마지막으로 했는지" 보려고)
}

// 새로 생긴 항목이 없는 예전 기록도 열리도록 기본값을 채운다
export function withDefaults(g) {
  const out = { ...START, ...g, ai: { ...START.ai, ...g.ai } }
  if (!g.concernParts && g.concern) out.concernParts = [g.concern, ''] // 예전에 한 칸으로 쓴 고민을 첫 번째 칸으로
  return out
}

export const aiTotalOf = g => TEAM_AI + (g.ai?.bonus || 0)

// 팀 기록은 서버(없으면 이 브라우저)에 두고, 이 탭에서는 다음만 기억한다.
// - 지금 들어가 있는 팀의 토큰: 탭마다 따로(sessionStorage) → 공용 컴퓨터에서 탭을 닫으면 로그아웃된다
// - 이 기기에서 마지막으로 들어간 반·조: 입장 화면에 미리 골라 둔다 (비밀번호는 기억하지 않는다)
const TOKEN_KEY = 'data-detective-token'
const LAST_KEY = 'data-detective-last'
const SAVE_MS = 700 // 고친 뒤 이만큼 쉬면 저장한다
const SYNC_MS = 8000 // 이 간격으로 같은 팀의 다른 기기에서 고친 것과 선생님 설정을 받아 온다
const NESTED = ['deck', 'chats', 'dataQA'] // 이 항목은 안쪽 칸 단위로 저장한다 (팀원이 서로 다른 칸을 동시에 고쳐도 덮어쓰지 않게)

const readToken = () => { try { return sessionStorage.getItem(TOKEN_KEY) ?? '' } catch { return '' } }
const writeToken = t => { try { if (t) sessionStorage.setItem(TOKEN_KEY, t); else sessionStorage.removeItem(TOKEN_KEY) } catch { /* 저장 불가 환경 */ } }
const readLast = () => { try { return JSON.parse(localStorage.getItem(LAST_KEY) || 'null') } catch { return null } }
const writeLast = v => { try { localStorage.setItem(LAST_KEY, JSON.stringify(v)) } catch { /* 저장 불가 환경 */ } }

const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v)
// 바뀐 칸만 { 경로: 값 }으로 뽑는다 (코인 ai는 서버가 정하므로 뺀다)
function diff(a, b) {
  const out = {}
  for (const k of Object.keys(b)) {
    if (k === 'ai' || a[k] === b[k]) continue
    if (NESTED.includes(k) && isObj(a[k]) && isObj(b[k])) {
      for (const j of new Set([...Object.keys(a[k]), ...Object.keys(b[k])])) if (a[k][j] !== b[k][j]) out[`${k}.${j}`] = b[k][j] ?? null
    } else out[k] = b[k]
  }
  return out
}
// 서버에서 받은 기록 위에 아직 보내지 않은 내 변경을 다시 얹는다
function merge(game, patch) {
  const g = { ...game }
  for (const [k, v] of Object.entries(patch)) {
    const [a, b] = k.split('.')
    g[a] = b === undefined ? v : { ...(isObj(g[a]) ? g[a] : {}), [b]: v }
  }
  return g
}

const OUT = { token: '', game: null, ai: { used: 0, bonus: 0 }, settings: DEFAULT_SETTINGS }

export function useGame() {
  const [s, setS] = useState(() => ({ ...OUT, token: readToken() }))
  const [loading, setLoading] = useState(() => !!readToken())
  const [saveState, setSaveState] = useState('saved') // 'saved' | 'saving' | 'error'
  const [notice, setNotice] = useState('') // 입장 화면에 보여 줄 안내 (예: 다시 들어가 주세요)
  const ref = useRef(s)
  useEffect(() => { ref.current = s })
  const rev = useRef(null) // 가진 기록의 판 번호 (서버와 같으면 sync 때 기록을 다시 받지 않는다)
  const pending = useRef({}) // 아직 보내지 않은 바뀐 칸
  const sending = useRef(false) // 저장 중에는 sync를 건너뛴다 (반쯤 저장된 기록으로 화면이 되돌아가지 않게)
  const saved = useRef(0) // 저장이 끝난 횟수 (sync가 오가는 사이에 저장이 끝났으면 그 sync 결과는 낡았으므로 버린다)
  const timer = useRef(null)
  const flushRef = useRef(null) // 실패·남은 변경을 다시 보낼 때 쓴다 (flush가 자기 자신을 부르지 않게)

  const enter = useCallback((res, token) => {
    writeToken(token)
    rev.current = res.rev
    pending.current = {}
    const game = withDefaults(res.game)
    writeLast({ cls: game.cls, no: game.no })
    const next = { token, game, ai: res.ai, settings: res.settings }
    ref.current = next
    setS(next)
    setNotice('')
  }, [])
  const leave = useCallback((msg = '') => {
    clearTimeout(timer.current)
    writeToken('')
    rev.current = null
    pending.current = {}
    ref.current = OUT
    setS(OUT)
    setNotice(msg)
  }, [])

  // 바뀐 칸을 서버로 보낸다. 실패하면 잠시 뒤 다시 보낸다.
  const flush = useCallback(async () => {
    clearTimeout(timer.current)
    const token = ref.current.token
    if (!token || sending.current || !Object.keys(pending.current).length) return
    const p = pending.current
    pending.current = {}
    sending.current = true
    setSaveState('saving')
    try {
      const r = await backend.save(token, p)
      // 내 저장 하나만 더해졌으면 판 번호를 따라간다. 그 사이 다른 기기가 고쳤으면 그대로 두어 다음 sync에서 받아 온다.
      if (r.rev === rev.current + 1) rev.current = r.rev
      saved.current++
      setSaveState('saved')
    } catch (e) {
      sending.current = false
      if (e.status === 401) { leave(e.message); return }
      pending.current = { ...p, ...pending.current }
      setSaveState('error')
      timer.current = setTimeout(() => flushRef.current(), 5000)
      return
    }
    sending.current = false
    if (Object.keys(pending.current).length) timer.current = setTimeout(() => flushRef.current(), SAVE_MS)
  }, [leave])

  useEffect(() => { flushRef.current = flush }, [flush])

  // 서버의 최신 기록·코인·반 설정을 받아 온다
  const sync = useCallback(async () => {
    const token = ref.current.token
    if (!token || sending.current) return
    try {
      const before = saved.current
      const r = await backend.sync(token, rev.current)
      if (ref.current.token !== token || sending.current || saved.current !== before) return
      rev.current = r.rev
      setS(cur => {
        const next = { ...cur, ai: r.ai, settings: r.settings, game: r.game ? withDefaults(merge(r.game, pending.current)) : cur.game }
        ref.current = next
        return next
      })
    } catch (e) {
      if (e.status === 401) leave(e.message)
    }
  }, [leave])

  // 처음 열 때: 이 탭에 토큰이 있으면 그 팀 기록을 불러온다.
  // 인터넷이 잠깐 끊긴 것이면 로그아웃시키지 않고 몇 번 다시 해 본다 (토큰이 틀린 401만 바로 내보낸다).
  useEffect(() => {
    const token = readToken()
    if (!token) return undefined
    let stop = false
    const load = async () => {
      for (let i = 0; i < 4 && !stop; i++) {
        try {
          const r = await backend.sync(token, null)
          if (!stop) enter(r, token)
          return
        } catch (e) {
          if (e.status === 401) { leave(e.message); return }
          await new Promise(res => setTimeout(res, 2000))
        }
      }
      if (!stop) leave('팀 기록을 불러오지 못했어요. 인터넷 연결을 확인하고 다시 들어가 주세요.')
    }
    load().finally(() => { if (!stop) setLoading(false) })
    return () => { stop = true }
  }, [enter, leave])

  // 들어가 있는 동안: 주기적으로, 그리고 화면으로 돌아올 때 받아 온다. 화면을 떠날 때는 남은 변경을 보낸다.
  useEffect(() => {
    if (!s.token) return undefined
    const id = setInterval(sync, SYNC_MS)
    const onVis = () => { if (document.visibilityState === 'visible') sync(); else flush() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pagehide', flush)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('pagehide', flush) }
  }, [s.token, sync, flush])

  const game = s.game ? { ...s.game, ai: s.ai } : START

  // 현재 팀의 기록만 바꾼다. 화면에는 바로 반영하고, 바뀐 칸은 잠시 뒤 서버로 보낸다.
  const patch = p => {
    const cur = ref.current.game
    if (!cur) return
    const next = { ...cur, ...(typeof p === 'function' ? p({ ...cur, ai: ref.current.ai }) : p), updatedAt: Date.now() }
    delete next.ai
    Object.assign(pending.current, diff(cur, next))
    ref.current = { ...ref.current, game: next } // 같은 순간에 patch가 여러 번 불려도 앞의 것을 잃지 않게
    setS(st => ({ ...st, game: next }))
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, SAVE_MS)
  }
  const setDeck = p => patch(g => ({ deck: { ...g.deck, ...p } }))
  const setSize = n => patch(g => ({ size: n, members: Array.from({ length: n }, (_, i) => g.members[i] ?? member()) }))
  const setMember = (i, p) => patch(g => ({ members: g.members.map((m, j) => (j === i ? { ...m, ...p } : m)) }))

  // 코인은 팀당 총 TEAM_AI번 + 선생님이 더 준 개수. 쓴 횟수는 서버가 센다.
  const aiTotal = aiTotalOf(game)
  const aiLeft = Math.max(0, aiTotal - s.ai.used)
  const consumeAi = remaining => setS(st => ({
    ...st, ai: { ...st.ai, used: Number.isInteger(remaining) ? TEAM_AI + st.ai.bonus - remaining : st.ai.used + 1 },
  }))
  const setChat = (mode, msgs) => patch(g => ({ chats: { ...g.chats, [mode]: msgs.slice(-20) } }))

  const run = async fn => {
    try { await fn(); return { ok: true } } catch (e) { return { ok: false, error: e.message || '처리하지 못했어요. 다시 시도해 주세요.' } }
  }
  // 팀 만들기: 반·조는 목록에서 고른 값이고(직접 쓰지 않는다), 비밀번호는 숫자 4~6자리(PIN)다.
  const createTeam = async ({ cls, no, pass, size, members }) => {
    if (!CLASSES.includes(cls) || !GROUPS.includes(no)) return { ok: false, error: '반과 조를 목록에서 골라 주세요.' }
    if (!isPin(pass)) return { ok: false, error: PIN_RULE }
    if (members.some(m => !m.name.trim())) return { ok: false, error: '팀원 이름을 모두 써 주세요.' }
    const { ai: _ai, ...base } = START
    const game0 = { ...base, cls, no, size, members: members.map(m => ({ ...member(), id: m.id.trim(), name: m.name.trim() })), updatedAt: Date.now() }
    return run(async () => { const r = await backend.create({ cls, no, pin: pass, game: game0 }); enter(r, r.token) })
  }
  // 들어가기: 반·조와 PIN이 맞으면 그 팀으로 연다
  const joinTeam = (cls, no, pass) => run(async () => { const r = await backend.join(cls, no, pass); enter(r, r.token) })
  const logout = async () => { await flush(); leave() }
  // 이 팀의 기록을 지운다 (팀 자체도 삭제)
  const removeTeam = () => run(async () => { await backend.remove(ref.current.token); leave('팀을 지웠어요.') })

  return {
    game, patch, setDeck, setSize, setMember, aiLeft, aiTotal, consumeAi, setChat,
    current: s.game ? s.game.team : '', token: s.token, settings: s.settings, loading, saveState, notice,
    lastTeam: readLast(), server: SERVER, createTeam, joinTeam, logout, removeTeam,
  }
}
