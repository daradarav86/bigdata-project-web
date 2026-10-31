// 한글 받침에 맞춰 조사를 고른다: "방식을(를)" → "방식을", "상담을(를)" → "상담을", "분야이(가)" → "분야가"
// 영문·숫자 뒤는 받침을 알 수 없어 "을(를)"을 그대로 둔다.
const JOSA = { '을(를)': ['을', '를'], '이(가)': ['이', '가'], '은(는)': ['은', '는'], '와(과)': ['과', '와'], '으로(로)': ['으로', '로'] }
// 숫자를 읽었을 때 받침이 있는지 (영·일·삼·육·칠·팔은 있다), ㄹ 받침인지 (일·칠·팔)
const DIGIT_FINAL = { 0: 21, 1: 8, 2: 0, 3: 16, 4: 0, 5: 0, 6: 1, 7: 8, 8: 8, 9: 0 }
// 학생이 쓴 단어 뒤에 붙일 조사 하나를 고른다: josa('구간 3', '이(가)') → '이', josa('상담', '을(를)') → '을'
// 한글·숫자로 끝나면 받침으로 고르고, 영문 등 받침을 알 수 없으면 "이(가)"처럼 둘 다 둔다.
export function josa(word, pair) {
  const ch = String(word ?? '').trim().slice(-1)
  let final
  if (/[가-힣]/.test(ch)) final = (ch.charCodeAt(0) - 0xac00) % 28
  else if (/\d/.test(ch)) final = DIGIT_FINAL[ch]
  else return pair
  const [withFinal, without] = JOSA[pair]
  if (pair === '으로(로)') return final === 0 || final === 8 ? without : withFinal // ㄹ 받침은 "로"
  return final === 0 ? without : withFinal
}

export function fixJosa(s) {
  return s.replace(/([가-힣])(을\(를\)|이\(가\)|은\(는\)|와\(과\)|으로\(로\))/g, (_, ch, j) => {
    const final = (ch.charCodeAt(0) - 0xac00) % 28
    const [withFinal, without] = JOSA[j]
    if (j === '으로(로)') return ch + (final === 0 || final === 8 ? without : withFinal) // ㄹ 받침은 "로"
    return ch + (final === 0 ? without : withFinal)
  })
}
