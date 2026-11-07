'use client'

import { useState } from 'react'

// U10 2차(2026-11-07): 글 보기 → 「📨 업무 워크스페이스로 보내기」. 서버(/api/work-inbox)가 회원 본인 글을 읽어 보낸다.
export default function SendToWorkspaceButton({ postId }: { postId: number }) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [inboxUrl, setInboxUrl] = useState('')

  async function send() {
    if (state === 'sending') return
    setState('sending')
    setMessage('')
    try {
      const res = await fetch('/api/work-inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: postId }),
      })
      const json = (await res.json().catch(() => ({}))) as { error?: string; inboxUrl?: string }
      if (!res.ok) throw new Error(json.error || '업무 워크스페이스로 보내지 못했습니다.')
      setInboxUrl(json.inboxUrl ?? '')
      setMessage('업무 워크스페이스 「받은 업무」로 보냈습니다. 그곳에서 콘텐츠 캘린더에 넣거나 페이지로 만들 수 있습니다.')
      setState('done')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '업무 워크스페이스로 보내지 못했습니다.')
      setState('error')
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={state === 'sending'}
        onClick={() => void send()}
        title="이 글을 업무 워크스페이스 「받은 업무」로 보냅니다(콘텐츠 캘린더에 넣을 수 있음)"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-violet-50 text-slate-700 hover:text-violet-700 text-xs font-semibold rounded-lg border border-slate-200 transition-all cursor-pointer shadow-sm disabled:opacity-60"
      >
        {state === 'sending' ? '⏳ 보내는 중...' : state === 'done' ? '✓ 워크스페이스로 보냄' : '📨 업무 워크스페이스로 보내기'}
      </button>
      {message && (
        <p className={`w-full !whitespace-normal text-xs ${state === 'error' ? 'text-rose-600' : 'text-emerald-700'}`}>
          {message}
          {state === 'done' && inboxUrl && (
            <>
              {' '}
              <a href={inboxUrl} target="_blank" rel="noopener noreferrer" className="underline">
                받은 업무 열기
              </a>
            </>
          )}
        </p>
      )}
    </>
  )
}
