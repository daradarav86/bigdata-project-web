import { getDs, getCol, FRAMES, STATS, MISSING } from './data/meta.js'

export const MAX_REVIEWS = 5

// 질문 검토 상태: 마지막 검토가 지금 질문·열과 같고(통과했거나 5번을 다 썼으면) 아래 단계로 내려갈 수 있다
export function reviewState(g) {
  const last = g.reviews[g.reviews.length - 1]
  const left = MAX_REVIEWS - g.reviews.length
  const same = !!last && last.text === g.question && last.picks === `|`
  return { last, left, same, accepted: (same && last.pass) || left <= 0, exhausted: left <= 0 }
}

export const pct = (n, total) => (total ? Math.round((n / total) * 1000) / 10 : 0)
export const statOf = id => STATS.find(s => s.id === id)
export const frameOf = id => FRAMES.find(f => f.id === id)
export const missingOf = id => MISSING.find(m => m.id === id)
export const nameOf = (m, i) => m.name.trim() || `팀원 ${i + 1}`

// 질문 틀 A·B·C에 고른 열을 넣은 초안 (학생이 고쳐 쓰는 출발점)
export function draftQuestion(g) {
  const s = statOf(g.stat)
  const a = g.groupBy || '(묶는 기준)', b = g.measure || '(계산할 열)'
  if (g.frame === 'B') return `${a} 중 어디에서 ${b}의 ${s.topic} 가장 높을까?`
  if (g.frame === 'C') return `${a}에 따라 ${b}의 ${s.topic} 어떻게 변할까?`
  return `${a}별로 ${b}의 ${s.topic} 어떻게 다를까?`
}

// 코치에게 보내는 맥락 (학생이 쓴 자료로만 취급된다)
export const contextOf = g => ({
  keyword: g.keyword, dataset: g.dataset, groupBy: g.groupBy, measure: g.measure, question: g.question,
})

// 코드 설계 점검: 고른 열·통계·그래프 종류를 코드 설계에 썼는지
export function checkCodeDesign(g) {
  const t = g.codeDesign
  const fn = statOf(g.stat).id
  return [
    { ok: !!g.groupBy && t.includes(g.groupBy), label: `묶는 기준(${g.groupBy || '?'})을 썼어요` },
    { ok: !!g.measure && t.includes(g.measure), label: `계산할 열(${g.measure || '?'})을 썼어요` },
    { ok: t.includes(fn), label: `통계 함수(${fn})를 썼어요` },
    { ok: t.includes(g.chart), label: `그래프 종류(${g.chart})를 썼어요` },
    { ok: /groupby/.test(t), label: 'groupby를 썼어요' },
  ]
}

// 단계별 완료 조건 (왼쪽 목록의 ✓)
export const PLAN_STEPS = [
  { id: 'team', name: '우리 팀', doc: '0' },
  { id: 'career', name: '진로 모으기', doc: '1 STEP1·1-1' },
  { id: 'data', name: '데이터 고르기', doc: '1 STEP2' },
  { id: 'scene', name: '진로 장면 떠올리기', doc: '1 STEP3' },
  { id: 'question', name: '열 고르고 질문 만들기', doc: '1 STEP4·1-2~1-5' },
  { id: 'understand', name: '데이터 이해하기', doc: '2' },
  { id: 'method', name: '분석 계획', doc: '3' },
  { id: 'summary', name: '기획안 완성', doc: '' },
]

export function stepDone(id, g) {
  const filled = (...v) => v.every(x => String(x).trim().length >= 2)
  switch (id) {
    case 'team': return filled(g.team) && g.members.every(m => m.name.trim()) && g.pledge
    case 'career': return g.members.every(m => m.career.trim()) && filled(g.keyword, g.keywordWhy)
    case 'data': return !!g.dataset
    case 'scene': return filled(g.concern, g.groupsAsk, g.numberAsk)
    case 'question': return !!g.groupBy && !!g.measure && reviewState(g).accepted && filled(g.scene, g.expect)
    case 'understand': return filled(g.rowMeaning) && g.usedCols.length >= 3
    case 'method': return !!g.missingMethod && filled(g.missingWhy) && checkCodeDesign(g).every(c => c.ok)
    case 'summary': return filled(g.title)
    default: return false
  }
}

// 기획안 전체 텍스트 (복사용). 기획안 v2의 번호와 제목을 그대로 쓴다.
export function buildPlanText(g) {
  const ds = getDs(g.dataset)
  const f = frameOf(g.frame), s = statOf(g.stat), mm = missingOf(g.missingMethod)
  const L = []
  L.push(`# ${g.title || '(프로젝트 제목)'}`, '')
  L.push('## 0. 팀 기본 정보', `조: ${g.team}`, `팀원: ${g.members.map(m => `${m.id} ${m.name}`.trim()).join(' / ')}`, `사용할 데이터 파일: ${ds ? ds.id + '.csv' : ''}`, '')
  L.push('## 1. 진로에서 탐구 질문 만들기', '### STEP 1. 팀원 진로')
  g.members.forEach((m, i) => L.push(`- ${nameOf(m, i)}: ${m.career} (${m.job})`))
  L.push('', '### STEP 3. 진로 장면에서 궁금한 점', `① 가장 자주 고민하는 것: ${g.concern}`, `② 비교하고 싶은 집단: ${g.groupsAsk}`, `③ 확인할 숫자: ${g.numberAsk}`, '')
  L.push(`### 1-1. 진로 키워드와 이유`, `${g.keyword} — ${g.keywordWhy}`, '')
  L.push(`### 1-2. 탐구 질문 (질문 틀 ${g.frame}: ${f.name})`, g.question, '')
  L.push('### 1-3. 이 질문이 진로에서 중요한 장면', g.scene, '')
  if (g.extraQ.trim()) L.push('### 1-4. 더 알고 싶은 질문', g.extraQ, '')
  L.push('### 1-5. 분석 전 예상', g.expect, '')
  L.push('## 2. 사용할 데이터', `파일: ${ds ? ds.id + '.csv' : ''}`, `한 행: ${g.rowMeaning}`, ds ? `행 × 열: ${ds.rows}행 × ${ds.columns.length}열` : '')
  L.push('사용할 열:'); g.usedCols.forEach(c => L.push(`- ${c.name}: ${c.meaning}`)); L.push('')
  L.push('## 3. 분석 계획', `우리 팀은 ${ds ? ds.id : '___'} 데이터에서 ${g.groupBy}(으)로 묶어 ${g.measure}의 ${s.obj} 비교하고, ${g.chart === 'line' ? '선' : '막대'}그래프로 나타냅니다.`)
  L.push(`① 묶는 기준: ${g.groupBy}`, `② 계산할 열: ${g.measure}`, `③ 통계 함수: ${s.fn}`, `④ 빈칸 처리: ${mm ? mm.ko : ''} — ${g.missingWhy}`, `⑤ 그래프: ${g.chart}`, `⑥ 새 열: ${g.newCol || '이번에는 만들지 않음'}`)
  L.push('코드 설계:', g.codeDesign, '')
  return L.join('\n')
}

export { getDs, getCol }
