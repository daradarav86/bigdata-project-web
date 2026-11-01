import { useRef, useState } from 'react'
import { getDs, LIMITS } from './data/meta.js'
import { statFor, missingOf, nameOf, measureName, concernMain, isFreq, usedColsOf, speakersOf, isGoogleUrl } from './doc.js'
import { Text } from './ui.jsx'
import { josa } from './josa.js'
import { FIELD, shrink } from './deckFields.js'

// 비어 있으면 빨간 빈칸 박스, 있으면 굵은 글씨
const V = ({ v, ph = '' }) => (v && String(v).trim() ? <b className="v">{v}</b> : <span className="blank">{ph || '    '}</span>)

const Title = ({ kw, rest }) => <h3 className="s-title">[ <span>{kw}</span> ]{rest && <small> {rest}</small>}</h3>

/* ---------- 슬라이드 7장 (기획안 5번 시간표와 같다) ---------- */
function slides({ g, d, ds }) {
  const members = g.members.map(nameOf)
  const s = statFor(g)
  return [
    {
      time: '0:00~0:15', label: '제목',
      view: (
        <div className="s-cover">
          <p className="s-q"><V v={g.title || g.question} ph="프로젝트 제목" /></p>
          <p className="s-team">{g.team || '( )조'} · {members.join(', ')}</p>
          <p className="s-career">우리 진로: <V v={g.keyword} /></p>
        </div>
      ),
      form: <p className="muted small">제목·팀원·진로는 "기획"의 "기획안 완성"과 "우리 팀"에서 바꿔요.</p>,
    },
    {
      time: '0:15~0:40', label: '진로와 궁금증',
      view: (
        <>
          <Title kw="진로" rest="와 궁금했던 점" />
          <p>우리는 <V v={g.keyword} /> 진로를 생각하고 있어요.</p>
          <p>이 진로에서는 <V v={d.know} ph="알아야 할 것" />{josa(d.know, '을(를)')} 알아야 해서, <V v={d.wonder || concernMain(g)} ph="궁금한 것" />{josa(d.wonder || concernMain(g), '이(가)')} 궁금했습니다.</p>
          <ul className="s-list">{g.members.map((m, i) => <li key={i}>{nameOf(m, i)}: <V v={m.career} /></li>)}</ul>
        </>
      ),
      fields: ['know', 'wonder'],
    },
    {
      time: '0:40~1:10', label: '질문과 데이터',
      view: (
        <>
          <Title kw="질문" rest="과 데이터" />
          <p className="s-q small"><V v={g.question} ph="탐구 질문" /></p>
          <p>데이터: <V v={ds && `${ds.id}.csv`} /> | 한 행 = <V v={g.rowMeaning} /> | <V v={ds && ds.rows.toLocaleString()} />행 × <V v={ds && ds.columns.length} />열</p>
          <ul className="s-list">{usedColsOf(g).map(c => <li key={c.name}><code>{c.name}</code> {c.meaning}</li>)}</ul>
          <p>숫자 요약: <code>{measureName(g) || '(열)'}</code> 값 <V v={d.cnt} />개, 평균 <V v={d.mean} /> · 중앙값 <V v={d.median} /> → <V v={d.pick} ph="평균/중앙값" />으로 요약</p>
        </>
      ),
      fields: ['cnt', 'mean', 'median', 'pick'],
    },
    {
      time: '1:10~2:00', label: '결과',
      view: (
        <>
          <Title kw="결과" />
          <div className="s-result">
            <div className="s-graph">{d.graph ? <img src={d.graph} alt="결과 그래프" /> : <span className="blank wide">노트북의 그래프를 붙여 넣어요</span>}</div>
            <div className="s-nums">
              <div><small>가장 큰 값</small><p><V v={d.hi} ph="그룹" /> : <V v={d.hiVal} ph="값" /></p></div>
              <div><small>가장 작은 값</small><p><V v={d.lo} ph="그룹" /> : <V v={d.loVal} ph="값" /></p></div>
              <div><small>차이</small><p><V v={d.diffPts} ph="" />점 (<V v={d.diffX} ph="" />배)</p></div>
            </div>
          </div>
        </>
      ),
      fields: ['graph', 'hi', 'hiVal', 'lo', 'loVal', 'diffPts', 'diffX'],
    },
    {
      time: '2:00~2:35', label: '해석과 한계',
      view: (
        <>
          <Title kw="해석" rest="과 한계" />
          {/* 기획안 4-5 해석 틀과 같은 문장. 조사는 한글·숫자로 끝나면 맞춰 고르고, 영어(yes, GP)면 학습지처럼 "이(가)"로 둔다 */}
          <p>① <V v={g.groupBy} />별 {isFreq(g) ? <>개수(빈도)는</> : <><V v={g.measure} />의 {s.topic}</>} <V v={d.hi} />{josa(d.hi, '이(가)')} 가장 높고(<V v={d.hiVal} />), <V v={d.lo} />{josa(d.lo, '이(가)')} 가장 낮았다(<V v={d.loVal} />).</p>
          <p>② 두 집단의 차이는 <V v={d.diffPts && `${d.diffPts}점`} />이다.</p>
          <p>③ 이는 <V v={d.m1 || g.groupBy} />{josa(d.m1 || g.groupBy, '와(과)')} <V v={d.m2 || measureName(g)} />{josa(d.m2 || measureName(g), '이(가)')} 함께 움직이는 경향을 보여 준다.</p>
          <p>한계: 다만 <V v={d.limit} ph="이유" /> 때문에 이 결과를 모든 대상에게 일반화하기 어렵다.</p>
          <p className="small">결측값(NaN) 처리 비교: 원본 <V v={d.orig} /> / 제거 <V v={d.rem} />(<V v={d.remRows} />행) / 대체 <V v={d.rep} /> → <V v={missingOf(g.missingMethod)?.ko} />, 이유: <V v={g.missingWhy} /></p>
        </>
      ),
      fields: ['m1', 'm2', 'limit', 'orig', 'rem', 'remRows', 'rep'],
    },
    {
      time: '2:35~3:00', label: '진로와 연결',
      view: (
        <>
          <Title kw="진로" rest="와 연결" />
          <p>이 결과는 <V v={d.job || g.keyword} ph="직업" />{josa(d.job || g.keyword, '이(가)')} <V v={d.doing} ph="일" />{josa(d.doing, '을(를)')} 할 때 <V v={d.use} ph="쓰임" />{josa(d.use, '으로(로)')} 참고할 수 있어요.</p>
          <p>다만 <V v={d.careful} ph="확인할 것" />도 함께 확인해야 해요.</p>
          <p>다음에 알고 싶은 것: <V v={d.next} /></p>
          <p className="s-closing">마무리 (모두 함께): 우리가 알게 된 것은 <V v={d.closing} ph="한 문장" /> 입니다.</p>
        </>
      ),
      fields: ['job', 'doing', 'use', 'careful', 'next', 'closing'],
    },
    {
      time: '질문 3분', label: '예상 질문',
      view: (
        <>
          <Title kw="예상 질문" rest="과 우리의 답" />
          <p>Q1. <V v={d.q1} ph="예상 질문" /></p>
          <p>A1. <V v={d.a1} ph="우리의 답" /></p>
          <p>Q2. <V v={d.q2} ph="예상 질문" /></p>
          <p>A2. <V v={d.a2} ph="우리의 답" /></p>
        </>
      ),
      fields: ['q1', 'a1', 'q2', 'a2'],
    },
  ]
}

