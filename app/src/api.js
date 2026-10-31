import { mockReply } from './coach.js'
import { SERVER, post, spendLocal } from './backend.js'

// 서버(Supabase Edge Function)가 연결되면 그쪽으로, 아니면 데모 응답을 돌려준다.
// token: 팀으로 들어갈 때 받은 토큰. 서버는 이것으로 팀을 확인하고 코인을 센다 (팀 이름을 믿지 않는다).
// context: 학생이 지금까지 정한 것 { keyword, dataset, groupBy, measure, question }. 서버는 이를 "학생이 쓴 자료"로만 취급한다.
// 대화 기록(history)은 서버가 직접 보관한 것을 쓰므로 보내지 않는다 (가짜 코치 발언 주입 방지).
export async function askCoach({ mode, token, context, message }) {
  if (!SERVER) {
    const remaining = await spendLocal(token)
    await new Promise(r => setTimeout(r, 500))
    return { reply: mockReply({ mode, message, context }), remaining, demo: true }
  }
  return post('coach', { mode, token, context, message })
}
