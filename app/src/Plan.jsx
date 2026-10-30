import { useMemo, useState } from 'react'
import datasets from './data/datasets.json'
import { FRAMES, STATS, MISSING, KIND_LABEL, getDs, getCol } from './data/meta.js'
import { PLAN_STEPS, stepDone, draftQuestion, contextOf, checkCodeDesign, buildPlanText, pct, statOf, frameOf, nameOf } from './doc.js'
import { checkQuestion } from './coach.js'
import { Text, Seg, Think, Stuck } from './ui.jsx'
import Chat from './Chat.jsx'

const dsName = d => `${d.field} · ${d.desc}`
const tokens = s => s.split(/[\s,·/()]+/).filter(t => t.length >= 2)

/* ---------- 열 목록 (뜻·종류·빈칸) ---------- */
function ColTable({ ds }) {
  return (
    <div className="tablewrap">
      <table>
        <thead><tr><th>열 이름</th><th>뜻</th><th>종류</th><th>빈칸</th></tr></thead>
        <tbody>
          {ds.columns.map(c => (
            <tr key={c.name}>
              <td><code>{c.name}</code></td>
              <td>{c.meaning}</td>
              <td><span className={`tag ${c.kind}`}>{KIND_LABEL[c.kind]}</span></td>
              <td>{c.missing > 0 ? <b className="warn">{c.missing}</b> : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ---------- 열 고르기 ---------- */
function ColPicker({ label, hint, ds, value, onPick, kinds, warn }) {
  const [all, setAll] = useState(false)
  const list = ds.columns.filter(c => all || kinds.includes(c.kind))
  const cur = getCol(ds, value)
  const w = cur && warn(cur)
  return (
    <div className="field">
      <span className="lbl">{label}</span>
      <p className="hint">{hint}</p>
      <div className="colgrid" role="radiogroup" aria-label={label}>
        {list.map(c => (
          <button key={c.name} role="radio" aria-checked={value === c.name} className={`col ${value === c.name ? 'on' : ''}`} onClick={() => onPick(c.name)}>
            <code>{c.name}</code>
            <span>{c.meaning}</span>
            <small>{KIND_LABEL[c.kind]}{c.kind === 'group' ? ` · ${c.unique}개 값` : ''}{c.missing ? ` · 빈칸 ${c.missing}` : ''}</small>
          </button>
        ))}
        {list.length === 0 && <p className="muted">알맞은 열이 없어요. 아래 "모든 열 보기"를 켜 보세요.</p>}
      </div>
      <label className="check small"><input type="checkbox" checked={all} onChange={e => setAll(e.target.checked)} /> 모든 열 보기</label>
      {w && <p className="warn small" role="status">{w}</p>}
    </div>
  )
}

/* ---------- 각 단계 ---------- */
function TeamStep({ game, patch, setSize, setMember }) {
  return (
    <>
      <Text label="조 이름" value={game.team} max={16} placeholder="예: 1-3 별빛조" onChange={v => patch({ team: v })} hint="코치를 쓰려면 꼭 필요해요." />
      <Seg label="우리 팀 인원수" value={game.size} onChange={setSize}
        options={[2, 3, 4, 5, 6].map(n => ({ id: n, ko: `${n}명` }))} />
      <div className="field">
        <span className="lbl">팀원 (학번, 이름)</span>
        <div className="members">
          {game.members.map((m, i) => (
            <div key={i} className="mrow">
              <input aria-label={`팀원 ${i + 1} 학번`} value={m.id} maxLength={8} placeholder="학번" onChange={e => setMember(i, { id: e.target.value })} />
              <input aria-label={`팀원 ${i + 1} 이름`} value={m.name} maxLength={8} placeholder={`팀원 ${i + 1} 이름`} onChange={e => setMember(i, { name: e.target.value })} />
            </div>
          ))}
        </div>
      </div>
      <div className="pledge">
        <b>우리가 함께 일하는 방법</b>
        <ol>
          <li>모든 미션은 같은 화면을 보며 함께 의논하고 결정해요. 역할을 나누어 따로 일하지 않아요.</li>
          <li>키보드(코드 입력)는 미션이 바뀔 때마다 돌아가며 잡아요.</li>
          <li>발표는 팀원 모두가 한 문장 이상 말해요.</li>
        </ol>
        <label className="check"><input type="checkbox" checked={game.pledge} onChange={e => patch({ pledge: e.target.checked })} /> 우리 팀은 위 세 가지를 지키기로 했어요.</label>
      </div>
    </>
  )
}

function CareerStep({ game, patch, setMember }) {
  const fields = [...new Set(datasets.map(d => d.field))]
  return (
    <>
      <p className="hint">STEP 1. 팀원이 각자의 진로를 말하고, 서로 달라도 괜찮아요. 비슷한 분야를 찾아 "우리 팀의 진로 키워드"를 하나 정해요.</p>
      <div className="careers">
        {game.members.map((m, i) => (
          <div key={i} className="crow">
            <b>{nameOf(m, i)}</b>
            <input aria-label={`${nameOf(m, i)} 되고 싶은 직업·분야`} value={m.career} maxLength={30} placeholder="되고 싶은 직업·분야 (예: 상담교사)" onChange={e => setMember(i, { career: e.target.value })} />
            <input aria-label={`${nameOf(m, i)} 그 직업이 하는 일`} value={m.job} maxLength={50} placeholder="그 직업이 하는 일 (한 줄)" onChange={e => setMember(i, { job: e.target.value })} />
          </div>
        ))}
      </div>
      <Think>
        <li>우리 팀원의 진로에 공통점이 있나요? (예: 모두 "학생이 잘 배우도록 돕는 일")</li>
        <li>공통점이 없다면, 가장 가까운 분야 하나를 고르려면 무엇을 기준으로 할까요?</li>
      </Think>
      <Text label="우리 팀의 진로 키워드" value={game.keyword} max={20} placeholder="예: 교육·상담" onChange={v => patch({ keyword: v })} />
      <div className="chips" aria-label="분야 예시">
        {fields.map(f => <button key={f} onClick={() => patch({ keyword: f })}>{f}</button>)}
      </div>
      <Text label="1-1. 이 키워드를 고른 이유 (2~3문장)" rows={3} value={game.keywordWhy} onChange={v => patch({ keywordWhy: v })}
        hint="예) 우리 팀은 ○○ 분야를 생각한다. ○○를 알면 ○○할 때 도움이 되기 때문이다." />
    </>
  )
}

function DataStep({ game, patch, go }) {
  const ds = getDs(game.dataset)
  const mine = useMemo(() => tokens([game.keyword, ...game.members.flatMap(m => [m.career, m.job])].join(' ')), [game.keyword, game.members])
  const score = d => mine.filter(t => (d.field + d.careers.join(' ')).includes(t) || d.field.includes(t)).length
  const choose = id => id !== game.dataset && patch({ dataset: id, groupBy: '', measure: '', usedCols: [], codeDesign: '' })
  return (
    <>
      <p className="hint">STEP 2. 진로에 맞는 데이터를 하나 골라요. 입력한 진로와 맞는 분야에는 <span className="recmark">추천</span>이 붙어요.</p>
      <div className="dgrid" role="radiogroup" aria-label="데이터 선택">
        {datasets.map(d => (
          <button key={d.id} role="radio" aria-checked={game.dataset === d.id} className={`dcard ${game.dataset === d.id ? 'on' : ''}`} onClick={() => choose(d.id)}>
            <b>{d.field}{score(d) > 0 && <span className="recmark">추천</span>}</b>
            <span>{d.desc}</span>
            <small>{d.rows.toLocaleString()}행 · {d.columns.length}열</small>
          </button>
        ))}
      </div>
      {ds && (
        <section className="detail">
          <h3>{dsName(ds)} <small className="muted">{ds.id}.csv</small></h3>
          <dl className="facts wide">
            <div><dt>관련 진로</dt><dd>{ds.careers.join(', ')}</dd></div>
            <div><dt>수업용 전처리</dt><dd>{ds.prep}</dd></div>
            <div><dt>분석 예시</dt><dd>{ds.example}</dd></div>
            {ds.pair && <div><dt>추천 짝</dt><dd>묶는 기준 <code>{ds.pair.groupBy}</code> → 계산할 열 <code>{ds.pair.measure}</code></dd></div>}
          </dl>
          <details><summary>열 목록과 앞 5행 보기</summary>
            <ColTable ds={ds} />
            <div className="tablewrap preview">
              <table>
                <thead><tr>{ds.header.map(h => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>{ds.preview.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{v || <span className="muted">(빈칸)</span>}</td>)}</tr>)}</tbody>
              </table>
            </div>
          </details>
          {ds.id === 'movies' && <p className="warn small">묶을 범주 열이 거의 없는 데이터예요. describe()와 히스토그램으로 분포를 살펴보는 질문이 어울려요.</p>}
          <button className="primary" onClick={() => go('scene')}>다음: 진로 장면 떠올리기</button>
        </section>
      )}
    </>
  )
}

function SceneStep({ game, patch }) {
  return (
    <>
      <p className="hint">STEP 3. 아래 세 질문에 팀원이 돌아가며 한 줄씩 답해 보세요. 이 답이 다음 단계의 질문이 돼요.</p>
      <Text label="① 이 직업을 가진 사람이 가장 자주 고민하는 것은?" rows={2} value={game.concern} onChange={v => patch({ concern: v })} hint="예) 학생이 공부를 어떻게 하게 도울까?" />
      <Text label="② 그 고민에서 비교하고 싶은 두 집단(또는 여러 집단)은?" rows={2} value={game.groupsAsk} onChange={v => patch({ groupsAsk: v })} hint="예) 공부 시간이 짧은 학생 vs 긴 학생" />
      <Text label="③ 그 집단들의 어떤 숫자를 보면 도움이 될까?" rows={2} value={game.numberAsk} onChange={v => patch({ numberAsk: v })} hint="예) 평균 성적" />
    </>
  )
}

function QuestionStep({ game, patch, go }) {
  const ds = getDs(game.dataset)
  if (!ds) return <p className="warn">먼저 "데이터 고르기"에서 데이터를 하나 골라 주세요. <button className="link" onClick={() => go('data')}>데이터 고르기로 가기</button></p>
  const fr = frameOf(game.frame)
  const checks = checkQuestion(game.question, game)
  const n = checks.filter(c => c.ok).length
  const setFrame = id => patch({ frame: id, chart: frameOf(id).chart })
  const rec = ds.pair
  return (
    <>
      <Seg label="질문 틀" hint="STEP 4. 어떤 모양의 질문을 만들까요?" value={game.frame} onChange={setFrame}
        options={FRAMES.map(f => ({ id: f.id, ko: `${f.id}. ${f.name}`, desc: f.text }))} />
      {rec && <p className="hint">선생님 추천 짝: 묶는 기준 <code>{rec.groupBy}</code> → 계산할 열 <code>{rec.measure}</code> {rec.newCol && <>· 새 열 아이디어: {rec.newCol}</>}</p>}
      <ColPicker label="① 묶는 기준 (groupby의 열)" ds={ds} value={game.groupBy} kinds={['group']} onPick={v => patch({ groupBy: v })}
        hint="글자·구간이 들어 있는 열. 그룹이 2~7개면 읽기 좋아요."
        warn={c => (c.unique > 7 ? `값이 ${c.unique}개나 돼요. 그래프가 복잡해질 수 있어요. (그룹이 많으면 result.head(10))` : c.kind === 'number' ? '숫자 열이라 그룹이 너무 많을 수 있어요.' : '')} />
      <ColPicker label="② 계산할 열" ds={ds} value={game.measure} kinds={['number']} onPick={v => patch({ measure: v })}
        hint="숫자 열(점수, 길이, 금액 …)만 가능해요."
        warn={c => (c.kind !== 'number' ? '숫자 열이 아니면 평균을 낼 수 없어요. info()의 Dtype을 확인해요.' : c.missing / ds.rows > 0.05 ? `빈칸이 ${c.missing}개(${pct(c.missing, ds.rows)}%)로 많은 편이에요. 빈칸 처리를 꼭 생각해요.` : '')} />
      <Seg label="③ 통계 함수" value={game.stat} onChange={v => patch({ stat: v })} options={STATS.map(s => ({ id: s.id, ko: s.ko, desc: s.desc }))} />
      <Seg label="④ 그래프 종류" hint={`질문 틀 ${fr.id}는 보통 ${fr.chart === 'line' ? '선' : '막대'}그래프예요. 그룹 이름을 비교하면 막대, 연도·월처럼 순서가 있는 변화는 선이에요.`}
        value={game.chart} onChange={v => patch({ chart: v })} options={[{ id: 'bar', ko: '막대 (bar)' }, { id: 'line', ko: '선 (line)' }]} />

      <div className="field">
        <span className="lbl">1-2. 우리 팀의 탐구 질문 (필수, 한 문장)</span>
        <p className="hint">고른 열로 초안을 만들 수 있어요. 초안을 우리 말로 고쳐 쓰면 더 좋아요.</p>
        <div className="row start">
          <button className="ghost" disabled={!game.groupBy || !game.measure} onClick={() => patch({ question: draftQuestion(game) })}>초안 가져오기</button>
          <small className="muted">{draftQuestion(game)}</small>
        </div>
        <textarea rows={2} aria-label="탐구 질문" value={game.question} maxLength={100} onChange={e => patch({ question: e.target.value })} placeholder="예: 공부 시간 구간(studytime)별로 최종 성적(G3)의 평균은 어떻게 다를까?" />
        <div className={`meter m${n}`}>
          <b>{game.question.trim() ? (n === 4 ? '좋은 질문이에요' : `점검 ${n}/4`) : '질문을 쓰면 점검이 시작돼요'}</b>
          <div className="bar" aria-hidden="true"><span style={{ width: `${game.question.trim() ? n * 25 : 0}%` }} /></div>
        </div>
        <ul className="checks">{checks.map(c => <li key={c.label} className={c.ok ? 'ok' : 'no'}>{c.ok ? '✓' : '○'} {c.label}</li>)}</ul>
        <details className="examples">
          <summary>이런 질문은 이렇게 고쳐요</summary>
          <div className="ex bad"><b>고치기 전</b> 공부를 많이 하면 성적이 오를까?<small>원인을 단정하고 있어요.</small></div>
          <div className="ex good"><b>고친 뒤</b> 공부 시간 구간별 평균 성적은 어떻게 다를까?</div>
          <div className="ex bad"><b>고치기 전</b> 한국 학생의 성적은 어떨까?<small>데이터에 없는 대상이에요.</small></div>
          <div className="ex good"><b>고친 뒤</b> 이 데이터의 학생들은 활동 참여 여부별 성적이 어떻게 다를까?</div>
        </details>
      </div>

      <Text label="1-3. 이 질문이 진로에서 중요한 장면 (3문장)" rows={3} value={game.scene} onChange={v => patch({ scene: v })}
        hint={'틀: "(직업)이(가) (일)을 할 때 (알아야 할 것)을 알면 (할 수 있는 것). 그래서 (묶는 기준)별로 (계산할 열)을 비교해 보려고 한다."'} />
      <Text label="1-4. 더 알고 싶은 질문 (선택)" rows={2} value={game.extraQ} onChange={v => patch({ extraQ: v })} hint="같은 파일의 다른 열로 질문을 하나 더 만들어 보세요. 시간이 되면 분석해요." />
      <Text label="1-5. 분석 전 예상과 이유" rows={2} value={game.expect} onChange={v => patch({ expect: v })}
        hint="예) 공부 시간이 길수록 평균 성적이 높을 것이다. 이유: 공부한 시간이 많으니까. (분석 뒤 맞았는지 비교해요)" />
    </>
  )
}

function UnderstandStep({ game, patch, go }) {
  const ds = getDs(game.dataset)
  if (!ds) return <p className="warn">먼저 데이터를 골라 주세요. <button className="link" onClick={() => go('data')}>데이터 고르기로 가기</button></p>
  const used = game.usedCols
  const toggle = c => patch(g => (g.usedCols.some(u => u.name === c.name)
    ? { usedCols: g.usedCols.filter(u => u.name !== c.name) }
    : g.usedCols.length >= 4 ? {} : { usedCols: [...g.usedCols, { name: c.name, meaning: c.meaning }] }))
  const fromQuestion = () => patch(g => ({
    usedCols: [g.groupBy, g.measure].filter(Boolean).map(n => g.usedCols.find(u => u.name === n) ?? { name: n, meaning: getCol(ds, n)?.meaning ?? '' }),
  }))
  const setMeaning = (name, meaning) => patch(g => ({ usedCols: g.usedCols.map(u => (u.name === name ? { ...u, meaning } : u)) }))
  const blanks = ds.columns.filter(c => c.missing > 0)
  return (
    <>
      <p className="hint">노트북 미션 0~1(<code>head</code>, <code>shape</code>, <code>columns</code>, <code>info</code>)을 실행한 뒤 함께 보며 채워요. 아래 값은 미리 본 값이니 노트북 결과와 같은지 확인해요.</p>
      <dl className="facts wide">
        <div><dt>파일 이름</dt><dd><code>{ds.id}.csv</code></dd></div>
        <div><dt>행 × 열 (shape)</dt><dd>{ds.rows.toLocaleString()}행 × {ds.columns.length}열</dd></div>
        <div><dt>빈칸이 있는 열</dt><dd>{blanks.length ? blanks.map(c => `${c.name} ${c.missing}개`).join(', ') : '없음'}</dd></div>
      </dl>
      <Text label="한 행은 무엇을 뜻하나요?" value={game.rowMeaning} max={60} onChange={v => patch({ rowMeaning: v })} hint="예) 학생 1명의 기록 1건 / 영화 1편 / 팀의 한 시즌" />
      <div className="field">
        <span className="lbl">사용할 열 3~4개 ({used.length}/4)</span>
        <p className="hint">열 이름 · 뜻 · 숫자인지 글자인지. 눌러서 고르고, 뜻은 우리 말로 고쳐 써도 돼요.</p>
        <button className="ghost" onClick={fromQuestion} disabled={!game.groupBy || !game.measure}>질문에서 고른 열 넣기</button>
        <div className="colgrid">
          {ds.columns.map(c => {
            const on = used.some(u => u.name === c.name)
            return (
              <button key={c.name} aria-pressed={on} className={`col ${on ? 'on' : ''}`} onClick={() => toggle(c)}>
                <code>{c.name}</code><span>{c.meaning}</span><small>{KIND_LABEL[c.kind]}{c.missing ? ` · 빈칸 ${c.missing}` : ''}</small>
              </button>
            )
          })}
        </div>
        {used.map(u => (
          <div key={u.name} className="mrow">
            <code>{u.name}</code>
            <input aria-label={`${u.name}의 뜻`} value={u.meaning} onChange={e => setMeaning(u.name, e.target.value)} />
            <small className="muted">{getCol(ds, u.name)?.kind === 'number' ? '숫자' : '글자'}</small>
          </div>
        ))}
      </div>
    </>
  )
}

function MethodStep({ game, patch, go }) {
  const ds = getDs(game.dataset)
  if (!ds || !game.groupBy || !game.measure) return <p className="warn">먼저 "열 고르고 질문 만들기"에서 묶는 기준과 계산할 열을 골라 주세요. <button className="link" onClick={() => go('question')}>가기</button></p>
  const s = statOf(game.stat)
  const mc = getCol(ds, game.measure)
  const gc = getCol(ds, game.groupBy)
  const checks = checkCodeDesign(game)
  return (
    <>
      <p className="lead2">우리 팀은 <b>{ds.id}</b> 데이터에서 <b>{game.groupBy}</b>(으)로 묶어 <b>{game.measure}</b>의 <b>{s.obj}</b> 비교하고, <b>{game.chart === 'line' ? '선' : '막대'}</b>그래프로 나타냅니다.</p>
      <div className="plantable">
        <div><b>① 묶는 기준</b><span><code>{game.groupBy}</code> <small>{gc?.meaning}</small></span></div>
        <div><b>② 계산할 열</b><span><code>{game.measure}</code> <small>{mc?.meaning}</small></span></div>
        <div><b>③ 통계 함수</b><span><code>{s.fn}</code> <small>{s.desc}</small></span></div>
        <div><b>⑤ 그래프 종류</b><span><code>{game.chart}</code></span></div>
      </div>
      <p className="hint">① ② ③ ⑤는 앞 단계에서 정했어요. 바꾸려면 "열 고르고 질문 만들기"로 돌아가요.</p>

      <Seg label="④ 빈칸 처리" value={game.missingMethod} onChange={v => patch({ missingMethod: v })} options={MISSING.map(m => ({ id: m.id, ko: m.ko, desc: m.guide }))}
        hint={`계산할 열 ${game.measure}: 빈칸 ${mc.missing}개(전체의 약 ${pct(mc.missing, ds.rows)}%) · 묶는 기준 ${game.groupBy}: 빈칸 ${gc.missing}개 — 노트북 isnull().sum()으로 다시 확인해요.`} />
      <Text label="그렇게 정한 이유" rows={2} value={game.missingWhy} onChange={v => patch({ missingWhy: v })}
        hint={'틀: "___ 열은 빈칸이 ___개(전체의 약 ___%)뿐이라서 ___했다." 제거했다면 행 수 변화(처음 ___행 → ___행)도 써요.'} />
      <Text label="⑥ 새 열 (선택)" value={game.newCol} onChange={v => patch({ newCol: v })} max={80}
        hint={ds.pair?.newCol ? `추천 아이디어: ${ds.pair.newCol}` : '기존 열을 계산해 새 열을 만들 수 있어요. 이번에 안 만들면 비워 둬요.'} />

      <div className="field">
        <span className="lbl">3-3. 코드 미리 설계하기</span>
        <p className="hint">아래 틀의 괄호를 우리 팀 선택으로 바꿔서 직접 써 보세요. 열 이름은 대소문자와 띄어쓰기까지 똑같이!</p>
        <pre className="frame">{`result = df.groupby("(묶는 기준)")["(계산할 열)"].(mean / sum / count)()\nresult.plot(kind="(bar / line)")`}</pre>
        <textarea rows={3} aria-label="코드 설계" value={game.codeDesign} onChange={e => patch({ codeDesign: e.target.value })} spellCheck={false} className="mono" />
        <ul className="checks">{checks.map(c => <li key={c.label} className={c.ok ? 'ok' : 'no'}>{c.ok ? '✓' : '○'} {c.label}</li>)}</ul>
      </div>
      <div className="mission">
        <b>3-4. 필수 미션</b>
        <span>미션 1 데이터 구조 확인</span><span>미션 2 빈칸 확인·처리</span><span>미션 3 그룹별 통계 1개</span><span>미션 4 그래프 1개</span><span>해석 2문장 + 한계 1문장</span>
      </div>
    </>
  )
}

function SummaryStep({ game, patch, go }) {
  const [copied, setCopied] = useState(false)
  const text = buildPlanText(game)
  const copy = async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* 복사 불가 환경 */ } }
  const todo = PLAN_STEPS.filter(s => s.id !== 'summary' && !stepDone(s.id, game))
  return (
    <>
      <Text label="프로젝트 제목 (질문 모양이면 좋아요)" value={game.title} max={60} onChange={v => patch({ title: v })} placeholder="예: 공부 시간이 길수록 성적도 높을까?" />
      <button className="ghost" disabled={!game.question.trim()} onClick={() => patch({ title: game.question })}>질문으로 채우기</button>
      {todo.length > 0
        ? <div className="todo"><b>아직 덜 쓴 단계</b>{todo.map(s => <button key={s.id} className="link" onClick={() => go(s.id)}>{s.name}</button>)}</div>
        : <p className="ok-msg">기획안의 모든 단계를 썼어요. 아래 내용을 확인하고, 발표 만들기로 넘어가요.</p>}
      <pre className="docview">{text}</pre>
      <div className="row start">
        <button className="ghost" onClick={copy}>{copied ? '복사됨' : '기획안 전체 복사'}</button>
        <button className="primary" onClick={() => go('deck')}>발표 슬라이드 만들기</button>
      </div>
      <p className="muted small">복사한 내용은 구글 문서 기획안에 붙여 넣을 수 있어요. 내용은 이 기기의 브라우저에 저장돼요.</p>
    </>
  )
}

/* ---------- 단계별 도움 ---------- */
const STUCK = {
  team: [['인원수가 정해지지 않았어요', '일단 지금 모인 사람 수로 고르고, 나중에 바꿔도 돼요.']],
  career: [['진로가 아직 없어요', '"관심 있는 분야"로 써도 돼요. 좋아하는 과목이나 자주 찾아보는 주제를 적어 보세요.'], ['팀원 진로가 모두 달라요', '직업 이름 말고 "하는 일"을 비교해 보세요. 사람을 돕는 일, 자료를 분석하는 일처럼 공통점이 보일 수 있어요.']],
  data: [['어떤 데이터를 골라야 할지 모르겠어요', '"추천" 표시가 붙은 분야부터 열어 보세요. 열 목록의 뜻을 읽고, 질문이 떠오르는 데이터를 고르면 돼요.'], ['고른 뒤에 바꾸고 싶어요', '다른 데이터를 누르면 바뀌어요. 이미 고른 열은 새로 골라야 해요.']],
  scene: [['세 질문에 답하기 어려워요', '그 직업의 하루를 상상해 보세요. 어떤 선택을 해야 할 때 "숫자로 알면 좋겠다"는 생각이 들까요?']],
  question: [['어떤 열을 골라야 할지 모르겠어요', '선생님 추천 짝부터 시작해 보세요. 열의 뜻을 읽고 STEP 3에서 쓴 ②(집단)와 ③(숫자)에 맞는 열을 찾으면 돼요.'], ['질문이 너무 넓어요', '"무엇으로 묶고, 어떤 숫자를 비교할지" 한 쌍으로 줄여요.'], ['점검표 ○가 안 없어져요', '고른 열 이름이 질문 문장에 그대로 들어가야 해요. 초안 가져오기를 눌러 확인해 보세요.']],
  understand: [['열 뜻이 어려워요', '데이터 고르기 단계의 "열 목록" 뜻을 읽어 보세요. 우리 말로 쉽게 바꿔 써도 돼요.']],
  method: [['빈칸 처리를 무엇으로 해야 할지 모르겠어요', '빈칸이 5% 이하이고 계산할 열이 아니면 "그대로 두기"가 무난해요. 확신이 없으면 이유를 솔직하게 쓰면 돼요.'], ['코드 설계 점검이 계속 ○예요', '틀의 괄호를 우리가 고른 열 이름·함수 이름으로 바꿔 썼는지 확인해요. 따옴표 안에 열 이름이 정확히 들어가야 해요.']],
  summary: [['빠진 단계가 있어요', '위의 "아직 덜 쓴 단계"를 눌러 이동해요.']],
}

const RIGHT = { team: TeamStep, career: CareerStep, data: DataStep, scene: SceneStep, question: QuestionStep, understand: UnderstandStep, method: MethodStep, summary: SummaryStep }

export default function Plan(props) {
  const { game, aiLeft, consumeAi, setChat, go: goTab } = props
  const [id, setId] = useState(PLAN_STEPS.find(s => !stepDone(s.id, game))?.id ?? 'summary')
  const idx = PLAN_STEPS.findIndex(s => s.id === id)
  const Step = RIGHT[id]
  const done = PLAN_STEPS.filter(s => stepDone(s.id, game)).length
  // 단계 안에서 다른 단계나 발표로 이동할 때 쓰는 go
  const go = target => (target === 'deck' ? goTab('deck') : setId(target))
  return (
    <div className="plan">
      <nav className="steps" aria-label="기획 단계">
        <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={PLAN_STEPS.length} aria-valuenow={done} aria-label="기획 진행률"><span style={{ width: `${(done / PLAN_STEPS.length) * 100}%` }} /></div>
        <ol>
          {PLAN_STEPS.map((s, i) => (
            <li key={s.id}>
              <button className={`${s.id === id ? 'cur' : ''} ${stepDone(s.id, game) ? 'done' : ''}`} aria-current={s.id === id ? 'step' : undefined} onClick={() => setId(s.id)}>
                <span className="dot">{stepDone(s.id, game) ? '✓' : i + 1}</span>
                <span><b>{s.name}</b>{s.doc && <small>기획안 {s.doc}</small>}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <section className="stage">
        <header><small>{idx + 1} / {PLAN_STEPS.length}</small><h2>{PLAN_STEPS[idx].name}</h2></header>
        <Step {...props} go={go} />
        <Stuck items={STUCK[id]} />
        <div className="row pager">
          <button className="ghost" disabled={idx === 0} onClick={() => setId(PLAN_STEPS[idx - 1].id)}>← 이전</button>
          {idx < PLAN_STEPS.length - 1 && <button className="primary" onClick={() => setId(PLAN_STEPS[idx + 1].id)}>다음 →</button>}
        </div>
      </section>
      <aside className="side">
        <Chat mode="plan" game={game} context={contextOf(game)} aiLeft={aiLeft} consumeAi={consumeAi} setChat={setChat}
          placeholder="예: 간호사가 꿈인데 이 데이터로 뭘 비교할 수 있을지 모르겠어요"
          examples={['이 데이터로 어떤 비교가 가능한지 모르겠어요', '내 질문이 너무 넓은지 봐 주세요', '예상을 어떻게 세워야 할지 모르겠어요']} />
      </aside>
    </div>
  )
}
