import { mockReply } from './coach.js'

const URL = import.meta.env.VITE_COACH_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// 서버(Supabase Edge Function)가 연결되면 그쪽으로, 아니면 데모 응답을 돌려준다.
// context: 학생이 지금까지 정한 것 { keyword, dataset, groupBy, measure, question }. 서버는 이를 "학생이 쓴 자료"로만 취급한다.
// 대화 기록(history)은 서버가 직접 보관한 것을 쓰므로 보내지 않는다 (가짜 코치 발언 주입 방지).
export async function askCoach({ mode, team, context, message }) {
  if (!URL) {
    await new Promise(r => setTimeout(r, 500))
    return { reply: mockReply({ mode, message, context }), demo: true }
  }
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ mode, team, context, message }),
  })
  if (res.status === 429) throw new Error('오늘 AI 질문을 모두 썼어요. 내일 다시 쓸 수 있어요.')
  if (!res.ok) throw new Error('답을 가져오지 못했어요. 잠시 뒤 다시 해 보세요.')
  return res.json()
}
