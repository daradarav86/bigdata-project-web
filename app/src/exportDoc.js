import { getDs } from './data/meta.js'
import { statOf, frameOf, missingOf, nameOf } from './doc.js'

// 기획안을 Word(.docx)로 만든다. Drive에 올려 "Google 문서로 열기"를 하면 구글 문서에서 이어서 쓸 수 있다.
// 번호와 제목은 [템플릿] 데이터 프로젝트 기획안 v2를 따른다. 4번(분석 결과)은 쓴 만큼만 채우고 나머지는 안내 문구를 둔다.
const FONT = 'Malgun Gothic'
const BLUE = '365BC5'
const LATER = '(분석 뒤에 채워요)'

export async function exportPlanDocx(g) {
  const docx = await import('docx')
  const blob = await docx.Packer.toBlob(buildPlanDocx(g, docx))
  const name = `${(g.team || '팀').replace(/[\\/:*?"<>|]/g, '')}_기획안.docx`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
  return name
}

export function buildPlanDocx(g, docx) {
  const { Document, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ShadingType } = docx
  const ds = getDs(g.dataset)
  const d = g.deck ?? {}
  const s = statOf(g.stat), f = frameOf(g.frame), mm = missingOf(g.missingMethod)
  const W = 9638 // A4 폭 11906 − 좌우 여백 2268 (DXA)

  const lines = t => String(t ?? '').split('\n')
  const P = (t, o = {}) => lines(t).map(l => new Paragraph({
    spacing: { after: o.after ?? 80 }, indent: o.indent ? { left: o.indent } : undefined,
    children: [new TextRun({ text: l, bold: o.bold, italics: o.italics, color: o.color, font: o.mono ? 'Consolas' : FONT, size: o.size ?? 22 })],
  }))
  const H = (t, level) => new Paragraph({ heading: level, spacing: { before: level === HeadingLevel.HEADING_1 ? 360 : 200, after: 100 }, children: [new TextRun({ text: t, bold: true, color: level === HeadingLevel.HEADING_1 ? BLUE : undefined, font: FONT })] })
  const H1 = t => H(t, HeadingLevel.HEADING_1)
  const H2 = t => H(t, HeadingLevel.HEADING_2)
  const H3 = t => H(t, HeadingLevel.HEADING_3)

  const cell = (t, w, head) => new TableCell({
    width: { size: w, type: WidthType.DXA },
    shading: head ? { type: ShadingType.CLEAR, fill: 'EAEFFB', color: 'auto' } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: P(t || ' ', { bold: head, after: 0, size: 20 }),
  })
  // widths: 열 비율 (합계 1), rows[0]은 머리글
  const table = (ratios, rows) => {
    const ws = ratios.map(r => Math.round(W * r))
    return new Table({
      width: { size: W, type: WidthType.DXA }, columnWidths: ws,
      rows: rows.map((r, i) => new TableRow({ tableHeader: i === 0, children: r.map((t, j) => cell(t, ws[j], i === 0)) })),
    })
  }

  const members = g.members.map((m, i) => ({ ...m, n: nameOf(m, i) }))
  const usedCols = g.usedCols.map(c => `${c.name}: ${c.meaning}`).join('\n')
  const blanks = ds ? ds.columns.filter(c => c.missing > 0).map(c => `${c.name} ${c.missing}개`).join(', ') : ''
  const spk = d.speakers ?? []
  const interp = [
    `① 사실: ${g.groupBy}별 ${g.measure}의 ${s.ko}은 ${d.hi || '___'}이(가) 가장 높고(${d.hiVal || '___'}), ${d.lo || '___'}이(가) 가장 낮았다(${d.loVal || '___'}).`,
    `② 비교: 두 집단의 차이는 ${d.diffPts ? d.diffPts + '점' : '___'}로, ${d.diffX || '___'}배 정도였다.`,
    `③ 의미: 이는 ${d.m1 || g.groupBy} 와(과) ${d.m2 || g.measure} 가 함께 움직이는 경향이 있음을 보여 준다.`,
  ].join('\n')

  const body = [
    new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: `${g.team || ''} 데이터 프로젝트 — 기획안과 결과 정리`, bold: true, size: 36, color: BLUE, font: FONT })] }),
    ...P('원묵고 빅데이터원리탐구 도우미에서 작성한 기획안입니다. 4번(분석 결과)은 분석한 뒤에 이어서 채워요.', { italics: true, color: '667085', size: 20 }),

    H1('0. 팀 기본 정보'),
    table([0.28, 0.72], [
      ['항목', '내용'],
      ['조', g.team],
      ['팀원 (학번, 이름)', members.map(m => `${m.id} ${m.n}`.trim()).join(' / ')],
      ['프로젝트 제목', g.title || g.question],
      ['사용할 데이터 파일', ds ? `${ds.id}.csv` : ''],
    ]),
    H3('우리가 함께 일하는 방법'),
    ...P(`${g.pledge ? '☑' : '☐'} 우리 팀은 ① 같은 화면을 보며 함께 의논하고, ② 키보드는 미션마다 돌아가며 잡고, ③ 발표는 모두 한 문장 이상 말하기로 했습니다.`),

    H1('1. 진로에서 탐구 질문 만들기'),
    H2('STEP 1. 팀원 진로 모으기'),
    table([0.2, 0.35, 0.45], [['이름', '되고 싶은 직업·분야', '그 직업이 하는 일 (한 줄)'], ...members.map(m => [m.n, m.career, m.job])]),
    ...P(`우리 팀의 진로 키워드: ${g.keyword}`, { bold: true }),
    H2('STEP 2. 데이터 고르기'),
    ...P(ds ? `${ds.field} 분야 → ${ds.id}.csv (${ds.desc})` : ''),
    H2('STEP 3. 진로 장면에서 궁금한 점'),
    table([0.4, 0.6], [['떠올리기', '우리 팀의 답'], ['① 가장 자주 고민하는 것', g.concern], ['② 비교하고 싶은 집단', g.groupsAsk], ['③ 확인할 숫자', g.numberAsk]]),
    H3('1-1. 우리 팀의 진로 키워드와 이유'), ...P(`${g.keyword} — ${g.keywordWhy}`),
    H3(`1-2. 우리 팀의 탐구 질문 (질문 틀 ${g.frame}: ${f.name})`), ...P(g.question, { bold: true }),
    H3('1-3. 이 질문이 진로에서 중요한 장면'), ...P(g.scene),
    H3('1-4. 우리가 더 알고 싶은 질문 (선택)'), ...P(g.extraQ || '-'),
    H3('1-5. 분석 전 예상'), ...P(g.expect),

    H1('2. 사용할 데이터'),
    table([0.3, 0.7], [
      ['항목', '내용'],
      ['파일 이름', ds ? `${ds.id}.csv` : ''],
      ['한 행은 무엇을 뜻하나요?', g.rowMeaning],
      ['행 × 열 (shape)', ds ? `${ds.rows}행 × ${ds.columns.length}열` : ''],
      ['사용할 열 3~4개', usedCols],
      ['빈칸이 있는 열 (isnull().sum())', blanks || '없음'],
    ]),

    H1('3. 분석 계획'),
    H3('3-1. 한 문장 소개'),
    ...P(`우리 팀은 ${ds ? ds.id : '___'} 데이터에서 ${g.groupBy}(으)로 묶어 ${g.measure}의 ${s.ko}를 비교하고, ${g.chart === 'line' ? '선' : '막대'}그래프로 나타냅니다.`),
    H3('3-2. 단계별 분석 계획표'),
    table([0.1, 0.25, 0.65], [
      ['단계', '정할 것', '우리 팀의 선택'],
      ['①', '묶는 기준', g.groupBy], ['②', '계산할 열', g.measure], ['③', '통계 함수', s.fn],
      ['④', '빈칸 처리', `${mm ? mm.ko : ''}\n${g.missingWhy}`],
      ['⑤', '그래프 종류', g.chart], ['⑥', '새 열 (선택)', g.newCol || '이번에는 만들지 않음'],
      ['⑦', '결과 읽는 방법', '가장 큰 그룹, 가장 작은 그룹, 그 차이(큰 값 − 작은 값)를 숫자로 말하기'],
    ]),
    H3('3-3. 코드 미리 설계하기'), ...P(g.codeDesign, { mono: true }),
    H3('3-4. 필수 미션 체크'),
    ...P('☐ 미션 1 데이터 구조 확인   ☐ 미션 2 빈칸 확인·처리   ☐ 미션 3 그룹별 통계 1개   ☐ 미션 4 그래프 1개   ☐ 해석 2문장 + 한계 1문장'),

    H1('4. 분석 결과'),
    H3('4-1. 빈칸 처리'),
    table([0.3, 0.7], [['항목', '내용'], ['빈칸이 있던 열과 개수', blanks || '없음'], ['처리 방법', mm ? mm.ko : ''], ['그렇게 정한 이유', g.missingWhy]]),
    H3('4-2. 그룹별 통계 결과표'), ...P('노트북의 result 표를 복사해 붙여 넣으세요.', { italics: true, color: '667085' }), ...P(LATER),
    H3('4-3. 결과 읽기 (숫자로)'),
    table([0.4, 0.6], [['읽을 것', '우리 팀 결과'], ['가장 큰 그룹과 값', d.hi ? `${d.hi}, ${d.hiVal ?? ''}` : LATER], ['가장 작은 그룹과 값', d.lo ? `${d.lo}, ${d.loVal ?? ''}` : LATER], ['차이 (큰 값 − 작은 값)', d.diffPts ? `${d.diffPts}점 (${d.diffX ?? ''}배)` : LATER], ['예상(1-5)과 같았나요? 놀라운 점은?', LATER]]),
    H3('4-4. 그래프'), ...P('그래프를 오른쪽 클릭 → 이미지 복사 → 아래에 붙여 넣으세요.', { italics: true, color: '667085' }), ...P(LATER),
    H3('4-5. 해석 (3문장, 숫자 넣기)'), ...P(d.hi ? interp : LATER),
    H3('4-6. 한계 (1문장 이상)'), ...P(d.limit ? `다만 ${d.limit} 때문에 이 결과를 모든 대상에게 일반화하기 어렵다.` : LATER),
    H3('4-7. 우리 진로와 연결'),
    ...P(d.use ? `이 결과는 ${d.job || g.keyword}이(가) ${d.doing || '___'}을(를) 할 때 ${d.use}로 참고할 수 있다. 다만 ${d.careful || '___'}도 함께 확인해야 한다. 다음에는 ${d.next || '___'} 데이터를 더 보고 싶다.` : LATER),

    H1('5. 3분 발표 준비'),
    table([0.18, 0.55, 0.27], [
      ['시간', '슬라이드와 말할 내용', '말하는 사람'],
      ['0:00~0:15', '① 제목, 우리 팀 소개', spk[0] || ''],
      ['0:15~0:40', '② 우리 진로와 궁금했던 점', spk[1] || ''],
      ['0:40~1:10', '③ 탐구 질문과 사용한 데이터', spk[2] || ''],
      ['1:10~2:00', '④ 결과 그래프와 숫자 2개', spk[3] || ''],
      ['2:00~2:35', '⑤ 해석과 한계', spk[4] || ''],
      ['2:35~3:00', '⑥ 진로와 연결, 마무리 한 문장', spk[5] || ''],
    ]),
    H3('예상 질문과 우리의 답 (2개)'),
    ...P(`Q1. ${d.q1 || ''}\nA1. ${d.a1 || ''}\nQ2. ${d.q2 || ''}\nA2. ${d.a2 || ''}`),
  ]

  return new Document({
    creator: '원묵고 빅데이터원리탐구 도우미',
    title: `${g.team} 기획안`,
    styles: { default: { document: { run: { font: FONT, size: 22 } } } },
    sections: [{ properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, children: body.flat() }],
  })
}
