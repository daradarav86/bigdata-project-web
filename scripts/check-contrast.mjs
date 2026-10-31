// 글자와 배경의 색 대비(WCAG)를 계산한다. 일반 글자는 4.5 이상, 큰 글자·굵은 큰 글자는 3 이상이 기준이다.
// 사용: node scripts/check-contrast.mjs
const lum = hex => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

// App.css의 색 변수와 같은 값. onBlue: 파란 버튼 위 글자, onWarn: 주황 배지 위 글자
const light = { ink: '#1b2233', muted: '#5b667a', bg: '#f6f8fc', card: '#ffffff', soft: '#eaeffb', blue: '#365BC5', ok: '#17713d', warn: '#c2410c', onBlue: '#ffffff', onWarn: '#ffffff' }
const dark = { ink: '#eef1f8', muted: '#a3acc2', bg: '#11162a', card: '#1a2038', soft: '#232d55', blue: '#7b98f3', ok: '#5fd08b', warn: '#fb923c', onBlue: '#0b1230', onWarn: '#1a1206' }
const pairs = t => [
  ['본문 (ink / card)', t.ink, t.card], ['본문 (ink / bg)', t.ink, t.bg],
  ['보조 글자 (muted / bg)', t.muted, t.bg], ['보조 글자 (muted / card)', t.muted, t.card], ['보조 글자 (muted / soft)', t.muted, t.soft],
  ['파랑 링크·강조 (blue / card)', t.blue, t.card], ['파랑 (blue / soft)', t.blue, t.soft],
  ['기본 버튼 (버튼 글자 / blue)', t.onBlue, t.blue], ['주황 배지 (배지 글자 / warn)', t.onWarn, t.warn], ['경고 (warn / card)', t.warn, t.card], ['성공 (ok / card)', t.ok, t.card],
]
let bad = 0
for (const [name, theme] of [['밝은 화면', light], ['어두운 화면', dark]]) {
  console.log(`\n[${name}]`)
  for (const [label, fg, bgc] of pairs(theme)) {
    const r = ratio(fg, bgc)
    const ok = r >= 4.5
    if (!ok) bad++
    console.log((ok ? 'OK   ' : 'FAIL ') + r.toFixed(2).padStart(5) + '  ' + label)
  }
}
console.log(bad ? `\n기준(4.5)에 못 미치는 조합 ${bad}개` : '\n모두 통과')
