// 고정 힌트. project_template.ipynb의 미션 0~4·해석 쓰기와 같은 용어·변수명(df, df_use, result)·따옴표 스타일을 쓴다.
// 단계: 1 생각할 질문 → 2 필요한 도구 → 3 빈칸 뼈대. 정답 코드는 어디에도 없다.
export const TOPICS = [
  {
    id: 'explore', name: '미션 1 · 구조 확인',
    asks: ['한 행은 무엇을 뜻하나요? (예: 학생 1명, 영화 1편)', '우리가 쓸 열 3~4개는 무엇이고, 숫자 열인가요 글자 열인가요?', '값이 비어 있는 열이 있나요?'],
    tools: ['df.shape : (행 수, 열 수)', 'df.columns : 열 이름 (복사해서 쓰면 오타가 없어요)', 'df.info() : 자료형(Dtype)과 비어 있지 않은 값의 개수. int·float는 숫자, object는 글자', 'df.head() : 앞부분 훑어보기'],
    skeleton: 'print(df.___)      # (행 수, 열 수)\nprint(df.___)      # 열 이름\ndf.___()           # 자료형과 비어 있지 않은 값의 개수',
  },
  {
    id: 'missing', name: '미션 2 · 빈칸(결측치)',
    asks: ['빈칸은 어느 열에 몇 개 있고, 전체의 몇 %쯤인가요?', '그대로 둘지, 제거할지, 채울지 — 세 가지 중 무엇이 우리 질문에 맞고 이유는 무엇인가요?', '제거하면 행이 얼마나 줄어드나요?'],
    tools: ['df.isnull().sum() : 열별 빈칸 개수', 'df.dropna() : 빈칸이 있는 행을 모두 제거한 표. 원본 df는 그대로예요', 'df.copy() : 그대로 두고 복사본 쓰기', 'fillna() : 채우기. 0이나 평균으로 성급히 채우지 말고 근거가 있을 때만'],
    skeleton: 'print(df.___().sum())      # 열별 빈칸 개수\ndf_removed = df.___()       # 빈칸 행 제거\nprint("원본", df.shape, "→ 제거 후", df_removed.___)\ndf_use = ___                # 분석에 쓸 표: df.copy() 또는 df_removed',
  },
  {
    id: 'groupby', name: '미션 3 · 그룹별 분석',
    asks: ['무엇을 기준으로 묶고, 어떤 열의 무엇(평균 등)을 구하고 싶나요?', '묶는 기준에 그룹이 몇 개이고 각 그룹에 몇 명씩 있나요?', '계산할 열은 숫자(int·float)인가요?'],
    tools: ['df_use["열"].value_counts() : 그룹이 몇 개, 각각 몇 명인지', 'df_use.dtypes : 계산할 열이 숫자인지', 'df_use.groupby("묶는 기준")["계산할 열"].mean() : 묶는 기준 → 계산할 열 → 통계. mean · median · max · min · count 중에서 골라요', 'df_use["열"].value_counts() : 숫자 열 없이 그룹마다 개수(빈도)만 셀 때'],
    skeleton: 'print(df_use["___"].value_counts())   # 그룹 수와 인원\nresult = df_use.groupby("___")["___"].___()\ndisplay(result)',
  },
  {
    id: 'newcol', name: '새 열 만들기 (선택)',
    asks: ['기존 열 중 무엇과 무엇을 계산하면 내 질문에 더 잘 맞는 값이 될까요?', '그 계산은 행마다 하나씩 값이 나오나요?', '추천 짝 표의 "새 열 아이디어"가 우리 데이터에 있나요?'],
    tools: ['df_use["새열"] = df_use["열1"] * df_use["열2"] : 열끼리 계산해서 새 열 만들기', '만든 뒤 df_use.head() 로 새 열이 생겼는지 확인'],
    skeleton: 'df_use["새열"] = df_use["___"] ___ df_use["___"]\ndisplay(df_use.head())',
  },
  {
    id: 'plot', name: '미션 4 · 그래프',
    asks: ['보여 주고 싶은 것은 그룹 비교(막대)인가요, 변화(선)인가요?', '막대가 너무 많아 읽기 어렵지는 않나요?', '제목과 축 이름만 봐도 무엇을 비교한 그래프인지 알 수 있나요?'],
    tools: ['result.plot(kind="bar") : 막대 / kind="line" : 선 / kind="hist" : 히스토그램 / kind="pie" : 원', 'plt.title / plt.xlabel / plt.ylabel : 이름 붙이기. Colab에서는 한글이 깨질 수 있어 영어로 써요', 'result.head(10) : 앞 10개만 그리기', 'plt.show() : 그래프 보이기'],
    skeleton: 'result.plot(kind="___")\nplt.title("___")     # 영어로. 예: Mean score by study time\nplt.xlabel("___")    # 묶는 기준\nplt.ylabel("___")    # 계산한 값\nplt.show()',
  },
  {
    id: 'interpret', name: '해석 쓰기',
    asks: ['어느 그룹이 가장 높고 가장 낮았나요? 값은 얼마인가요?', '두 집단의 차이는 몇 점(또는 몇 배)인가요?', '이 결과가 "함께 움직이는 경향"을 말해 주나요, 아니면 원인을 말해 주나요?', '이 결과를 모든 대상에게 일반화하기 어려운 이유는 무엇인가요?'],
    tools: ['result.idxmax() / result.idxmin() : 가장 큰·작은 그룹의 이름', 'result.max() / result.min() : 가장 큰·작은 값', '틀: ① 사실 → ② 비교 → ③ 의미 → 한계'],
    skeleton: '① 사실: ___별 ___의 평균은 ___이(가) 가장 높고(___), ___이(가) 가장 낮았다(___).\n② 비교: 두 집단의 차이는 ___로, ___배(또는 ___점) 정도였다.\n③ 의미: 이는 ___ 와(과) ___ 가 함께 움직이는 경향이 있음을 보여 준다. (원인이라고 단정하지 않기)\n한계: 다만 ___ 때문에 일반화하기 어렵다.',
  },
]

