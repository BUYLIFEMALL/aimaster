'use client'

import { useState, useTransition } from 'react'
import { saveApiKeyAction, deleteApiKeyAction, type SaveApiKeyState } from './actions'
import type { ApiKeyProvider } from '@/utils/apiKeys'

interface ApiKeyRowProps {
  provider: ApiKeyProvider
  label: string
  maskedValue: string | null
}

// 루트 사이트(app/(embedded)/blog/*)가 이 컴포넌트를 직접 import해서 루트 자체 React(18,
// useActionState 없음)로 번들링하므로 useActionState를 쓰면 "블로그 자체 배포(React 19)에서는
// 멀쩡히 동작하다가 루트에 내장됐을 때만" 런타임 크래시가 난다 — useState+useTransition으로
// 동일한 pending/에러 상태를 대체 구현한다(2026-09-11, /blog/settings 실배포에서 발견).
export function ApiKeyRow({ provider, label, maskedValue }: ApiKeyRowProps) {
  const [state, setState] = useState<SaveApiKeyState>({})
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      setState(await saveApiKeyAction(state, formData))
    })
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-zinc-900">{label}</p>
        {maskedValue && (
          <form action={deleteApiKeyAction}>
            <input type="hidden" name="provider" value={provider} />
            <button type="submit" className="text-xs font-medium text-red-600 hover:underline">
              삭제
            </button>
          </form>
        )}
      </div>

      {maskedValue ? (
        <p className="font-mono text-sm text-zinc-500">{maskedValue} · 등록됨</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
          <input type="hidden" name="provider" value={provider} />
          <input
            name="apiKey"
            type="text"
            autoComplete="new-password"
            style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
            placeholder="API 키 입력"
            className="min-w-[220px] flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:border-[#005acc]"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-[#005acc] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isPending ? '저장 중...' : '저장'}
          </button>
        </form>
      )}
      {state.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
      {state.success && <p className="mt-1 text-xs text-emerald-600">저장되었습니다.</p>}
    </div>
  )
}
