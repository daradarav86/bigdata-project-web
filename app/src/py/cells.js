import { ERRORS } from '../data/hints.js'
import { isFreq } from '../doc.js'

const RAW = 'https://raw.githubusercontent.com/daradarav86/bigdata/main/data/'

// 그래프 종류별 전용 코드 틀 (14개 데이터에서 실제로 실행되는지 확인한 형태)
function plotCell(g) {
  const labels = 'plt.title("___")        # 영어로. 예: Mean score by study time\nplt.xlabel("___")       # 묶는 기준\nplt.ylabel("___")       # 계산한 값\nplt.show()'
  switch (g.chart) {
    case 'hist': return 'df_use["___"].plot(kind="hist")   # 숫자 열 하나의 분포\n' + labels
    case 'scatter': return 'df_use.plot(kind="scatter", x="___", y="___")   # 숫자 열 두 개\n' + labels
    case 'pie': return 'result.plot(kind="pie")   # 전체 중 각 부분의 몫 (개수·합계에 어울려요)\nplt.title("___")\nplt.show()'
    case 'etc': return 'result.plot(kind="___")\n' + labels
    default: return 'result.plot(kind="' + (g.chart === 'line' ? 'line' : 'bar') + '")\n' + labels
  }
}

// 분석 칸: 기획에서 직접 설계한 코드(3-3)가 있으면 그것으로 시작한다. 없으면 빈칸 틀.
function analysisCell(g) {
  if (g.codeDesign.trim()) {
    return '# 기획안 3-3에서 우리 팀이 설계한 코드예요. 바로 실행해 보세요.\n' + g.codeDesign.trim() + '\ndisplay(result)'
  }
  const stat = g.stat === 'etc' ? (g.statEtc.trim() || '___') : g.stat
  if (isFreq(g)) return 'result = df_use["___"].value_counts()    # 그룹마다 몇 개인지\ndisplay(result)'
  return 'result = df_use.groupby("___")["___"].' + stat + '()    # 묶는 기준 → 계산할 열 → 통계\ndisplay(result)'
}

// 노트북(project_template.ipynb)의 미션 순서를 그대로 따른다.
export function cellsFor(g) {
  return [
    { id: 'm0', title: '미션 0. 불러오기', help: '파일 이름만 우리 팀 데이터로 바꿔요. (이미 우리 팀 데이터로 채워 뒀어요)',
      code: 'import pandas as pd\nimport matplotlib.pyplot as plt\n\nurl = "' + RAW + (g.dataset || 'students') + '.csv"\ndf = pd.read_csv(url)\ndisplay(df.head())' },
    { id: 'm1', title: '미션 1. 데이터 구조 확인', help: '한 행의 뜻, 쓸 열의 종류(Dtype)를 확인해요. 기획안 2번에 적은 내용과 같은지 봐요.',
      code: 'print(df.shape)       # (행 수, 열 수)\nprint(df.columns)     # 열 이름 (복사해서 쓰면 오타가 없어요)\ndf.info()             # 자료형과 비어 있지 않은 값의 개수' },
    { id: 'm2', title: '미션 2. 빈칸(결측치) 확인과 처리', help: '기획안 3-2 ④에서 정한 방법(그대로 / 제거 / 대체)과 이유를 확인해요.',
      code: 'print(df.isnull().sum())      # 열별 빈칸 개수\n\ndf_removed = df.dropna()      # 빈칸이 있는 행을 모두 제거한 표 (원본 df는 그대로)\nprint("원본", df.shape, "→ 제거 후", df_removed.shape)\n\ndf_use = df.copy()    # ← 분석에 쓸 표: df.copy()(그대로) / df_removed(제거) 중 선택\n# 선택한 방법과 이유: ___' },
    { id: 'm3a', title: '미션 3-1. 그룹 점검', help: '묶는 기준에 그룹이 몇 개인지, 계산할 열이 숫자인지 확인해요.',
      code: 'print(df_use["___"].value_counts())   # 그룹이 몇 개, 각각 몇 명인가?\nprint(df_use.dtypes)                   # 계산할 열이 int·float(숫자)인가?' },
    { id: 'm3b', title: '미션 3-2. 그룹별 분석', help: '기획에서 정한 묶는 기준·계산할 것·통계로 result를 만들어요. 새 열이 필요하면 먼저 df_use["새열"] = … 를 써요.',
      code: analysisCell(g) },
    { id: 'm4', title: '미션 4. 그래프', help: '제목과 축 이름은 영어로 써요 (그래프에 한글 글꼴이 없어요).',
      code: plotCell(g) },
    { id: 'm5', title: '결과 읽기', help: '가장 큰 그룹, 가장 작은 그룹, 차이를 숫자로 읽어요. 이 값으로 해석(① 사실 ② 비교 ③ 의미)을 써요.',
      code: 'print("가장 큰 그룹:", result.idxmax(), round(result.max(), 2))\nprint("가장 작은 그룹:", result.idxmin(), round(result.min(), 2))\nprint("차이:", round(result.max() - result.min(), 2))' },
  ]
}

// 주석(#) 밖에 남아 있는 빈칸(___)의 줄 번호. 문자열 안의 #는 주석이 아니다.
export function blankLines(code) {
  const lines = []
  code.split('\n').forEach((line, i) => {
    let q = null, cut = line.length
    for (let k = 0; k < line.length; k++) {
      const c = line[k]
      if (q) { if (c === q) q = null } else if (c === '"' || c === "'") q = c
      else if (c === '#') { cut = k; break }
    }
    if (line.slice(0, cut).includes('___')) lines.push(i + 1)
  })
  return lines
}

// 파이썬 오류를 학생이 이해하기 쉬운 말로 바꾼다 (오류 해독기와 같은 표를 쓴다)
export function explain(err, code) {
  const text = err.type + ': ' + err.msg
  const hit = ERRORS.find(e => e.key.test(text))
  const src = err.line ? code.split('\n')[err.line - 1] : ''
  return { hit, line: err.line, src: src ? src.trim() : '', text }
}
