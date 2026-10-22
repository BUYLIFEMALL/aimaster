'use client'

// 2026-10-23: 버튼 한 번으로 확장 연결 — 연결 코드를 만들어 이 화면의 확장(web-bridge.js)에 바로 넘긴다(복사·붙여넣기 없음).
// auto: 확장의 「자동 연결」 버튼으로 열린 화면이면 들어오자마자 연결하고, 확장이 이 탭을 닫는다. 기준 구현: naver-blog-seo-studio.
import { useEffect, useRef, useState } from 'react'
import { askExtension } from '@/blog/utils/extensionBridge'
import { createExtensionToken, type ExtensionToken } from '@/blog/app/settings/extensionTokenActions'

type State = { kind: 'idle' | 'working' | 'done' | 'error'; message: string }

export function ExtensionConnectButton({ auto = false, onIssued }: { auto?: boolean; onIssued?: (item: ExtensionToken) => void }) {
  const [state, setState] = useState<State>({ kind: 'idle', message: '' })
  const started = useRef(false)

  async function connect() {
    setState({ kind: 'working', message: '확장 프로그램을 확인하는 중...' })
    const ping = await askExtension<{ ok?: boolean }>('ping', 1500)
    if (!ping?.ok) return setState({ kind: 'error', message: '이 브라우저에서 확장 프로그램을 찾지 못했습니다. 확장을 설치(또는 새로고침)한 뒤 이 화면을 새로고침해 주세요.' })
    setState({ kind: 'working', message: '연결 코드를 만들어 확장에 넘기는 중...' })
    const issued = await createExtensionToken(`확장 자동 연결 · ${new Date().toLocaleString('ko-KR')}`)
    if (!issued.token || !issued.item) return setState({ kind: 'error', message: issued.error ?? '연결 코드를 만들지 못했습니다.' })
    onIssued?.(issued.item)
    const result = await askExtension<{ ok?: boolean; email?: string; error?: string }>('connect', 15000, { token: issued.token, closeTab: auto })
    if (!result) return setState({ kind: 'error', message: '확장이 응답하지 않았습니다. 확장을 최신 버전으로 업데이트한 뒤 다시 시도해 주세요.' })
    if (!result.ok) return setState({ kind: 'error', message: result.error || '확장 연결에 실패했습니다.' })
    setState({ kind: 'done', message: `확장 연결 완료: ${result.email ?? ''}${auto ? ' · 이 탭은 곧 닫힙니다.' : ''}` })
  }

  useEffect(() => {
    if (!auto || started.current) return
    started.current = true
    // 확장 버튼으로 열린 화면에서는 한 번만 자동 실행한다(마운트 직후 다음 순간에 시작).
    const timer = window.setTimeout(() => { void connect() }, 0)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto])

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={connect}
        disabled={state.kind === 'working'}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {state.kind === 'working' ? '연결 중...' : '확장 프로그램 바로 연결'}
      </button>
      {state.message && <p className={`text-xs ${state.kind === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>{state.message}</p>}
    </div>
  )
}
