// 반(1-1 ~ 1-8, 맨 뒤에 선생님 시험용 1-0)과 조(1 ~ 10). 학생은 입장할 때 이 목록에서 고르기만 한다 (직접 쓰지 않는다).
export const TEST_CLASS = '1-0' // 선생님이 시험해 보는 반. 0조도 있다 (서버 supabase/functions/api의 validTeam과 같은 규칙)
export const CLASSES = [...Array.from({ length: 8 }, (_, i) => `1-${i + 1}`), TEST_CLASS]
export const GROUPS = Array.from({ length: 10 }, (_, i) => i + 1)
export const groupsOf = cls => (cls === TEST_CLASS ? [0, ...GROUPS] : GROUPS)
export const teamKey = (cls, no) => `${cls} ${no}조`

// 3차시 수업 단계: 선생님이 반마다 지금 하는 일을 정하면, 그 단계까지의 탭만 열린다.
// open: 열려 있는 탭, tab: 지금 해야 하는 일(학생 화면에서 "지금 할 일"로 표시)
export const PHASES = [
  { id: 'plan', ko: '기획안 쓰기', open: ['plan'], tab: 'plan', desc: '기획 탭만 열려요. 코드·발표는 잠겨요.' },
  { id: 'code', ko: '코드 쓰기', open: ['plan', 'code'], tab: 'code', desc: '기획과 코드 탭이 열려요. 발표는 잠겨요.' },
  { id: 'deck', ko: '발표(PPT) 만들기', open: ['plan', 'code', 'deck'], tab: 'deck', desc: '모든 탭이 열려요.' },
]
export const phaseOf = id => PHASES.find(p => p.id === id) ?? PHASES[PHASES.length - 1]

// 설정을 안 한 반은 코치가 켜져 있고 모든 탭이 열려 있다 (선생님이 정하기 전에 막히는 일이 없도록)
export const DEFAULT_SETTINGS = { coach: true, phase: 'deck' }
export const settingsOf = (all, cls) => ({ ...DEFAULT_SETTINGS, ...(all[cls] ?? {}) })

// 서버가 없을 때(개발·시험용) 반 설정을 이 브라우저(localStorage)에 둔다. 서버가 있으면 class_settings 테이블을 쓴다.
const KEY = 'data-detective-classes'
export const readSettings = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} } }
export function saveSettings(cls, patch) {
  const all = readSettings()
  all[cls] = { ...settingsOf(all, cls), ...patch }
  try { localStorage.setItem(KEY, JSON.stringify(all)) } catch { /* 저장 불가 환경 */ }
}
