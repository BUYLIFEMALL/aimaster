'use client'

import { useActionState } from 'react'
import { saveApiKeyAction, deleteApiKeyAction, type SaveApiKeyState } from './actions'
import type { ApiKeyProvider } from '@/utils/apiKeys'

interface ApiKeyRowProps {
  provider: ApiKeyProvider
  label: string
  maskedValue: string | null
}

const initialState: SaveApiKeyState = {}

export function ApiKeyRow({ provider, label, maskedValue }: ApiKeyRowProps) {
  const [state, formAction, isPending] = useActionState(saveApiKeyAction, initialState)

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
        <form action={formAction} className="flex flex-wrap gap-2">
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
