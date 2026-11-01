// 고정 힌트. 패들렛 "차시별 필수 도구"(12~17차시)의 순서를 따르고, 노트북과 같은 변수명(df, df_use, df_removed, df_filled, result)·따옴표 스타일을 쓴다.
// 단계: 1 생각할 질문 → 2 필요한 도구 → 3 빈칸 뼈대. 정답 코드는 어디에도 없다.
export const TOPICS = [
  {
    id: 'explore', name: '[12차시] 구조 확인',
    asks: ['한 행은 무엇을 뜻하나요? (예: 학생 1명, 영화 1편)', '우리가 쓸 열 3~4개는 무엇이고, 숫자 열인가요 글자 열인가요?', '값이 비어 있는 열이 있나요?'],
    tools: ['df.shape : (행 수, 열 수)', 'df.columns : 열 이름 (복사해서 쓰면 오타가 없어요)', 'df.info() : 자료형(Dtype)과 비어 있지 않은 값의 개수. int·float는 숫자, object는 글자', 'df.head() : 앞부분 훑어보기'],
    skeleton: 'print(df.___)      # (행 수, 열 수)\nprint(df.___)      # 열 이름\ndf.___()           # 자료형과 비어 있지 않은 값의 개수',
  },
  {
    id: 'stats', name: '[13차시] 통계 요약',
    asks: ['계산할 숫자 열의 평균과 중앙값은 비슷한가요, 많이 다른가요? 다르다면 왜일까요?', 'describe()의 count가 shape의 행 수보다 작다면 무엇 때문일까요?', '묶는 기준 열에는 어떤 값이 몇 개씩 있나요?'],
    tools: ['df["열"].describe() : count·mean·std·min·max·사분위수를 한 번에', 'df["열"].mean() / median() / max() / min() / count() : 하나씩 구하기', 'df["열"].value_counts() : 글자·구간 열의 값별 개수'],
    skeleton: 'print(df["___"].describe())\nprint("평균", df["___"].___(), "중앙값", df["___"].___())\nprint(df["___"].value_counts())',
  },
  {
    id: 'missing', name: '[14차시] 결측값 확인·제거·대체',
    asks: ['결측값(NaN)은 어느 열에 몇 개 있고, 전체의 몇 %쯤인가요?', '제거(dropna)한 표와 대체(fillna)한 표를 따로 만들면, 행 수와 평균이 각각 어떻게 달라지나요?', '두 결과를 비교해 보니 우리 질문에는 어느 쪽(또는 그대로 두기)이 맞고, 이유는 무엇인가요?'],
    tools: ['df.isnull().sum() : 열별 결측값(NaN) 개수', 'df_removed = df.dropna() : 제거한 표를 새 변수에. 원본 df는 그대로예요', 'df_filled = df.copy() 다음 df_filled["열"] = df_filled["열"].fillna(값) : 대체한 표를 새 변수에. 이상값이 있으면 평균보다 중앙값', 'df_removed.shape, df_filled["열"].mean() : 두 표의 행 수·평균 비교'],
    skeleton: 'print(df.___().sum())      # 열별 결측값(NaN) 개수\ndf_removed = df.___()       # 제거한 표\ndf_filled = df.copy()\ndf_filled["___"] = df_filled["___"].fillna(df["___"].___())   # 대체한 표\nprint("원본", df.shape, "→ 제거 후", df_removed.___)\nprint("제거 평균", df_removed["___"].mean(), "/ 대체 평균", df_filled["___"].mean())',
  },
  {
    id: 'newcol', name: '[15차시] 새 열 만들기',
    asks: ['기존 열 중 무엇과 무엇을 계산하면 내 질문에 더 잘 맞는 값이 될까요?', '그 계산은 행마다 하나씩 값이 나오나요?', '추천 짝 표의 "새 열 아이디어"가 우리 데이터에 있나요?'],
    tools: ['df_use["새열"] = df_use["열1"] * df_use["열2"] : 열끼리 계산해서 새 열 만들기', '만든 뒤 df_use.head() 로 새 열이 생겼는지 확인'],
    skeleton: 'df_use["새열"] = df_use["___"] ___ df_use["___"]\ndisplay(df_use.head())',
  },
  {
    id: 'groupby', name: '[15차시] 그룹별 분석',
    asks: ['무엇을 기준으로 묶고, 어떤 열의 무엇(합계·평균·개수)을 구하고 싶나요?', '그룹마다 몇 명씩 있나요? 그룹 크기가 많이 다르면 합계보다 평균이 공정해요', '계산할 열은 숫자(int·float)인가요?'],
    tools: ['df_use["열"].value_counts() : 그룹이 몇 개, 각각 몇 명인지', 'df_use.groupby("묶는 기준")["계산할 열"].sum() / mean() / count() : 세 가지를 모두 구해서 비교해 봐요', 'df_use.dtypes : 계산할 열이 숫자인지'],
    skeleton: 'print(df_use["___"].value_counts())   # 그룹 수와 인원\nprint(df_use.groupby("___")["___"].sum())\nprint(df_use.groupby("___")["___"].count())\nresult = df_use.groupby("___")["___"].___()',
  },
  {
    id: 'func', name: '[14·15차시] 함수로 만들기',
    asks: ['여러 번 반복하는 코드가 있나요? (예: 결측값 개수 세기, 그룹별 평균 구하기)', '함수에 넘겨줄 값(매개변수)은 무엇인가요? (예: 표, 묶는 기준 열 이름)', '함수가 돌려줄 값(return)은 무엇인가요?'],
    tools: ['def 함수이름(매개변수): … return 값 : 함수 만들기 (이름은 get_ / count_ 처럼 영어로)', '만든 함수를 다른 기준 열로도 다시 불러 보기 (같은 코드를 반복해서 쓰지 않아도 돼요)'],
    skeleton: 'def ___(data, col):\n    result = data.groupby(___)["___"].mean()\n    return ___\n\nprint(___(df_use, "___"))   # 다른 기준 열로도 불러 보기',
  },
  {
    id: 'plot', name: '[16차시] 그래프',
    asks: ['보여 주고 싶은 것은 그룹 비교(막대)인가요, 변화(선)인가요?', '막대가 너무 많아 읽기 어렵지는 않나요?', '제목과 축 이름만 봐도 무엇을 비교한 그래프인지 알 수 있나요?'],
    // 16차시 노트북과 같은 모양: plt.bar / plt.plot(result.index, result.values), 한글은 koreanize_matplotlib
    tools: ['plt.bar(result.index, result.values) : 막대 (x축은 result.index, y축은 result.values. 괄호를 붙이지 않아요)', 'plt.plot(result.index, result.values) : 선 (연도·월처럼 순서가 있을 때)', 'plt.title / plt.xlabel / plt.ylabel : 제목과 축 이름 붙이기. 한글은 노트북 맨 위 koreanize_matplotlib를 실행해야 깨지지 않아요', 'result.head(10) : 막대가 너무 많을 때 앞 10개만', 'plt.show() : 그래프 보이기'],
    skeleton: 'plt.___(result.______, result.______)\nplt.title("___")     # 예: 공부 시간 구간별 G3 평균\nplt.xlabel("___")    # 묶는 기준\nplt.ylabel("___")    # 계산한 값\nplt.show()',
  },
  {
    id: 'interpret', name: '[17차시] 해석 쓰기',
    asks: ['어느 그룹이 가장 높고 가장 낮았나요? 값은 얼마인가요?', '두 집단의 차이는 몇 점(또는 몇 배)인가요?', '이 결과가 "함께 움직이는 경향"을 말해 주나요, 아니면 원인을 말해 주나요?', '이 결과를 모든 대상에게 일반화하기 어려운 이유는 무엇인가요?'],
    tools: ['result.idxmax() / result.idxmin() : 가장 큰·작은 그룹의 이름', 'result.max() / result.min() : 가장 큰·작은 값', '틀: ① 사실 → ② 비교 → ③ 의미 → 한계'],
    skeleton: '① 사실: ___별 ___의 평균은 ___이(가) 가장 높고(___), ___이(가) 가장 낮았다(___).\n② 비교: 두 집단의 차이는 ___로, ___배(또는 ___점) 정도였다.\n③ 의미: 이는 ___ 와(과) ___ 가 함께 움직이는 경향이 있음을 보여 준다. (원인이라고 단정하지 않기)\n한계: 다만 ___ 때문에 일반화하기 어렵다.',
  },
]

