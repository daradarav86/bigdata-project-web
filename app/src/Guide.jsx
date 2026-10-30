// 처음 쓰는 학생을 위한 사용법
export function HowTo() {
  const steps = [
    ['1', '기획: 단계를 따라 써요', '"기획" 탭에서 팀 소개 → 진로 → 데이터 → 질문 → 분석 계획 순서로 써요. 기획안 문서의 0~3번이에요.'],
    ['2', '코드: 막히면 힌트', '코드는 노트북에서 실행해요. 막히면 "코드" 탭에서 단계별 힌트와 오류 해독기를 써요.'],
    ['3', '발표: 슬라이드가 채워져요', '기획에 쓴 내용이 7장짜리 3분 발표 슬라이드에 자동으로 들어가요. 결과와 해석만 더 쓰면 돼요.'],
  ]
  return (
    <div className="howto">
      <ol>
        {steps.map(([n, t, d]) => <li key={n}><span className="num">{n}</span><div><b>{t}</b><p>{d}</p></div></li>)}
      </ol>
      <p className="rule"><b>코치가 하지 않는 일:</b> 완성된 코드나 기획안·해석 문장을 대신 써 주는 것. 우리가 스스로 만든 결과여야 의미가 있어요. 코치는 오른쪽에서 되묻기와 단서로 도와요.</p>
    </div>
  )
}

export function TabIntro({ children }) {
  return <p className="intro">{children}</p>
}
