// Supabase Edge Function: 팀 기록·반 설정을 읽고 쓰는 곳. 학생 화면과 관리자 화면(/admindara)이 모두 이 함수를 부른다.
// 배포 전 필요: secret ADMIN_PASSWORD (관리자 화면 비밀번호). 배포할 때 --no-verify-jwt (팀은 토큰으로 직접 확인한다)
// 학생: create(팀 만들기) / join(들어가기) / sync(최신 기록 받기) / save(고친 칸만 저장) / remove(팀 지우기)
// 관리자: admin_* (요청 머리글 x-admin-password가 ADMIN_PASSWORD와 같아야 한다)
import { db, json, fail, CORS, newSalt, hashPin, makeToken, teamOf, settingsOf, coinsOf, same, DEFAULT_SETTINGS, type TeamRow } from '../_shared/common.ts'

const CLASS_RE = /^1-[1-8]$/ // 1-1 ~ 1-8반
const PIN_RE = /^\d{4,6}$/
const MAX_BODY = 3_000_000 // 발표 그래프 이미지까지 들어가므로 넉넉히
const MAX_FAILS = 5 // 비밀번호를 연속으로 이만큼 틀리면
const LOCK_MIN = 5 // 이 시간(분) 동안 잠근다

const teamKey = (cls: string, no: number) => `${cls} ${no}조`
// 그래프 이미지의 짧은 표식 (app/src/backend.js의 graphTag와 같은 방식)
const graphTag = (s: string) => (s ? `${s.length}:${s.slice(-32)}` : '')
const validTeam = (cls: unknown, no: unknown) => typeof cls === 'string' && CLASS_RE.test(cls) && Number.isInteger(no) && (no as number) >= 1 && (no as number) <= 10
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

// 들어온 뒤 학생 화면에 돌려주는 것: 토큰, 기록, 코인, 반 설정
async function view(client: ReturnType<typeof db>, team: TeamRow, game: unknown, token?: string) {
  const [ai, settings] = await Promise.all([coinsOf(client, team), settingsOf(client, team.cls)])
  return { ...(token ? { token } : {}), rev: team.rev, game, ai, settings }
}

