import { getDs, getCol, FRAMES, STATS, CHARTS, MISSING } from './data/meta.js'
import { fixJosa } from './josa.js'

export const MAX_REVIEWS = 5

export const pct = (n, total) => (total ? Math.round((n / total) * 1000) / 10 : 0)
export const frameOf = id => FRAMES.find(f => f.id === id)
export const missingOf = id => MISSING.find(m => m.id === id)
export const nameOf = (m, i) => m.name.trim() || `팀원 ${i + 1}`

// ---------- 무엇을 계산하나: 숫자 열의 통계 또는 "빈도(몇 개·몇 명)" ----------
export const isFreq = g => g.measureMode === 'freq'
export const measureName = g => (isFreq(g) ? '빈도(개수)' : g.measure)
export const hasMeasure = g => isFreq(g) || !!g.measure

export function statOf(id, etc = '') {
  if (id === 'etc') {
    const ko = etc.trim() || '기타'
    return { id: 'etc', ko, topic: fixJosa(`${ko}은(는)`), obj: fixJosa(`${ko}을(를)`), fn: etc.trim() || '(함수 이름)', desc: '직접 쓴 통계' }
  }
  return STATS.find(s => s.id === id) ?? STATS[0]
}
export const statFor = g => (isFreq(g) ? statOf('count') : statOf(g.stat, g.statEtc))

export function chartOf(id, etc = '') {
  if (id === 'etc') {
    const ko = etc.trim() || '기타'
    // 문장에서 "(이름)그래프로"로 이어지므로 끝의 "그래프"는 뺀다. 이름을 안 썼으면 "그래프로"가 된다
    return { id: 'etc', ko, short: etc.trim().replace(/그래프$/, ''), tokens: [], desc: '직접 쓴 그래프' }
  }
  return CHARTS.find(c => c.id === id) ?? CHARTS[0]
}
export const chartFor = g => chartOf(g.chart, g.chartEtc)

// 검토받은 질문이 지금 고른 열과 같은지 비교하는 열쇠
export const picksKey = g => `${g.groupBy}|${isFreq(g) ? '#freq' : g.measure}`

// 질문 검토 상태: 마지막 검토가 지금 질문·열과 같고(통과했거나 5번을 다 썼으면) 아래 단계로 내려갈 수 있다
export function reviewState(g) {
  const last = g.reviews[g.reviews.length - 1]
  const left = MAX_REVIEWS - g.reviews.length
  const same = !!last && last.text === g.question && last.picks === picksKey(g)
  return { last, left, same, accepted: (same && last.pass) || left <= 0, exhausted: left <= 0 }
}

// 질문 틀 A·B·C에 고른 열을 넣은 초안 (학생이 고쳐 쓰는 출발점)
export function draftQuestion(g) {
  const s = statFor(g)
  const a = g.groupBy || '(묶는 기준)'
  if (isFreq(g)) {
    if (g.frame === 'B') return `${a} 중 어디가 가장 많을까?`
    if (g.frame === 'C') return `${a}에 따라 개수(빈도)는 어떻게 변할까?`
    return `${a}별로 개수(빈도)는 어떻게 다를까?`
  }
  const b = g.measure || '(계산할 열)'
  if (g.frame === 'B') return `${a} 중 어디에서 ${b}의 ${s.topic} 가장 높을까?`
  if (g.frame === 'C') return `${a}에 따라 ${b}의 ${s.topic} 어떻게 변할까?`
  return `${a}별로 ${b}의 ${s.topic} 어떻게 다를까?`
}

// 코치에게 보내는 맥락 (학생이 쓴 자료로만 취급된다)
export const contextOf = g => ({
  keyword: g.keyword, dataset: g.dataset, groupBy: g.groupBy, measure: measureName(g), question: g.question,
})

