import { useEffect, useRef, useState } from 'react'

const KEY = 'data-detective-v5'
export const DAILY_AI = 10
export const MAX_MEMBERS = 6

const member = () => ({ id: '', name: '', career: '', job: '' })

// 기획안 v2의 항목 순서를 그대로 따른다 (0 팀 → 1 진로·질문 → 2 데이터 → 3 분석 계획 → 4 결과 → 5 발표)
export const START = {
  team: '', size: 4, members: Array.from({ length: 4 }, member), pledge: false,
  keyword: '', keywordWhy: '',
  dataset: '',
  concern: '', groupsAsk: '', numberAsk: '',
  concernParts: ['', ''], // 진로 장면 ①: 고민을 여러 칸에 (concern에는 합친 글이 들어간다)
  frame: 'A', groupBy: '', measure: '', stat: 'mean', chart: 'bar',
  measureMode: 'column', // 'column': 숫자 열의 통계 / 'freq': 그룹별 개수(빈도)
  statEtc: '', chartEtc: '', extraCompare: '',
  question: '', reviews: [], // reviews: 질문 검토 기록 (최대 5회) [{ text, picks, score, pass, at }]
  scene: '', extraQ: '', expect: '',
  title: '',
  rowMeaning: '', usedCols: [],
  missingMethod: '', missingWhy: '', newCol: '', codeDesign: '',
  deck: {}, // 발표 슬라이드 입력 (결과·해석·진로 연결·Q&A 등)
  cells: {}, // 코드 칸별로 학생이 고친 파이썬 코드 (칸 id → 코드). 없으면 기본 틀을 쓴다
  ai: { day: '', used: 0 }, chats: { plan: [], code: [] },
}

// 새로 생긴 항목이 없는 예전 기록도 열리도록 기본값을 채운다
function withDefaults(g) {
  const out = { ...START, ...g }
  if (!g.concernParts && g.concern) out.concernParts = [g.concern, ''] // 예전에 한 칸으로 쓴 고민을 첫 번째 칸으로
  return out
}

// 서버의 하루 한도(한국 시간 자정 기준)와 같은 날짜 기준을 쓴다
const today = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10)

const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
const newSalt = () => hex(crypto.getRandomValues(new Uint8Array(8)))
async function hashPass(salt, pass) {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${pass}`)))
}

// 프로토타입: 이 기기의 브라우저에만 저장한다. 비밀번호도 이 기기 안에서만 확인된다.
// 서버(Supabase)를 연결하면 팀·비밀번호·기록이 서버로 옮겨 가서 다른 기기에서도 들어올 수 있다.
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}')
    return { current: s.current ?? '', teams: s.teams ?? {} }
  } catch { return { current: '', teams: {} } }
}

export function useGame() {
  const [state, setState] = useState(load)
  const ref = useRef(state)
  useEffect(() => { ref.current = state })
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* 저장 불가 환경(용량 초과 포함) */ }
  }, [state])

  const team = state.teams[state.current]
  const game = team ? withDefaults(team.game) : START

  // 현재 팀의 기록만 바꾼다
  const patch = p => setState(s => {
    const t = s.teams[s.current]
    if (!t) return s
    const cur = withDefaults(t.game)
    const next = { ...cur, ...(typeof p === 'function' ? p(cur) : p) }
    return { ...s, teams: { ...s.teams, [s.current]: { ...t, game: next } } }
  })
  const setDeck = p => patch(g => ({ deck: { ...g.deck, ...p } }))
  const setSize = n => patch(g => ({ size: n, members: Array.from({ length: n }, (_, i) => g.members[i] ?? member()) }))
  const setMember = (i, p) => patch(g => ({ members: g.members.map((m, j) => (j === i ? { ...m, ...p } : m)) }))

  const aiLeft = game.ai.day === today() ? Math.max(0, DAILY_AI - game.ai.used) : DAILY_AI
  // remaining: 서버가 알려 준 남은 횟수가 있으면 그것을 따른다 (기기가 달라도 맞도록)
  const consumeAi = remaining => patch(g => {
    const used = Number.isInteger(remaining) ? DAILY_AI - remaining : (g.ai.day === today() ? g.ai.used : 0) + 1
    return { ai: { day: today(), used } }
  })
  const setChat = (mode, msgs) => patch(g => ({ chats: { ...g.chats, [mode]: msgs.slice(-20) } }))

  // 팀 만들기: { name, pass, size, members } → { ok, error }
  const createTeam = async ({ name, pass, size, members }) => {
    const n = name.trim()
    if (n.length < 2) return { ok: false, error: '팀 이름은 2글자 이상으로 써 주세요.' }
    if (pass.length < 4) return { ok: false, error: '비밀번호는 4글자 이상으로 써 주세요.' }
    if (members.some(m => !m.name.trim())) return { ok: false, error: '팀원 이름을 모두 써 주세요.' }
    if (ref.current.teams[n]) return { ok: false, error: '이 기기에 같은 이름의 팀이 이미 있어요. 다른 이름을 쓰거나 "들어가기"를 눌러요.' }
    const salt = newSalt()
    const hash = await hashPass(salt, pass)
    const game0 = { ...START, team: n, size, members: members.map(m => ({ ...member(), id: m.id.trim(), name: m.name.trim() })) }
    setState(s => ({ current: n, teams: { ...s.teams, [n]: { salt, hash, game: game0 } } }))
    return { ok: true }
  }
  // 들어가기: 이름과 비밀번호가 맞으면 그 팀으로 연다
  const joinTeam = async (name, pass) => {
    const t = ref.current.teams[name.trim()]
    if (!t) return { ok: false, error: '이 기기에는 그 이름의 팀이 없어요. 다른 기기에서 만든 팀은 서버를 연결한 뒤에 들어올 수 있어요.' }
    if ((await hashPass(t.salt, pass)) !== t.hash) return { ok: false, error: '비밀번호가 맞지 않아요.' }
    setState(s => ({ ...s, current: name.trim() }))
    return { ok: true }
  }
  const logout = () => setState(s => ({ ...s, current: '' }))
  // 이 팀의 기록을 지운다 (팀 자체도 삭제)
  const removeTeam = () => setState(s => {
    const { [s.current]: _gone, ...rest } = s.teams
    return { current: '', teams: rest }
  })

  return { game, patch, setDeck, setSize, setMember, aiLeft, consumeAi, setChat, current: state.current, teamNames: Object.keys(state.teams), createTeam, joinTeam, logout, removeTeam }
}
