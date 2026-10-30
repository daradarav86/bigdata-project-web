// CSV 폴더 + README·추천표(project_template.ipynb)를 읽어 "데이터 명함" JSON을 만든다.
// 사용: node scripts/profile-data.mjs <bigdata 저장소 경로> <출력.json>
// 학습지·노트북과 같은 문구를 쓰기 위해 열 정보만 계산하고, 분야·진로·추천 짝은 저장소 문서에서 그대로 가져온다.
import fs from 'node:fs'
import path from 'node:path'

const [repo = '../bigdata', out = 'app/src/data/datasets.json'] = process.argv.slice(2)
const dir = path.join(repo, 'data')

function parseCsv(text) {
  const rows = []
  let row = [], cell = '', q = false
  text = text.replace(/^﻿/, '')
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') q = false
      else cell += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = '' }
    else cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows.filter(r => r.length > 1 || r[0] !== '')
}

const cells = line => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(s => s.trim())
const strip = s => s.replace(/`/g, '').trim()
const list = s => s.split(',').map(x => strip(x)).filter(Boolean)

// README: 분야 표(5칸)와 전처리 표(3칸)
const readme = fs.readFileSync(path.join(repo, 'README.md'), 'utf8').split('\n').filter(l => l.startsWith('|'))
const info = {}
for (const l of readme) {
  const c = cells(l)
  const m = c[1]?.match(/^`?([\w]+)\.csv`?$/)
  if (c.length === 5 && m) info[m[1]] = { ...info[m[1]], field: c[0], desc: c[2], careers: list(c[4]) }
  const m0 = strip(c[0] ?? '').match(/^([\w]+)\.csv$/)
  if (c.length === 3 && m0) info[m0[1]] = { ...info[m0[1]], prep: c[1], example: c[2] }
}

// project_template.ipynb: 추천 짝 표
const nb = JSON.parse(fs.readFileSync(path.join(repo, 'notebooks', 'project_template.ipynb'), 'utf8'))
const tpl = nb.cells.map(c => (Array.isArray(c.source) ? c.source.join('') : c.source)).find(s => s.includes('추천 짝'))
const pairs = {}
for (const l of tpl.split('\n').filter(l => l.startsWith('|'))) {
  const c = cells(l)
  if (c.length === 4 && !c[0].startsWith('파일') && !c[0].startsWith('---')) {
    pairs[c[0]] = { groupBy: c[1], measure: c[2], newCol: c[3] === '—' ? '' : strip(c[3]) }
  }
}

// guides/<id>.md 의 "열 설명" 표에서 열마다 뜻을 가져온다 (| `열` | 뜻 | 형식)
function readMeanings(id) {
  const file = path.join(repo, 'guides', id + '.md')
  if (!fs.existsSync(file)) return {}
  const out = {}
  for (const l of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = l.match(/^\|\s*`([^`]+)`\s*\|\s*(.+?)\s*\|?\s*$/)
    if (m) out[m[1].trim()] = m[2].replace(/\|\s*$/, '').trim()
  }
  return out
}

const skip = new Set(['students_lesson.csv'])
const result = []
for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.csv') && !skip.has(f)).sort()) {
  const id = file.replace('.csv', '')
  const [header, ...body] = parseCsv(fs.readFileSync(path.join(dir, file), 'utf8'))
  const meanings = readMeanings(id)
  const columns = header.map((name, i) => {
    const vals = body.map(r => (r[i] ?? '').trim())
    const filled = vals.filter(v => v !== '')
    const numeric = filled.length > 0 && filled.every(v => !Number.isNaN(Number(v)))
    const unique = new Set(filled).size
    // number: 값이 많은 숫자 / group: 묶을 수 있는 열 / text: 값이 너무 많은 글자(이름·설명 등)
    const kind = numeric ? (unique > 12 ? 'number' : 'group') : (unique <= 30 ? 'group' : 'text')
    return { name, kind, missing: vals.length - filled.length, unique, examples: [...new Set(filled)].slice(0, 4), meaning: meanings[name.trim()] ?? '' }
  })
  result.push({
    id, rows: body.length, columns,
    ...info[id],
    pair: pairs[id] ?? null,
    preview: body.slice(0, 5).map(r => r.map(v => (v.length > 24 ? v.slice(0, 24) + '…' : v))),
    header,
  })
}
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, JSON.stringify(result))
for (const d of result) {
  const gaps = ['field', 'careers', 'prep', 'pair'].filter(k => !d[k])
  console.log(`${d.id}: ${d.rows}행 ${d.columns.length}열${gaps.length ? '  ⚠ 없음: ' + gaps.join(',') : ''}`)
}
