// 데이터 확인 질문이 14개 데이터 모두에서 올바르게 만들어지는지 확인한다. 사용: node scripts/check-quiz.mjs
import fs from 'node:fs'
import { makeDataQuiz, quizState } from '../app/src/data/dataQuiz.js'

const data = JSON.parse(fs.readFileSync(new URL('../app/src/data/datasets.json', import.meta.url), 'utf8'))
let bad = 0
for (const ds of data) {
  const quiz = makeDataQuiz(ds)
  const again = makeDataQuiz(ds)
  const problems = []
  if (quiz.length !== 2) problems.push(`질문 ${quiz.length}개`)
  if (JSON.stringify(quiz) !== JSON.stringify(again)) problems.push('같은 데이터인데 질문이 달라짐')
  for (const q of quiz) {
    if (q.options.length < 3) problems.push(`${q.id}: 보기 ${q.options.length}개`)
    if (new Set(q.options).size !== q.options.length) problems.push(`${q.id}: 보기 중복`)
    if (q.options.filter(o => o === q.answer).length !== 1) problems.push(`${q.id}: 정답이 보기에 정확히 1개 아님`)
  }
  // 아무것도 안 했을 때 / 다 맞췄을 때 / 열어 보지 않고 맞췄을 때
  const ans = Object.fromEntries(quiz.map(q => [q.id, q.answer]))
  if (quizState(ds, undefined).passed) problems.push('아무것도 안 했는데 통과')
  if (quizState(ds, { viewed: true, ans }).passed !== true) problems.push('다 맞췄는데 통과 못함')
  if (quizState(ds, { viewed: false, ans }).passed) problems.push('열어 보지 않았는데 통과')
  if (quizState(ds, { viewed: true, ans: { ...ans, [quiz[0].id]: '틀린 값' } }).passed) problems.push('하나 틀렸는데 통과')
  if (problems.length) bad++
  console.log((problems.length ? 'FAIL ' : 'OK   ') + ds.id.padEnd(14), quiz.map(q => q.id).join(' + '), problems.join(' | '))
}
console.log(bad ? `\n실패 ${bad}개` : '\n14개 데이터 모두 통과')
process.exit(bad ? 1 : 0)
