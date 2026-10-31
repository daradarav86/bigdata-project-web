// 학생이 데이터마다 "묶는 기준"과 "계산할 열"을 기본 목록에서 고를 수 있는지, 선생님 추천 짝이 목록에 있는지 확인한다.
// 사용: node scripts/check-coverage.mjs
import fs from 'node:fs'

const data = JSON.parse(fs.readFileSync(new URL('../app/src/data/datasets.json', import.meta.url), 'utf8'))
const split = s => (s ?? '').split(',').map(x => x.trim()).filter(Boolean)
let issues = 0
console.log('데이터'.padEnd(14), '묶는열(기본) 숫자열 | 추천 묶는기준 → 목록에 있나 | 추천 계산열 → 목록에 있나 | 묶는열 값 개수')
for (const d of data) {
  const groups = d.columns.filter(c => c.kind === 'group')
  const nums = d.columns.filter(c => c.kind === 'number')
  const names = d.columns.map(c => c.name)
  const gNames = new Set(groups.map(c => c.name)), nNames = new Set(nums.map(c => c.name))
  const pg = split(d.pair?.groupBy), pm = split(d.pair?.measure)
  const pgReal = pg.filter(x => names.includes(x)), pmReal = pm.filter(x => names.includes(x))
  const pgIn = pgReal.filter(x => gNames.has(x)), pmIn = pmReal.filter(x => nNames.has(x))
  const problems = []
  if (!groups.length) problems.push('묶는 열 목록이 비어 있음')
  if (!nums.length) problems.push('숫자 열 목록이 비어 있음')
  if (pgReal.length && !pgIn.length) problems.push(`추천 묶는기준(${pgReal.join(',')})이 기본 목록에 없음`)
  if (pmReal.length && !pmIn.length) problems.push(`추천 계산열(${pmReal.join(',')})이 기본 목록에 없음`)
  if (!pgReal.length && d.pair) problems.push(`추천 묶는기준 "${d.pair.groupBy}"가 실제 열 이름이 아님`)
  if (!pmReal.length && d.pair) problems.push(`추천 계산열 "${d.pair.measure}"가 실제 열 이름이 아님`)
  const wide = groups.filter(c => c.unique > 7).length
  if (problems.length) issues++
  console.log((problems.length ? 'WARN ' : 'OK   ') + d.id.padEnd(13), String(groups.length).padStart(3), String(nums.length).padStart(5), '|', pgReal.join(',') || '-', pgIn.length ? 'O' : 'X', '|', pmReal.join(',') || '-', pmIn.length ? 'O' : 'X', '|', `값>7개인 묶는열 ${wide}/${groups.length}`)
  for (const p of problems) console.log('       └', p)
}
console.log(`\n주의가 필요한 데이터: ${issues}개`)