async function student(client: ReturnType<typeof db>, action: string, b: Record<string, unknown>) {
  if (action === 'create') {
    const { cls, no, pin, game } = b
    if (!validTeam(cls, no)) return fail(400, 'bad_team', '반과 조를 목록에서 골라 주세요.')
    if (typeof pin !== 'string' || !PIN_RE.test(pin)) return fail(400, 'bad_pin', '비밀번호는 숫자 4~6자리로 정해 주세요.')
    if (!isObj(game)) return fail(400, 'bad_game', '팀 기록이 올바르지 않아요.')
    const key = teamKey(cls as string, no as number)
    const salt = newSalt(), hash = await hashPin(salt, pin)
    const row = { key, cls, no, salt, hash, game: { ...game, team: key, cls, no, ai: undefined } }
    const { data, error } = await client.from('teams').insert(row).select('key, cls, hash, coin_bonus, rev, created_at').single()
    if (error?.code === '23505') return fail(409, 'exists', `${key}는 이미 있어요. "우리 팀으로 들어가기"를 눌러요.`)
    if (error) throw error
    return json(await view(client, data, row.game, await makeToken(key, hash)))
  }

  if (action === 'join') {
    const { cls, no, pin } = b
    if (!validTeam(cls, no) || typeof pin !== 'string') return fail(400, 'bad_team', '반과 조를 목록에서 골라 주세요.')
    const key = teamKey(cls as string, no as number)
    const { data: t } = await client.from('teams').select('*').eq('key', key).maybeSingle()
    if (!t) return fail(404, 'no_team', `${key}는 아직 없어요. 처음이면 "새 팀 만들기"를 눌러요.`)
    if (t.locked_until && new Date(t.locked_until).getTime() > Date.now()) {
      const m = Math.ceil((new Date(t.locked_until).getTime() - Date.now()) / 60000)
      return fail(429, 'locked', `비밀번호를 여러 번 틀려서 잠겼어요. ${m}분 뒤에 다시 해 보거나 선생님께 말씀드려요.`)
    }
    if (!same(await hashPin(t.salt, pin), t.hash)) {
      const fails = t.fails + 1
      await client.from('teams').update(fails >= MAX_FAILS
        ? { fails: 0, locked_until: new Date(Date.now() + LOCK_MIN * 60000).toISOString() }
        : { fails }).eq('key', key)
      return fail(401, 'bad_pin', fails >= MAX_FAILS ? `비밀번호를 ${MAX_FAILS}번 틀려서 ${LOCK_MIN}분 동안 잠겼어요.` : `비밀번호(숫자)가 맞지 않아요. (${fails}/${MAX_FAILS})`)
    }
    if (t.fails || t.locked_until) await client.from('teams').update({ fails: 0, locked_until: null }).eq('key', key)
    return json(await view(client, t, t.game, await makeToken(key, t.hash)))
  }

  // 아래는 들어간 팀만 (토큰 확인)
  const team = await teamOf(client, b.token)
  if (!team) return fail(401, 'auth', '팀 정보가 바뀌었거나 지워졌어요. 다시 들어가 주세요.')

  if (action === 'sync') {
    // 가진 기록과 같은 판(rev)이면 기록은 다시 보내지 않는다 (그래프 이미지가 커서)
    if (b.rev === team.rev) return json(await view(client, team, undefined))
    const { data } = await client.from('teams').select('game').eq('key', team.key).single()
    const game = data!.game
    // 브라우저가 이미 같은 그래프를 가지고 있으면(표식이 같으면) 이미지는 빼고 보낸다. 전송량의 대부분이 그래프라서.
    const graph = game.deck?.graph ?? ''
    if (graph && b.graphTag === graphTag(graph)) {
      return json({ ...(await view(client, team, { ...game, deck: { ...game.deck, graph: undefined } })), graphKept: true })
    }
    return json(await view(client, team, game))
  }

  if (action === 'save') {
    if (!isObj(b.patch)) return fail(400, 'bad_patch', '저장할 내용이 올바르지 않아요.')
    // 코인(ai)과 팀 이름은 학생 화면이 바꿀 수 없다
    const patch = Object.fromEntries(Object.entries(b.patch).filter(([k]) => !/^(ai|team|cls|no)(\.|$)/.test(k) && k.split('.').length <= 2))
    if (!Object.keys(patch).length) return json({ rev: team.rev })
    const { data: rev, error } = await client.rpc('merge_game', { p_key: team.key, p_patch: patch })
    if (error) throw error
    return json({ rev })
  }

  if (action === 'remove') {
    // 팀 전체가 사라지므로 비밀번호를 한 번 더 확인한다 (한 사람이 실수로 지우지 않게)
    const { data: t } = await client.from('teams').select('salt, hash').eq('key', team.key).single()
    if (typeof b.pin !== 'string' || !same(await hashPin(t!.salt, b.pin), t!.hash)) return fail(403, 'bad_pin', '비밀번호(숫자)가 맞지 않아 지우지 않았어요.')
    await client.from('teams').delete().eq('key', team.key)
    return json({ ok: true })
  }

  return fail(400, 'bad_action', '알 수 없는 요청이에요.')
}

