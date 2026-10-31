import { useEffect, useRef, useState } from 'react'
import { CLASSES, GROUPS, teamKey } from './classSettings.js'

const KEY = 'data-detective-v5'
export const TEAM_AI = 10 // 코치는 팀당 총 10번 (하루 단위가 아니다)
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
  ai: { used: 0, bonus: 0 }, chats: { plan: [], code: [] }, // 코치 코인: 지금까지 쓴 횟수, 선생님이 더 준 개수 / 대화 기록
  updatedAt: 0, // 마지막으로 고친 시각 (관리자 화면에서 "언제 마지막으로 했는지" 보려고)
}

// 새로 생긴 항목이 없는 예전 기록도 열리도록 기본값을 채운다
function withDefaults(g) {
  const out = { ...START, ...g, ai: { ...START.ai, ...g.ai } }
  if (!g.concernParts && g.concern) out.concernParts = [g.concern, ''] // 예전에 한 칸으로 쓴 고민을 첫 번째 칸으로
  return out
}

export const aiTotalOf = g => TEAM_AI + (g.ai?.bonus || 0)

const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
const newSalt = () => hex(crypto.getRandomValues(new Uint8Array(8)))
async function hashPass(salt, pass) {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${pass}`)))
}
// 새 비밀번호의 salt와 hash (팀 만들기·관리자의 비밀번호 초기화에서 쓴다)
export async function makeCred(pass) {
  const salt = newSalt()
  return { salt, hash: await hashPass(salt, pass) }
}

// 프로토타입: 이 기기의 브라우저에만 저장한다. 비밀번호도 이 기기 안에서만 확인된다.
// 서버(Supabase)를 연결하면 팀·비밀번호·기록이 서버로 옮겨 가서 다른 기기에서도 들어올 수 있다.
// 팀 기록은 브라우저(localStorage)에 모아 두고, "지금 이 탭에서 들어가 있는 팀"은 탭마다 따로(sessionStorage) 기억한다.
// → 공용 컴퓨터에서 탭을 닫으면 로그아웃되고, 탭 두 개로 서로 다른 팀을 써도 섞이지 않는다.
const CUR_KEY = 'data-detective-current'
export const readTeams = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}').teams ?? {} } catch { return {} } }
export const writeTeams = teams => { try { localStorage.setItem(KEY, JSON.stringify({ teams })); return true } catch { return false } }
export { withDefaults }
const readCurrent = () => { try { return sessionStorage.getItem(CUR_KEY) ?? '' } catch { return '' } }
const load = () => ({ current: readCurrent(), teams: readTeams() })

export function useGame() {
  const [state, setState] = useState(load)
  const ref = useRef(state)
  useEffect(() => { ref.current = state })
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ teams: state.teams })) } catch { /* 저장 불가 환경(용량 초과 포함) */ }
    try { sessionStorage.setItem(CUR_KEY, state.current) } catch { /* 저장 불가 환경 */ }
  }, [state])
  // 다른 탭에서 팀 기록이 바뀌면 이 탭도 따라간다 (서로 덮어써서 기록이 사라지는 일을 줄인다)
  useEffect(() => {
    const onStorage = e => { if (e.key === KEY) setState(s => ({ ...s, teams: readTeams() })) }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const team = state.teams[state.current]
  const game = team ? withDefaults(team.game) : START

  // 현재 팀의 기록만 바꾼다
  const patch = p => setState(s => {
    const t = s.teams[s.current]
    if (!t) return s
    const cur = withDefaults(t.game)
    const next = { ...cur, ...(typeof p === 'function' ? p(cur) : p), updatedAt: Date.now() }
    return { ...s, teams: { ...s.teams, [s.current]: { ...t, game: next } } }
  })
  const setDeck = p => patch(g => ({ deck: { ...g.deck, ...p } }))
  const setSize = n => patch(g => ({ size: n, members: Array.from({ length: n }, (_, i) => g.members[i] ?? member()) }))
  const setMember = (i, p) => patch(g => ({ members: g.members.map((m, j) => (j === i ? { ...m, ...p } : m)) }))

  // 코인은 팀당 총 TEAM_AI번. 날짜로 다시 채워지지 않는다 (더 필요하면 선생님이 정한다).
  const aiTotal = aiTotalOf(game)
  const aiLeft = Math.max(0, aiTotal - game.ai.used)
  // remaining: 서버가 알려 준 남은 횟수가 있으면 그것을 따른다 (기기가 달라도 맞도록)
  const consumeAi = remaining => patch(g => ({
    ai: { ...g.ai, used: Number.isInteger(remaining) ? aiTotalOf(g) - remaining : g.ai.used + 1 },
  }))
  const setChat = (mode, msgs) => patch(g => ({ chats: { ...g.chats, [mode]: msgs.slice(-20) } }))

  // 팀 만들기: 반·조는 목록에서 고른 값이고(직접 쓰지 않는다), 비밀번호는 숫자 4~6자리(PIN)다.
  const createTeam = async ({ cls, no, pass, size, members }) => {
    if (!CLASSES.includes(cls) || !GROUPS.includes(no)) return { ok: false, error: '반과 조를 목록에서 골라 주세요.' }
    if (!isPin(pass)) return { ok: false, error: PIN_RULE }
    if (members.some(m => !m.name.trim())) return { ok: false, error: '팀원 이름을 모두 써 주세요.' }
    const n = teamKey(cls, no)
    if (ref.current.teams[n]) return { ok: false, error: `${n}은 이 기기에 이미 있어요. "우리 팀으로 들어가기"를 눌러요.` }
    const c = await makeCred(pass)
    const game0 = { ...START, team: n, cls, no, size, members: members.map(m => ({ ...member(), id: m.id.trim(), name: m.name.trim() })) }
    setState(s => ({ current: n, teams: { ...s.teams, [n]: { ...c, game: game0 } } }))
    return { ok: true }
  }
  // 들어가기: 반·조와 PIN이 맞으면 그 팀으로 연다
  const joinTeam = async (cls, no, pass) => {
    const n = teamKey(cls, no)
    const t = ref.current.teams[n]
    if (!t) return { ok: false, error: `이 기기에는 ${n}이 없어요. 처음이면 "새 팀 만들기"를 눌러요. (다른 기기에서 만든 팀은 서버를 연결한 뒤에 들어올 수 있어요.)` }
    if ((await hashPass(t.salt, pass)) !== t.hash) return { ok: false, error: '비밀번호(숫자)가 맞지 않아요.' }
    setState(s => ({ ...s, current: n }))
    return { ok: true }
  }
  const logout = () => setState(s => ({ ...s, current: '' }))
  // 이 팀의 기록을 지운다 (팀 자체도 삭제)
  const removeTeam = () => setState(s => {
    const { [s.current]: _gone, ...rest } = s.teams
    return { current: '', teams: rest }
  })

  return { game, patch, setDeck, setSize, setMember, aiLeft, aiTotal, consumeAi, setChat, current: team ? state.current : '', teamNames: Object.keys(state.teams), createTeam, joinTeam, logout, removeTeam }
}
