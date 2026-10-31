import { teamKey, settingsOf, readSettings, saveSettings } from './classSettings.js'

// 팀 기록·반 설정을 읽고 쓰는 곳.
// VITE_API_URL(Supabase Edge Functions 주소, 예: https://xxxx.supabase.co/functions/v1)이 있으면 서버를 쓰고,
// 없으면 이 브라우저(localStorage)를 서버처럼 쓴다 (개발·시험용). 두 쪽은 주고받는 모양이 같다.
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
export const SERVER = !!BASE

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status }
}

export async function post(fn, body, headers = {}) {
  let res
  const text = JSON.stringify(body)
  try {
    // keepalive: 페이지를 닫는 순간 보낸 저장도 끝까지 가게 한다 (브라우저 제한이 64KB라서 작은 요청만)
    res = await fetch(`${BASE}/${fn}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: text, keepalive: text.length < 60000 })
  } catch {
    throw new ApiError('서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.', 0)
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data.message || '처리하지 못했어요. 잠시 뒤 다시 해 보세요.', res.status)
  return data
}

// patch: { "keyword": 값, "deck.title": 값, "members.2": 값 } 처럼 경로 → 값. 서버의 merge_game과 같은 방식으로 고친다.
// 안쪽 칸이 배열이면(팀원 목록) 그 번호의 칸만 바꾼다.
export function applyPatch(game, patch) {
  const g = { ...game }
  for (const [k, v] of Object.entries(patch)) {
    const [a, b] = k.split('.')
    if (b === undefined) g[a] = v
    else if (Array.isArray(g[a])) { const arr = [...g[a]]; arr[Number(b)] = v; g[a] = arr }
    else g[a] = { ...(g[a] && typeof g[a] === 'object' ? g[a] : {}), [b]: v }
  }
  return g
}

// ---------- 서버 ----------
const remote = {
  create: ({ cls, no, pin, game }) => post('api', { action: 'create', cls, no, pin, game }),
  join: (cls, no, pin) => post('api', { action: 'join', cls, no, pin }),
  sync: (token, rev) => post('api', { action: 'sync', token, rev }),
  save: (token, patch) => post('api', { action: 'save', token, patch }),
  remove: (token, pin) => post('api', { action: 'remove', token, pin }),
  admin: (pass, action, body = {}) => post('api', { action: `admin_${action}`, ...body }, { 'x-admin-password': pass }),
}

// ---------- 이 브라우저 (서버가 없을 때) ----------
const KEY = 'data-detective-v6'
export const TEAM_AI = 10
const readTeams = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}').teams ?? {} } catch { return {} } }
const writeTeams = teams => { try { localStorage.setItem(KEY, JSON.stringify({ teams })) } catch { throw new ApiError('이 브라우저에 저장하지 못했어요. (저장 공간이 꽉 찼을 수 있어요)', 0) } }

const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
async function cred(pin, salt = hex(crypto.getRandomValues(new Uint8Array(8)))) {
  return { salt, hash: hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${pin}`))) }
}
const localView = (key, t, rev, token) => ({
  ...(token ? { token } : {}), rev: t.rev,
  game: rev === t.rev ? undefined : t.game,
  ai: { used: t.used ?? 0, bonus: t.bonus ?? 0 },
  settings: settingsOf(readSettings(), t.game.cls),
})
const need = token => {
  const t = readTeams()[token]
  if (!t) throw new ApiError('팀 정보가 바뀌었거나 지워졌어요. 다시 들어가 주세요.', 401)
  return t
}

const local = {
  async create({ cls, no, pin, game }) {
    const key = teamKey(cls, no), all = readTeams()
    if (all[key]) throw new ApiError(`${key}는 이미 있어요. "우리 팀으로 들어가기"를 눌러요.`, 409)
    all[key] = { ...(await cred(pin)), game: { ...game, team: key, cls, no }, rev: 1, used: 0, bonus: 0 }
    writeTeams(all)
    return localView(key, all[key], null, key)
  },
  async join(cls, no, pin) {
    const key = teamKey(cls, no), t = readTeams()[key]
    if (!t) throw new ApiError(`이 기기에는 ${key}가 없어요. 처음이면 "새 팀 만들기"를 눌러요.`, 404)
    if ((await cred(pin, t.salt)).hash !== t.hash) throw new ApiError('비밀번호(숫자)가 맞지 않아요.', 401)
    return localView(key, t, null, key)
  },
  async sync(token, rev) { return localView(token, need(token), rev) },
  async save(token, patch) {
    const all = readTeams(), t = need(token)
    const clean = Object.fromEntries(Object.entries(patch).filter(([k]) => !/^(ai|team|cls|no)(\.|$)/.test(k)))
    all[token] = { ...t, game: applyPatch(t.game, clean), rev: t.rev + 1 }
    writeTeams(all)
    return { rev: t.rev + 1 }
  },
  async remove(token, pin) {
    const all = readTeams(), t = need(token)
    if ((await cred(pin ?? '', t.salt)).hash !== t.hash) throw new ApiError('비밀번호(숫자)가 맞지 않아 지우지 않았어요.', 403)
    delete all[token]; writeTeams(all)
    return { ok: true }
  },
  // 데모 코치가 코인을 쓴다 (서버에서는 coach 함수가 센다)
  async spend(token) {
    const all = readTeams(), t = need(token)
    const total = TEAM_AI + (t.bonus ?? 0)
    if ((t.used ?? 0) >= total) throw new ApiError('우리 팀 코인을 모두 썼어요. 더 필요하면 선생님께 말씀드려요.', 429)
    all[token] = { ...t, used: (t.used ?? 0) + 1 }
    writeTeams(all)
    return total - all[token].used
  },
  async admin(_pass, action, b = {}) {
    const all = readTeams()
    const edit = (key, fn) => { if (all[key]) { all[key] = fn(all[key]); writeTeams(all) } }
    switch (action) {
      case 'check': return { ok: true }
      case 'list': return {
        teams: Object.entries(all).map(([key, t]) => ({ key, rev: t.rev, game: t.game, ai: { used: t.used ?? 0, bonus: t.bonus ?? 0 } })),
        settings: readSettings(),
      }
      case 'settings': b.classes.forEach(c => saveSettings(c, b.patch)); return { ok: true }
      case 'coins': b.keys.forEach(k => edit(k, t => ({ ...t, bonus: (t.bonus ?? 0) + b.n }))); return { count: b.keys.filter(k => all[k]).length }
      case 'pin': { const c = await cred(b.pin); edit(b.key, t => ({ ...t, ...c })); return { ok: true } }
      case 'delete': delete all[b.key]; writeTeams(all); return { ok: true }
      case 'log': return { log: [] }
      default: throw new ApiError('알 수 없는 요청이에요.', 400)
    }
  },
}

export const backend = SERVER ? remote : local
export const spendLocal = local.spend
