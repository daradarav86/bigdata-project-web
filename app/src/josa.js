// 한글 받침에 맞춰 조사를 고른다: "방식을(를)" → "방식을", "상담을(를)" → "상담을", "분야이(가)" → "분야가"
// 영문·숫자 뒤는 받침을 알 수 없어 "을(를)"을 그대로 둔다.
const JOSA = { '을(를)': ['을', '를'], '이(가)': ['이', '가'], '은(는)': ['은', '는'], '와(과)': ['과', '와'], '으로(로)': ['으로', '로'] }
export function fixJosa(s) {
  return s.replace(/([가-힣])(을\(를\)|이\(가\)|은\(는\)|와\(과\)|으로\(로\))/g, (_, ch, j) => {
    const final = (ch.charCodeAt(0) - 0xac00) % 28
    const [withFinal, without] = JOSA[j]
    if (j === '으로(로)') return ch + (final === 0 || final === 8 ? without : withFinal) // ㄹ 받침은 "로"
    return ch + (final === 0 ? without : withFinal)
  })
}