export default function Deck({ game, setDeck, go }) {
  const [i, setI] = useState(0)
  const [err, setErr] = useState('')
  const wrap = useRef(null)
  const d = game.deck
  const ds = getDs(game.dataset)
  const list = slides({ g: game, d, ds })
  const cur = list[i]
  const members = game.members.map(nameOf)
  const speakers = speakersOf(d)
  const setSpeaker = v => setDeck({ [`speaker${i}`]: v }) // 장마다 따로 저장 (doc.js speakersOf)

  const load = async file => {
    setErr('')
    try { setDeck({ graph: await shrink(file) }) } catch (e) { setErr(e.message) }
  }
  const onPaste = e => {
    const f = [...(e.clipboardData?.files ?? [])].find(x => x.type.startsWith('image/'))
    if (f) { e.preventDefault(); load(f) }
  }
  const key = e => {
    if (e.target.closest('input, textarea, select')) return
    if (e.key === 'ArrowRight') setI(n => Math.min(list.length - 1, n + 1))
    if (e.key === 'ArrowLeft') setI(n => Math.max(0, n - 1))
  }
  const full = () => { try { wrap.current?.requestFullscreen?.() } catch { /* 전체 화면 불가 */ } }

  return (
    <div className="deck" onPaste={onPaste} onKeyDown={key}>
      <div className="deckmain">
        <div className="slidebar">
          <span className="muted small">{i + 1} / {list.length} · {cur.time}</span>
          <span className="spacer" />
          <button className="ghost" onClick={full}>전체 화면</button>
          <button className="ghost" onClick={() => window.print()}>인쇄 / PDF</button>
          {isGoogleUrl(game.folderUrl) && <a className="ghost linkbtn" href={game.folderUrl.trim()} target="_blank" rel="noopener noreferrer">조 공유 폴더</a>}
        </div>
        <div className="slidewrap" ref={wrap} tabIndex={0} aria-label={`슬라이드 ${i + 1}: ${cur.label}`}>
          <article className="slide">
            <div className="s-head"><span>빅데이터 원리 탐구</span><span>원묵고등학교</span></div>
            <div className="s-body">{cur.view}</div>
            <div className="s-foot">{cur.time} · {i + 1}/{list.length}</div>
          </article>
        </div>
        <div className="row pager">
          <button className="ghost" disabled={i === 0} onClick={() => setI(i - 1)}>← 이전 장</button>
          <button className="ghost" disabled={i === list.length - 1} onClick={() => setI(i + 1)}>다음 장 →</button>
        </div>
        <p className="muted small">발표 연습이 끝나면 [인쇄 / PDF] → 대상 "PDF로 저장"으로 저장해서 우리 조 공유 폴더에 올려요.</p>
        <ol className="thumbs">
          {list.map((s, n) => <li key={s.label}><button className={n === i ? 'on' : ''} aria-current={n === i ? 'true' : undefined} onClick={() => setI(n)}><b>{n + 1}</b> {s.label}<small>{s.time}</small></button></li>)}
        </ol>
      </div>

      <aside className="deckform">
        <h3>{i + 1}장 · {cur.label}</h3>
        {i === 0 && cur.form}
        {i === 3 && (
          <div className="field">
            <span className="lbl">결과 그래프</span>
            <p className="hint">Colab 그래프를 오른쪽 클릭 → 이미지 복사 → 이 화면에서 붙여넣기(Ctrl+V). 또는 파일을 선택해요.</p>
            <input type="file" accept="image/*" aria-label="그래프 이미지 파일" onChange={e => e.target.files[0] && load(e.target.files[0])} />
            {err && <p className="warn small" role="alert">{err}</p>}
            {d.graph && <button className="ghost" onClick={() => setDeck({ graph: '' })}>그래프 지우기</button>}
          </div>
        )}
        {(cur.fields ?? []).filter(k => k !== 'graph').map(k => (
          <Text key={k} label={FIELD[k][0]} hint={FIELD[k][1]} value={d[k] ?? ''} max={80} onChange={v => setDeck({ [k]: v })} />
        ))}
        {i === 4 && (
          <div className="chips" aria-label="한계 후보">
            {/* "…없다." → "…없기": 슬라이드에서 "다만 …없기 때문에"로 이어진다 */}
            {LIMITS.map(l => <button key={l} onClick={() => setDeck({ limit: l.replace(/다\.$/, '기') })}>{l}</button>)}
          </div>
        )}
        {i === 3 && game.groupBy && <p className="hint">노트북의 <code>result</code> 표에서 가장 큰·작은 그룹을 읽어요. 가장 큰 값 <code>result.idxmax()</code>, 가장 작은 값 <code>result.idxmin()</code>.</p>}
        <label className="field">
          <span className="lbl">이 장을 말하는 사람</span>
          <select value={speakers[i] ?? ''} onChange={e => setSpeaker(e.target.value)} aria-label="말하는 사람">
            <option value="">(정하지 않음)</option>
            {members.map(n => <option key={n} value={n}>{n}</option>)}
            <option value="모두 함께">모두 함께</option>
          </select>
        </label>
        <p className="muted small">팀원 모두가 한 번 이상 말해요. 지금 정한 사람: {speakers.filter(Boolean).length ? [...new Set(speakers.filter(Boolean))].join(', ') : '없음'}</p>
        <button className="link small" onClick={() => go('plan')}>기획 내용 고치러 가기</button>
      </aside>

      {/* 인쇄용: 7장 전체 */}
      <div className="printdeck" aria-hidden="true">
        {list.map((s, n) => (
          <div className="slidewrap" key={s.label}>
            <article className="slide">
              <div className="s-head"><span>빅데이터 원리 탐구</span><span>원묵고등학교</span></div>
              <div className="s-body">{s.view}</div>
              <div className="s-foot">{s.time} · {n + 1}/{list.length}{speakers[n] ? ` · ${speakers[n]}` : ''}</div>
            </article>
          </div>
        ))}
      </div>
    </div>
  )
}
