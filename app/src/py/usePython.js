import { useCallback, useEffect, useRef, useState } from 'react'

const RUN_TIMEOUT_MS = 20000 // 이보다 오래 걸리면 (무한 반복 등) 워커를 끄고 다시 준비한다

// 파이썬 실행기: App 위쪽에서 한 번만 만들어 탭을 옮겨도 변수(df 등)가 유지되게 한다.
export function usePython() {
  const [status, setStatus] = useState('idle') // idle | loading | ready | running
  const [stage, setStage] = useState('')
  const [fatal, setFatal] = useState('')
  const worker = useRef(null)
  const waiting = useRef(new Map()) // 실행 요청 id → { resolve, timer }
  const seq = useRef(0)

  const killWorker = () => {
    worker.current?.terminate()
    worker.current = null
    for (const [, w] of waiting.current) { clearTimeout(w.timer); w.resolve({ timeout: true }) }
    waiting.current.clear()
  }

  const start = useCallback(() => {
    if (worker.current) return
    setFatal('')
    setStatus('loading')
    const w = new Worker(new URL('./pyWorker.js', import.meta.url), { type: 'module' })
    worker.current = w
    w.onmessage = ({ data }) => {
      if (data.type === 'progress') setStage(data.stage)
      else if (data.type === 'ready') { setStatus('ready'); setStage('') }
      else if (data.type === 'result' || data.type === 'summary') {
        const p = waiting.current.get(data.id)
        if (p) { clearTimeout(p.timer); waiting.current.delete(data.id); p.resolve(data) }
        setStatus('ready')
      } else if (data.type === 'fatal') {
        const p = waiting.current.get(data.id)
        if (p) { clearTimeout(p.timer); waiting.current.delete(data.id); p.resolve({ fatal: data.message }); setStatus('ready') }
        else { setFatal(data.message); setStatus('idle'); killWorker() }
      }
    }
    w.onerror = e => { setFatal(e.message || '파이썬을 불러오지 못했어요.'); setStatus('idle'); killWorker() }
    w.postMessage({ type: 'init' })
  }, [])

  // 준비가 끝날 때까지 기다린다 (준비 도중에 실패하면 false)
  const statusRef = useRef(status)
  useEffect(() => { statusRef.current = status }, [status])
  const whenReady = useCallback(() => new Promise(resolve => {
    let waited = 0
    const tick = () => {
      const s = statusRef.current
      if (s === 'ready' || s === 'running') resolve(true)
      else if (s === 'idle' && waited > 600) resolve(false) // 시작 직후의 idle은 잠깐 기다린다
      else { waited += 200; setTimeout(tick, 200) }
    }
    tick()
  }), [])

  const call = useCallback((message, timeoutMs) => new Promise(resolve => {
    const id = ++seq.current
    const timer = setTimeout(() => {
      // 너무 오래 걸림: 워커를 끄고 환경을 다시 준비한다 (변수는 사라진다)
      worker.current?.terminate(); worker.current = null
      waiting.current.delete(id)
      resolve({ timeout: true })
      setStatus('idle')
      start()
    }, timeoutMs)
    waiting.current.set(id, { resolve, timer })
    setStatus('running')
    worker.current.postMessage({ ...message, id })
  }), [start])

  const run = useCallback(async code => {
    if (!worker.current) start()
    const ok = await whenReady()
    if (!ok || !worker.current) return { fatal: '파이썬을 준비하지 못했어요. 새로고침한 뒤 다시 해 보세요.' }
    return call({ type: 'run', code }, RUN_TIMEOUT_MS)
  }, [start, whenReady, call])

  const summary = useCallback(async () => {
    if (!worker.current) return null
    const r = await call({ type: 'summary' }, 5000)
    return r.summary ?? null
  }, [call])

  useEffect(() => () => killWorker(), [])

  return { status, stage, fatal, start, run, summary }
}