// ---------- 관리자 ----------
async function admin(client: ReturnType<typeof db>, action: string, b: Record<string, unknown>) {
  if (action === 'admin_check') return json({ ok: true })

  if (action === 'admin_list') {
    const [{ data: teams, error }, { data: counts, error: e2 }, { data: settings }] = await Promise.all([
      client.from('teams').select('key, game, coin_bonus, rev, updated_at').order('key'),
      client.rpc('coach_counts'), // 팀별로 쓴 코인 (DB에서 센다. 기록을 통째로 읽으면 1000줄 제한에 걸린다)
      client.from('class_settings').select('cls, coach, phase'),
    ])
    if (error) throw error
    if (e2) throw e2
    const used: Record<string, number> = Object.fromEntries((counts ?? []).map((c: { team: string; used: number }) => [c.team, Number(c.used)]))
    return json({
      // 목록에는 발표 그래프 이미지를 빼고 보낸다 (팀이 많으면 무거워서)
      teams: (teams ?? []).map(t => ({
        key: t.key, rev: t.rev,
        game: { ...t.game, deck: { ...(t.game.deck ?? {}), graph: t.game.deck?.graph ? '(이미지)' : '' } },
        ai: { used: used[t.key] ?? 0, bonus: t.coin_bonus },
      })),
      settings: Object.fromEntries((settings ?? []).map(s => [s.cls, { coach: s.coach, phase: s.phase }])),
    })
  }

  if (action === 'admin_settings') {
    const { classes, patch } = b
    if (!Array.isArray(classes) || !classes.every(c => typeof c === 'string' && CLASS_RE.test(c)) || !isObj(patch)) return fail(400, 'bad', '반 설정이 올바르지 않아요.')
    const p: Record<string, unknown> = {}
    if (typeof patch.coach === 'boolean') p.coach = patch.coach
    if (['plan', 'code', 'deck'].includes(patch.phase as string)) p.phase = patch.phase
    const { data: cur } = await client.from('class_settings').select('cls, coach, phase').in('cls', classes)
    const rows = classes.map(cls => ({ ...DEFAULT_SETTINGS, ...(cur ?? []).find(r => r.cls === cls), cls, ...p }))
    const { error } = await client.from('class_settings').upsert(rows)
    if (error) throw error
    return json({ ok: true })
  }

  if (action === 'admin_coins') {
    const { keys, n } = b
    if (!Array.isArray(keys) || !Number.isInteger(n) || (n as number) < 1 || (n as number) > 50) return fail(400, 'bad', '코인 개수가 올바르지 않아요.')
    const { data } = await client.from('teams').select('key, coin_bonus').in('key', keys as string[])
    // 학생 화면은 sync 때마다 코인을 새로 받으므로 rev는 올리지 않는다
    for (const t of data ?? []) await client.from('teams').update({ coin_bonus: t.coin_bonus + (n as number) }).eq('key', t.key)
    return json({ count: data?.length ?? 0 })
  }

  if (action === 'admin_pin') {
    const { key, pin } = b
    if (typeof key !== 'string' || typeof pin !== 'string' || !PIN_RE.test(pin)) return fail(400, 'bad_pin', '비밀번호는 숫자 4~6자리로 정해 주세요.')
    const salt = newSalt()
    const { error } = await client.from('teams').update({ salt, hash: await hashPin(salt, pin), fails: 0, locked_until: null }).eq('key', key)
    if (error) throw error
    return json({ ok: true })
  }

  if (action === 'admin_delete') {
    if (typeof b.key !== 'string') return fail(400, 'bad', '팀 이름이 없어요.')
    await client.from('teams').delete().eq('key', b.key)
    return json({ ok: true })
  }

  if (action === 'admin_log') {
    if (typeof b.key !== 'string') return fail(400, 'bad', '팀 이름이 없어요.')
    // 지금 팀을 만든 뒤의 대화만 보여 준다
    const { data: t } = await client.from('teams').select('created_at').eq('key', b.key).maybeSingle()
    const { data } = await client.from('coach_log').select('mode, message, reply, flagged, created_at').eq('team', b.key).gte('created_at', t?.created_at ?? '1970-01-01').order('created_at')
    return json({ log: data ?? [] })
  }

  return fail(400, 'bad_action', '알 수 없는 요청이에요.')
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return fail(405, 'method', 'POST만 받아요.')
  try {
    const text = await req.text()
    if (text.length > MAX_BODY) return fail(413, 'too_big', '저장할 내용이 너무 커요. 발표 그래프 이미지를 다시 올려 보세요.')
    const b = JSON.parse(text)
    const action = typeof b?.action === 'string' ? b.action : ''
    const client = db()
    // 잠자기 방지: Supabase 무료 프로젝트는 7일 동안 요청이 없으면 멈추므로, GitHub Actions가 며칠마다 이걸 부른다
    if (action === 'ping') {
      const { error } = await client.from('class_settings').select('cls').limit(1)
      if (error) throw error
      return json({ ok: true })
    }
    if (action.startsWith('admin_')) {
      const want = Deno.env.get('ADMIN_PASSWORD')
      const got = req.headers.get('x-admin-password') ?? ''
      if (!want) return fail(503, 'no_admin', '서버에 관리자 비밀번호(ADMIN_PASSWORD)가 아직 없어요.')
      if (!same(got, want)) {
        await new Promise(r => setTimeout(r, 800)) // 마구 넣어 보기를 느리게
        return fail(401, 'admin_auth', '관리자 비밀번호가 맞지 않아요.')
      }
      return await admin(client, action, b)
    }
    return await student(client, action, b)
  } catch (e) {
    console.error(e)
    return fail(500, 'server', '서버에서 처리하지 못했어요. 잠시 뒤 다시 해 보세요.')
  }
})
