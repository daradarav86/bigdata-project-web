// 데이터 확인 질문: 학생이 데이터를 실제로 살펴봤는지 확인하는 간단한 질문 2개를 데이터에서 자동으로 만든다.
// 같은 데이터에는 늘 같은 질문이 나오고(데이터 이름으로 정함), 보기 순서만 섞인다. 정답은 열 목록과 앞 5행에서 찾을 수 있다.
const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) } return h >>> 0 }
const rng = seed => {
  let a = seed
  return () => {
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const shuffle = (arr, r) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}
const uniq = arr => [...new Set(arr.map(String))]
const pick = (arr, r) => arr[Math.floor(r() * arr.length)]

// 숫자를 고르는 질문: 정답과 비슷한 크기의 틀린 보기 세 개
function numberQ(id, text, n, near, where) {
  const label = x => x.toLocaleString()
  return (r) => {
    const wrong = shuffle(uniq(near.map(f => Math.max(1, Math.round(f(n))))).filter(x => x !== String(n) && Number(x) > 0), r).slice(0, 3)
    if (wrong.length < 3) return null
    return { id, text, options: shuffle([label(n), ...wrong.map(x => label(Number(x)))], r), answer: label(n), where }
  }
}

const rowsQ = ds => numberQ('rows', '이 데이터는 모두 몇 행인가요?', ds.rows,
  [x => x * 0.5, x => x * 2, x => x + Math.max(10, x * 0.15), x => x - Math.max(10, x * 0.15), x => x * 1.5],
  '데이터 이름 아래 "행 수"나 위쪽 카드에서 찾을 수 있어요.')
const colsQ = ds => numberQ('cols', '이 데이터의 열은 모두 몇 개인가요?', ds.columns.length,
  [x => x + 1, x => x - 1, x => x + 3, x => x - 3, x => x * 2],
  '"열 목록" 표의 줄 수를 세거나, 위쪽 카드의 "열" 개수에서 찾을 수 있어요.')

function firstQ(ds) {
  return r => {
    const row = ds.preview[0] ?? []
    const ok = v => v && !v.endsWith('…') && v.length <= 14
    const idxs = ds.header.map((_, i) => i).filter(i => ok(row[i]))
    for (const i of shuffle(idxs, r)) {
      const ans = row[i]
      const pool = uniq([...ds.preview.slice(1).map(x => x[i]), ...ds.columns[i].examples]).filter(v => ok(v) && v !== ans)
      if (pool.length >= 2) {
        const wrong = shuffle(pool, r).slice(0, 3)
        return { id: 'first', text: `첫 번째 행의 "${ds.header[i]}" 열 값은 무엇인가요?`, options: shuffle([ans, ...wrong], r), answer: ans, where: '"앞 5행" 표의 맨 윗줄에서 찾을 수 있어요.' }
      }
    }
    return null
  }
}

function missingQ(ds) {
  return r => {
    const withM = ds.columns.filter(c => c.missing > 0), without = ds.columns.filter(c => c.missing === 0)
    if (!withM.length || without.length < 2) return null
    const ans = pick(withM, r).name
    return { id: 'missing', text: '다음 중 결측값(NaN)이 있는 열은 무엇인가요?', options: shuffle([ans, ...shuffle(without, r).slice(0, 2).map(c => c.name)], r), answer: ans, where: '"열 목록" 표의 "결측값(NaN)" 칸에 숫자가 있는 열이에요.' }
  }
}

// 글자(문자)가 들어 있는 열 찾기: 정답은 값이 글자인 열 1개, 틀린 보기는 값이 모두 숫자인 열 2개.
// ("숫자 열"을 묻지 않는 이유: 월·평점처럼 숫자로 된 묶는 열이 있어서 정답이 둘로 갈릴 수 있다)
function textColQ(ds) {
  return r => {
    const texts = ds.columns.filter(c => !c.numeric && c.unique > 0), nums = ds.columns.filter(c => c.numeric)
    if (!texts.length || nums.length < 2) return null
    const ans = pick(texts, r).name
    return { id: 'textcol', text: '다음 중 값이 숫자가 아니라 글자(문자)인 열은 무엇인가요?', options: shuffle([ans, ...shuffle(nums, r).slice(0, 2).map(c => c.name)], r), answer: ans, where: '"앞 5행" 표에서 숫자가 아닌 글자가 들어 있는 열을 찾아요.' }
  }
}

// 질문 2개: 크기 확인(행 수 또는 열 수) 1개 + 내용 확인(첫 행 값 / 결측값 열 / 숫자 열) 1개
export function makeDataQuiz(ds) {
  if (!ds) return []
  const seed = hash(ds.id), r = rng(seed)
  const sizeFirst = seed % 2 === 0
  const q1 = (sizeFirst ? rowsQ(ds) : colsQ(ds))(r) ?? (sizeFirst ? colsQ(ds) : rowsQ(ds))(r)
  const makers = [firstQ(ds), missingQ(ds), textColQ(ds)]
  const start = (seed >>> 3) % makers.length
  let q2 = null
  for (let k = 0; k < makers.length && !q2; k++) q2 = makers[(start + k) % makers.length](r)
  if (!q2) q2 = (sizeFirst ? colsQ(ds) : rowsQ(ds))(r)
  return [q1, q2].filter(Boolean)
}

// 확인 상태: 데이터를 열어 봤고(viewed), 질문에 모두 맞게 답했으면 통과
export function quizState(ds, qa) {
  const quiz = makeDataQuiz(ds)
  const ans = qa?.ans ?? {}
  const viewed = !!qa?.viewed
  const correct = quiz.filter(q => ans[q.id] === q.answer).length
  return { quiz, viewed, ans, correct, passed: viewed && quiz.length > 0 && correct === quiz.length }
}
