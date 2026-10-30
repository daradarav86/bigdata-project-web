// 서버 출력 검사(violates)가 기대대로 동작하는지 확인한다. 사용: node scripts/check-guard.mjs
import fs from 'node:fs'

const src = fs.readFileSync('supabase/functions/coach/index.ts', 'utf8')
const block = src.match(/const CODE_LINE[\s\S]*?\nfunction violates[\s\S]*?\n}\n/)[0]
  .replace('(text: string): boolean', '(text)')
  .replace('const blocks', 'const blocks')
  .replace(/\(m => \{ const lines/, '(m => { const lines')
// TypeScript 타입 표기 제거
const js = block.replace(/\(\s*m\s*\)/g, '(m)')
const violates = new Function(`${js}; return violates;`)()

const F = '```'
const cases = [
  ['빈칸 뼈대(허용)', `생각해 보세요.\n${F}\nresult = df_use.groupby("___")["___"].___()\n${F}`, false],
  ['완성 코드 블록(차단)', `${F}\nresult = df_use.groupby("age")["score"].mean()\n${F}`, true],
  ['7줄 블록(차단)', `${F}\n___\n1\n2\n3\n4\n5\n6\n${F}`, true],
  ['펜스 없는 완성 코드(차단)', '이렇게 하세요:\ndf_use.groupby("age")["score"].mean()', true],
  ['도구 이름만(허용)', '`groupby` 를 써 보세요. 무엇으로 묶고 싶나요?', false],
  ['펜스 없는 빈칸 줄(허용)', 'result = df_use.groupby("___")["___"].___()', false],
]
let bad = 0
for (const [name, text, expect] of cases) {
  const got = violates(text)
  if (got !== expect) bad++
  console.log(got === expect ? 'OK  ' : 'FAIL', name, '->', got)
}
process.exit(bad ? 1 : 0)
