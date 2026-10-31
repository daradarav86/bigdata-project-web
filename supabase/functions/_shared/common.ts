// api·coach 함수가 함께 쓰는 것: 응답 모양, DB 연결, 팀 확인(토큰), 코인 계산
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-password',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
// 학생 화면에 그대로 보여 줄 수 있는 오류 (message는 한국어)
export const fail = (status: number, error: string, message: string) => json({ error, message }, status)

// 서버 전용 키: 예전 방식(SUPABASE_SERVICE_ROLE_KEY)이 없으면 새 방식(SUPABASE_SECRET_KEYS의 default)을 쓴다
function secretKey(): string {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (legacy) return legacy
  try { return JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}').default ?? '' } catch { return '' }
}

export const db = (): SupabaseClient =>
  createClient(Deno.env.get('SUPABASE_URL')!, secretKey(), { auth: { persistSession: false } })

export const TEAM_AI = 10 // 코치는 팀당 총 10번 (+ 선생님이 더 준 코인)
export const DEFAULT_SETTINGS = { coach: true, phase: 'deck' }

const enc = new TextEncoder()
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
export const newSalt = () => hex(crypto.getRandomValues(new Uint8Array(8)).buffer)
export const hashPin = async (salt: string, pin: string) => hex(await crypto.subtle.digest('SHA-256', enc.encode(`${salt}:${pin}`)))

// 길이가 같은 두 글자를 시간 차 없이 비교한다
export function same(a: string, b: string) {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

// 팀 토큰 = "팀 이름.서명". 서명에 비밀번호 hash가 들어가므로 선생님이 비밀번호를 바꾸면 예전 토큰은 자동으로 막힌다.
async function sign(msg: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(Deno.env.get('TOKEN_SECRET') || secretKey()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(msg)))
}
export const makeToken = async (key: string, hash: string) => `${key}.${await sign(`${key}:${hash}`)}`

export type TeamRow = { key: string; cls: string; hash: string; coin_bonus: number; rev: number; created_at: string }

// 토큰이 맞으면 그 팀의 행을, 아니면 null
export async function teamOf(client: SupabaseClient, token: unknown): Promise<TeamRow | null> {
  if (typeof token !== 'string' || token.length > 200) return null
  const dot = token.lastIndexOf('.')
  if (dot < 1) return null
  const key = token.slice(0, dot)
  const { data } = await client.from('teams').select('key, cls, hash, coin_bonus, rev, created_at').eq('key', key).maybeSingle()
  if (!data) return null
  return same(token, await makeToken(key, data.hash)) ? data : null
}

export async function settingsOf(client: SupabaseClient, cls: string) {
  const { data } = await client.from('class_settings').select('coach, phase').eq('cls', cls).maybeSingle()
  return { ...DEFAULT_SETTINGS, ...(data ?? {}) }
}

// 코인: 쓴 개수는 코치 기록(coach_log)에서 세므로 브라우저가 바꿀 수 없다.
// 팀을 만든 뒤의 기록만 센다 (지운 팀과 같은 반·조로 다시 만들어도 예전 기록이 코인을 깎지 않게)
export async function coinsOf(client: SupabaseClient, team: TeamRow) {
  const { count } = await client.from('coach_log').select('id', { count: 'exact', head: true }).eq('team', team.key).gte('created_at', team.created_at)
  return { used: count ?? 0, bonus: team.coin_bonus }
}