// 용어 풀이: 수업·노트북에서 쓰는 말만 쉽게 풀어 쓴다
export const TERMS = [
  ['행 / 열', '표에서 가로줄이 행(기록 1건), 세로줄이 열(항목)이에요.'],
  ['결측값 (NaN)', '값이 비어 있어서 NaN으로 보이는 칸이에요. isnull().sum() 으로 열별 개수를 세요.'],
  ['숫자 열 / 묶는 열', '평균을 구할 수 있는 열(키, 점수)과, 집단을 나누는 기준 열(성별, 학년)이에요.'],
  ['Dtype', 'info()에 나오는 열의 종류예요. int·float는 숫자, object는 글자예요.'],
  ['groupby', '"무엇으로 묶을지" 정하고 그 집단별로 평균 등을 구하는 기능이에요.'],
  ['result', '노트북에서 groupby 결과를 담아 두는 변수 이름이에요. 그래프도 이걸로 그려요.'],
  ['한계', '이 결과를 모든 대상에게 그대로 말할 수 없는 이유예요. (표본 수, 평균만 봤다는 점 등)'],
]

// 증상으로 찾기 (노트북 "막히면?" 표 + 자주 하는 막힘)
export const SYMPTOMS = [
  { q: '결과가 NaN이거나 비어 있어요', a: ['계산할 열이 숫자 열인지 df_use.dtypes 로 확인', '그 열에 결측값(NaN)이 너무 많지 않은지 df.isnull().sum() 으로 확인'] },
  { q: '그래프가 안 그려져요', a: ['계산할 열이 숫자인지 확인', 'result 가 만들어졌는지 확인 (위 셀부터 순서대로 실행)', 'import matplotlib.pyplot as plt 를 실행했는지 확인'] },
  { q: '그래프의 한글이 □로 깨져요', a: ['노트북 맨 위에서 !pip install -q koreanize-matplotlib 와 import koreanize_matplotlib 를 실행', '그래도 깨지면 [런타임 → 세션 다시 시작] 후 처음부터 다시 실행', '급하면 제목·축 이름을 영어로 써요'] },
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
