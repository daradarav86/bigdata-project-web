import datasets from './datasets.json'

export const SITE_NAME = '원묵고 빅데이터원리탐구 도우미'

// Colab에서 여는 프로젝트 노트북 템플릿 (수업에서 쓰는 노트북 주소가 따로 있으면 이 값만 바꾸면 된다)
export const NOTEBOOK_URL = 'https://colab.research.google.com/github/daradarav86/bigdata/blob/main/notebooks/project_template.ipynb'

// 열 설명에서 한글과 숫자가 붙어 있으면 띄운다 ("성적0~20" → "성적 0~20"). 원본 README 표에서 단위가 붙어 나온 것.
for (const ds of datasets) for (const c of ds.columns) c.meaning = c.meaning.replace(/([가-힣])(\d)/g, '$1 $2')

export const getDs = id => datasets.find(d => d.id === id)
export const getCol = (ds, name) => ds?.columns.find(c => c.name === name)

// 기획안 v2의 질문 틀 A·B·C
export const FRAMES = [
  { id: 'A', name: '집단 비교', text: '(묶는 기준)별로 (계산할 것)은 어떻게 다를까?', chart: 'bar', tool: 'groupby + 통계, 막대그래프' },
  { id: 'B', name: '가장 큰 집단 찾기', text: '(묶는 기준) 중 어디에서 (계산할 것)이(가) 가장 높고(낮을까)?', chart: 'bar', tool: 'groupby + 통계, 막대그래프' },
  { id: 'C', name: '변화 살펴보기', text: '(연도·월)에 따라 (계산할 것)은 어떻게 변할까?', chart: 'line', tool: 'groupby + 통계, 선그래프' },
]

// 수업에서 배운 통계 5가지 (+ 기타). 숫자 열에는 어느 것이나 쓸 수 있고, "빈도"는 열 없이 개수만 센다.
export const STATS = [
  { id: 'mean', ko: '평균', topic: '평균은', obj: '평균을', fn: 'mean()', desc: '한 명·하나당 얼마나 (전체 합 ÷ 개수)' },
  { id: 'median', ko: '중앙값', topic: '중앙값은', obj: '중앙값을', fn: 'median()', desc: '크기순으로 놓았을 때 가운데 값. 아주 큰·작은 값의 영향이 적어요' },
  { id: 'max', ko: '최댓값', topic: '최댓값은', obj: '최댓값을', fn: 'max()', desc: '가장 큰 값' },
  { id: 'min', ko: '최솟값', topic: '최솟값은', obj: '최솟값을', fn: 'min()', desc: '가장 작은 값' },
  { id: 'count', ko: '개수', topic: '개수는', obj: '개수를', fn: 'count()', desc: '몇 개인지 (결측값(NaN)은 빼고 세요)' },
]

// 그래프 종류. tokens: 코드 설계에 이 글자가 들어 있으면 그 그래프를 쓴 것으로 본다.
// ※ 수업에서 배운 그래프에 맞게 이 목록만 고치면 화면 전체에 반영돼요.
export const CHARTS = [
  { id: 'bar', ko: '막대 (bar)', short: '막대', tokens: ['bar'], desc: '그룹의 크기를 비교' },
  { id: 'line', ko: '선 (line)', short: '선', tokens: ['line'], desc: '연도·월처럼 순서가 있는 변화' },
  { id: 'hist', ko: '히스토그램 (hist)', short: '히스토그램', tokens: ['hist'], desc: '값이 어느 구간에 많은지(분포)' },
  { id: 'scatter', ko: '산점도 (scatter)', short: '산점도', tokens: ['scatter'], desc: '두 숫자가 함께 움직이는지' },
  { id: 'pie', ko: '원 (pie)', short: '원', tokens: ['pie'], desc: '전체 중 각 부분의 비율' },
]

export const KIND_LABEL = { number: '숫자', group: '묶는 열', text: '글자(값 많음)' }

// 결측값(NaN) 처리 3가지 (기획안 3-2 ④)
export const MISSING = [
  { id: 'keep', ko: '그대로 두기', guide: '결측값(NaN)이 적고(약 5% 이하) 분석 열이 아니면. groupby 평균은 결측값을 건너뛰어요.' },
  { id: 'drop', ko: '제거 (dropna)', guide: '분석에 쓰는 열인데 결측값이 있는 행을 빼도 괜찮으면. shape로 줄어든 행 수를 기록해요.' },
  { id: 'fill', ko: '대체 (fillna)', guide: '채울 근거가 있을 때만. 0이나 평균으로 성급히 채우지 않아요.' },
]

export const LIMITS = [
  '한 데이터의 표본이라 모든 대상에게 일반화하기 어렵다.',
  '평균만 비교해서 개인차를 알 수 없다.',
  '결측값(NaN)을 처리한 방법에 따라 결과가 달라질 수 있다.',
  '다른 요인을 함께 보지 못했다.',
  '인과관계는 알 수 없다.',
]
