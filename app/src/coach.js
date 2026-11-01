import { TOPICS } from './data/hints.js'

// 질문 점검(규칙 기반, 서버·비용 없음). 기획안의 "좋은 질문 체크리스트"를 그대로 따른다.
// picks: 학생이 고른 { groupBy, measure } — 질문에 이 열들이 들어 있는지 본다.
export function checkQuestion(text, picks = {}) {
  const t = text.trim()
  const names = [picks.groupBy, picks.measure].filter(Boolean)
  const has = names.filter(n => t.includes(n))
  return [
    { ok: t.length >= 10 && t.length <= 80, label: '한 문장이에요 (10~80자)' },
    { ok: names.length > 0 && has.length === names.length, label: names.length ? `고른 열(${names.join(', ')})이 질문에 들어 있어요` : '먼저 묶는 기준과 계산할 열을 골라요' },
    // "많이 하면"의 "많"처럼 비교가 아닌 말에 걸리지 않도록 비교하는 표현만 본다
    { ok: /(다를까|다른가|차이|비교|높을까|높고|높은|낮을까|낮고|낮은|많을까|많고|많은|적을까|적고|적은|변할까|어디|가장)/.test(t), label: '무엇과 무엇을 비교하는지 드러나요' },
    { ok: t.length > 0 && !/(때문에|원인|하면.{0,12}(오를|높아질|좋아질|늘|줄)까)/.test(t), label: '원인을 단정하지 않아요' },
  ]
}

// 질문 검토(최대 5회): 점검표 결과와 함께, 못 지킨 항목마다 답을 주지 않고 되묻는 질문을 돌려준다.
export const MAX_REVIEWS = 5

export function reviewQuestion(text, picks) {
  const checks = checkQuestion(text, picks)
  const names = [picks.groupBy, picks.measure].filter(Boolean).join(', ')
  const ask = [
    '한 문장(10~80자)으로 다듬어 볼까요? 가장 알고 싶은 것 하나만 남기면 어떤 질문이 될까요?',
    names ? `고른 열 이름(${names})이 질문에 그대로 들어가야 해요. 어디에 넣을 수 있을까요?` : '먼저 묶는 기준과 계산할 열을 골라 볼까요?',
    '무엇과 무엇을 비교하는 질문인가요? 비교가 눈에 보이도록 "…별로 …은 어떻게 다를까?"처럼 써 볼까요?',
    '"때문에", "하면 …오를까"는 원인을 단정해요. "함께 움직이는 경향이 있을까?"로 바꿔 물을 수 있을까요?',
  ]
  const asks = checks.map((c, i) => (c.ok ? null : ask[i])).filter(Boolean)
  const pass = checks.every(c => c.ok)
  return {
    checks, pass, score: checks.filter(c => c.ok).length,
    asks: pass ? ['4가지 기준을 모두 지켰어요. 이 질문의 답이 예상과 다르게 나온다면 어떤 이유가 있을 것 같나요?'] : asks,
  }
}

// AI 서버가 연결되기 전 데모 응답. 실제 응답과 같은 규칙(되묻기·도구 이름·빈칸까지만)을 따른다.
const KEYWORDS = {
  func: /(함수|def|return|매개변수)/i,
  stats: /(describe|중앙값|median|통계 요약|value_counts)/i,
  missing: /(결측|빈칸|nan|null|fillna|dropna|isnull)/i,
  groupby: /(groupby|묶|그룹|평균|합계|개수|value_counts)/i,
  newcol: /(새\s*열|열\s*추가|계산)/i,
  plot: /(그래프|plot|막대|선그래프|시각|title)/i,
  interpret: /(해석|결론|의미|왜|한계)/i,
  explore: /(탐색|구조|info|shape|columns|head|dtypes)/i,
}

export function mockReply({ mode, message, context }) {
  const demo = '\n\n(데모 응답입니다. 서버를 연결하면 AI가 쓴 내용에 맞춰 답해요.)'
  if (mode === 'plan') {
    const miss = checkQuestion(message, context).filter(c => !c.ok).map(c => c.label)
    const asks = miss.length
      ? ['쓴 내용에서 아직 비어 있는 부분이 있어요: ' + miss.join(' / '), '그 부분을 채우려면 열 목록에서 어떤 열을 보면 될까요?']
      : ['4가지 기준을 모두 지켰어요. 이 질문의 답이 예상과 다르게 나온다면 어떤 이유가 있을 것 같나요?', '이 결과를 우리 진로의 어떤 장면에서 쓸 수 있을까요?']
    return asks.join('\n\n') + demo
  }
  const id = Object.keys(KEYWORDS).find(k => KEYWORDS[k].test(message)) || 'explore'
  const tp = TOPICS.find(t => t.id === id)
  return `[${tp.name}] 먼저 스스로 떠올려 볼 것:\n- ${tp.asks.slice(0, 2).join('\n- ')}\n\n필요할 수 있는 도구:\n- ${tp.tools.slice(0, 2).join('\n- ')}` +
    (context?.question ? `\n\n(우리 조 질문: ${context.question})` : '') + demo
}