// 코드 설계 점검: 고른 열·통계·그래프 종류를 코드 설계에 썼는지
export function checkCodeDesign(g) {
  const t = g.codeDesign
  const s = statFor(g), c = chartFor(g)
  const stat = isFreq(g)
    ? { ok: /value_counts|count\(|size\(/.test(t), label: '개수를 세는 함수(value_counts / count / size)를 썼어요' }
    : { ok: s.id === 'etc' ? !!g.statEtc.trim() && t.includes(g.statEtc.trim()) : t.includes(s.id), label: `통계 함수(${s.id === 'etc' ? s.fn : s.id})를 썼어요` }
  return [
    { ok: /groupby|value_counts/.test(t), label: 'groupby(또는 value_counts)를 썼어요' },
    { ok: !!g.groupBy && t.includes(g.groupBy), label: `묶는 기준(${g.groupBy || '?'})을 썼어요` },
    isFreq(g)
      ? { ok: true, label: '빈도(개수)를 세는 질문이라 계산할 열은 필요 없어요' }
      : { ok: !!g.measure && t.includes(g.measure), label: `계산할 열(${g.measure || '?'})을 썼어요` },
    stat,
    { ok: c.id === 'etc' ? /plot|hist|bar|scatter|pie|line|box/.test(t) : c.tokens.some(k => t.includes(k)), label: `그래프 종류(${c.id === 'etc' ? c.ko : c.id})를 썼어요` },
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
    case 'scene': return g.concernParts.slice(0, 2).every(p => p.trim().length >= 2) && filled(g.groupsAsk, g.numberAsk)
    case 'question': return !!g.groupBy && hasMeasure(g) && reviewState(g).accepted && filled(g.scene, g.expect)
    case 'understand': return filled(g.rowMeaning) && g.usedCols.length >= 3
    case 'method': return !!g.missingMethod && filled(g.missingWhy) && checkCodeDesign(g).every(c => c.ok)
    case 'summary': return filled(g.title)
    default: return false
  }
}

// 진로 장면 ①: 고민을 여러 칸에 쓴 답을 한 덩어리로 합친다 (기획안·발표에서 쓴다)
export const MAX_CONCERNS = 4
export const concernText = g => g.concernParts.map((p, i) => (p.trim() ? `(${i + 1}) ${p.trim()}` : '')).filter(Boolean).join('\n')
// 발표 문장에 한 줄로 넣을 때는 첫 번째 고민을 쓴다
export const concernMain = g => (g.concernParts.find(p => p.trim()) || '').trim()
// 기획안 전체 텍스트 (복사용). 기획안 v2의 번호와 제목을 그대로 쓴다.
export function buildPlanText(g) {
  const ds = getDs(g.dataset)
  const f = frameOf(g.frame), s = statFor(g), c = chartFor(g), mm = missingOf(g.missingMethod)
  const L = []
  L.push(`# ${g.title || '(프로젝트 제목)'}`, '')
  L.push('## 0. 팀 기본 정보', `조: ${g.team}`, `팀원: ${g.members.map(m => `${m.id} ${m.name}`.trim()).join(' / ')}`, `사용할 데이터 파일: ${ds ? ds.id + '.csv' : ''}`, '')
  L.push('## 1. 진로에서 탐구 질문 만들기', '### STEP 1. 팀원 진로')
  g.members.forEach((m, i) => L.push(`- ${nameOf(m, i)}: ${m.career} (${m.job})`))
  L.push('', '### STEP 3. 진로 장면에서 궁금한 점', `① 판단이 필요한 순간과 고민:\n${concernText(g)}`, `② 비교하고 싶은 집단: ${g.groupsAsk}`, `③ 확인할 숫자: ${g.numberAsk}`, '')
  L.push(`### 1-1. 진로 키워드와 이유`, `${g.keyword} — ${g.keywordWhy}`, '')
  L.push(`### 1-2. 탐구 질문 (질문 틀 ${g.frame}: ${f.name})`, g.question, '')
  L.push('### 1-3. 이 질문이 진로에서 중요한 장면', g.scene, '')
  if (g.extraQ.trim()) L.push('### 1-4. 더 알고 싶은 질문', g.extraQ, '')
  L.push('### 1-5. 분석 전 예상', g.expect, '')
  L.push('## 2. 사용할 데이터', `파일: ${ds ? ds.id + '.csv' : ''}`, `한 행: ${g.rowMeaning}`, ds ? `행 × 열: ${ds.rows}행 × ${ds.columns.length}열` : '')
  L.push('사용할 열:'); g.usedCols.forEach(u => L.push(`- ${u.name}: ${u.meaning}`)); L.push('')
  L.push('## 3. 분석 계획', `우리 팀은 ${ds ? ds.id : '___'} 데이터에서 ${g.groupBy}(으)로 묶어 ${isFreq(g) ? '개수(빈도)를' : `${g.measure}의 ${s.obj}`} 비교하고, ${c.short}그래프로 나타냅니다.`)
  L.push(`① 묶는 기준: ${g.groupBy}`, `② 계산할 것: ${isFreq(g) ? '빈도(그룹별 개수)' : g.measure}`, `③ 통계: ${isFreq(g) ? '개수(count / value_counts)' : s.fn}`, `④ 결측값(NaN) 처리: ${mm ? mm.ko : ''} — ${g.missingWhy}`, `⑤ 그래프: ${c.ko}`, `⑥ 새 열: ${g.newCol || '이번에는 만들지 않음'}`)
  if (g.extraCompare.trim()) L.push(`⑧ 더 비교해 보고 싶은 것: ${g.extraCompare}`)
  L.push('코드 설계:', g.codeDesign, '')
  return L.join('\n')
}

// 노트북 맨 위 칸에 붙일 "우리 팀 설계 메모" (# 주석). 기획에서 정한 선택만 담고 정답 코드는 넣지 않는다.
export function buildCodeMemo(g) {
  const ds = getDs(g.dataset)
  const s = statFor(g), c = chartFor(g), mm = missingOf(g.missingMethod)
  const lines = [
    '# [우리 팀 설계] 기획안에서 가져왔어요',
    `# 질문: ${g.question || '(아직 없음)'}`,
    `# 데이터: ${ds ? ds.id + '.csv' : '(아직 없음)'}`,
    `# 묶는 기준: ${g.groupBy || '(아직 없음)'}`,
    `# 계산할 것: ${isFreq(g) ? '빈도(그룹별 개수) → value_counts()' : `${g.measure || '(아직 없음)'}의 ${s.ko} → ${s.fn}`}`,
    `# 결측값(NaN) 처리: ${mm ? mm.ko : '(아직 없음)'}${g.missingWhy ? ' — ' + g.missingWhy : ''}`,
    `# 그래프: ${c.ko}`,
  ]
  if (g.newCol.trim()) lines.push(`# 새 열: ${g.newCol}`)
  if (g.codeDesign.trim()) {
    lines.push('# 우리가 설계한 코드 (기획안 3-3):')
    g.codeDesign.trim().split('\n').forEach(l => lines.push('#   ' + l))
  }
  return lines.join('\n')
}

export { getDs, getCol }