// 용어 풀이: 수업·노트북에서 쓰는 말만 쉽게 풀어 쓴다
export const TERMS = [
  ['행 / 열', '표에서 가로줄이 행(기록 1건), 세로줄이 열(항목)이에요.'],
  ['결측치 (빈칸)', '값이 비어 있는 칸이에요. isnull().sum() 으로 열별 개수를 세요.'],
  ['숫자 열 / 묶는 열', '평균을 구할 수 있는 열(키, 점수)과, 집단을 나누는 기준 열(성별, 학년)이에요.'],
  ['Dtype', 'info()에 나오는 열의 종류예요. int·float는 숫자, object는 글자예요.'],
  ['groupby', '"무엇으로 묶을지" 정하고 그 집단별로 평균 등을 구하는 기능이에요.'],
  ['result', '노트북에서 groupby 결과를 담아 두는 변수 이름이에요. 그래프도 이걸로 그려요.'],
  ['한계', '이 결과를 모든 대상에게 그대로 말할 수 없는 이유예요. (표본 수, 평균만 봤다는 점 등)'],
]

// 증상으로 찾기 (노트북 "막히면?" 표 + 자주 하는 막힘)
export const SYMPTOMS = [
  { q: '결과가 NaN이거나 비어 있어요', a: ['계산할 열이 숫자 열인지 df_use.dtypes 로 확인', '그 열에 빈칸이 너무 많지 않은지 df.isnull().sum() 으로 확인'] },
  { q: '그래프가 안 그려져요', a: ['계산할 열이 숫자인지 확인', 'result 가 만들어졌는지 확인 (위 셀부터 순서대로 실행)'] },
  { q: '막대가 너무 많아요', a: ['result.head(10) 으로 앞 10개만 그려 보기'] },
  { q: '셀을 지웠더니 오류가 나요', a: ['"모두 실행"이 아니라 위에서부터 한 칸씩 다시 실행해요', '변수(df, df_use, result)를 만드는 셀이 실행됐는지 확인'] },
  { q: '열 이름이 길어서 자꾸 틀려요', a: ['print(df.columns) 로 출력한 뒤 복사해서 붙여 넣기', '이름 끝의 공백까지 같은지 확인'] },
]

// 오류 해독기: 메시지 속 키워드로 찾는다. 구체적인 것을 앞에 둔다 (위에서부터 첫 일치를 사용).
export const ERRORS = [
  { key: /could not convert string to float/, name: 'ValueError: 문자를 숫자로 바꿀 수 없음', meaning: '숫자 계산(평균 등)에 글자 열이 섞였어요.', check: ['평균을 구하는 열이 숫자 열인지 df_use.dtypes 로 확인', '숫자 열에 "N/A" 같은 글자가 섞여 있는지'] },
  { key: /KeyError/, name: 'KeyError', meaning: '없는 열 이름을 불렀어요. 대개 열 이름 오타예요.', check: ['print(df.columns) 에서 복사해 붙여 넣기', '대소문자·띄어쓰기·끝 공백 확인', '따옴표를 빼먹지 않았는지 ("열" 처럼)'] },
  { key: /NameError/, name: 'NameError', meaning: '아직 만들지 않은 이름을 썼어요.', check: ['변수 이름 철자 (df, df_use, result)', '그 변수를 만드는 셀을 먼저 실행했는지', 'import pandas as pd 셀을 실행했는지'] },
  { key: /AttributeError/, name: 'AttributeError', meaning: '그 대상에 없는 기능을 불렀어요.', check: ['함수 이름 철자 (isnull, dropna, groupby …)', '표(df)에 쓸 함수를 열(df["열"])에 쓴 건 아닌지', 'isnull() 처럼 괄호가 필요한 곳에 빠지지 않았는지'] },
  { key: /IndentationError/, name: 'IndentationError', meaning: '들여쓰기가 맞지 않아요.', check: ['줄 맨 앞의 공백 칸 수', '탭과 공백이 섞이지 않았는지'] },
  { key: /SyntaxError/, name: 'SyntaxError', meaning: '파이썬 문법이 맞지 않아요.', check: ['괄호·따옴표가 짝이 맞는지', '___ 빈칸을 채우지 않고 실행한 건 아닌지', '표시된 줄의 바로 윗줄도 확인'] },
  { key: /TypeError/, name: 'TypeError', meaning: '맞지 않는 종류끼리 계산했거나 함수를 잘못 불렀어요.', check: ['글자 열과 숫자를 계산하려는 건 아닌지 (df.info() 의 Dtype 확인)', 'groupby 다음에 [] 와 () 를 바꿔 쓰지 않았는지'] },
  { key: /ValueError/, name: 'ValueError', meaning: '값의 모양이나 내용이 맞지 않아요.', check: ['숫자로 바꿀 수 없는 글자가 섞여 있는지', '결측치가 계산을 막고 있는지 (isnull().sum())'] },
  { key: /FileNotFoundError|No such file|HTTPError|URLError/, name: '파일/주소 오류', meaning: '데이터 파일을 불러오지 못했어요.', check: ['url 의 파일 이름(예: students.csv)과 철자', '인터넷 연결', '따옴표 안의 주소가 잘리지 않았는지'] },
  { key: /ModuleNotFoundError|No module named/, name: 'ModuleNotFoundError', meaning: '불러오려는 도구가 없어요.', check: ['import pandas as pd / import matplotlib.pyplot as plt 철자', '미션 0 셀을 실행했는지'] },
]
