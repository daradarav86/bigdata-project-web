// 발표 탭(Deck)과 코드 탭의 결과 정리(Results)가 함께 쓰는 것: 입력칸 정의, 그래프 이미지 줄이기

// 입력칸 정의: 키 → [라벨, 힌트, 줄 수]
export const FIELD = {
  know: ['이 진로에서 알아야 하는 것', '예) 학생의 공부 방법별 성적'],
  wonder: ['그래서 궁금했던 것', '비워 두면 "진로 장면"의 ①이 들어가요'],
  cnt: ['값의 개수 (count)', '노트북 describe() 결과'],
  mean: ['평균', ''],
  median: ['중앙값', ''],
  pick: ['요약에 쓸 것', '평균 / 중앙값 중 하나'],
  hi: ['가장 큰 그룹', '예) 구간 3'],
  hiVal: ['그 값', '예) 13.36점'],
  lo: ['가장 작은 그룹', ''],
  loVal: ['그 값', ''],
  diffPts: ['차이 (큰 값 − 작은 값)', '숫자만, 예) 2.5'],
  diffX: ['몇 배', '예) 1.23'],
  resultTable: ['4-2. 그룹별 통계 결과표', '노트북에서 print(result) 결과를 복사해 붙여 넣어요'],
  expectCheck: ['예상(1-4)과 같았나요? 놀라운 점은?', '예) 예상대로 구간 3까지는 올랐지만, 구간 4는 오히려 조금 낮았다'],
  m1: ['③ 함께 움직이는 것 (앞)', '비워 두면 묶는 기준이 들어가요'],
  m2: ['③ 함께 움직이는 것 (뒤)', '비워 두면 계산할 열이 들어가요'],
  limit: ['한계: 일반화하기 어려운 이유', '아래 후보를 눌러 가져올 수 있어요'],
  orig: ['결측값(NaN) 처리 비교: 원본 평균', ''],
  rem: ['제거했을 때 평균', ''],
  remRows: ['제거 후 행 수', ''],
  rep: ['대체했을 때 평균', ''],
  job: ['직업', '비워 두면 진로 키워드가 들어가요'],
  doing: ['그 직업이 하는 일', ''],
  use: ['이 결과를 어떻게 참고할 수 있나', ''],
  careful: ['함께 확인해야 할 것', ''],
  next: ['다음에 알고 싶은 것', ''],
  closing: ['마무리 한 문장', '팀원이 함께 말해요'],
  q1: ['예상 질문 1', '예) 구간 4가 왜 구간 3보다 낮나요?'],
  a1: ['우리의 답 1', '모르면 "이 데이터로는 알 수 없어요"라고 말해도 좋아요'],
  q2: ['예상 질문 2', ''],
  a2: ['우리의 답 2', ''],
}

// 그래프 이미지를 줄여서 저장한다 (브라우저 저장 용량 보호)
export function shrink(file, max = 1000) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const k = Math.min(1, max / img.width)
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('이미지를 읽지 못했어요.')) }
    img.src = url
  })
}
