'use client'

import { useState, useTransition } from 'react'
import {
  saveCloudinaryConfigAction,
  deleteCloudinaryConfigAction,
  type SaveCloudinaryState,
} from './actions'

interface CloudinaryConfigRowProps {
  cloudName: string | null
  maskedApiKey: string | null
  maskedApiSecret: string | null
}

// ApiKeyRow.tsx와 같은 이유로 useActionState 대신 useState+useTransition을 쓴다 — 루트 사이트가
// 이 컴포넌트를 React 18로 번들링해서 useActionState가 런타임 크래시를 냈다(2026-09-11).
export function CloudinaryConfigRow({ cloudName, maskedApiKey, maskedApiSecret }: CloudinaryConfigRowProps) {
  const [state, setState] = useState<SaveCloudinaryState>({})
  const [isPending, startTransition] = useTransition()
  const isConfigured = !!cloudName
  // ApiKeyRow.tsx와 동일하게, 이미 등록돼 있어도 "수정"으로 값을 바로 바꿀 수 있게 한다
  // (2026-09-16 사용자 피드백).
  const [isEditing, setIsEditing] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await saveCloudinaryConfigAction(state, formData)
      setState(result)
      if (result.success) setIsEditing(false)
    })
  }

  const showForm = !isConfigured || isEditing

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-zinc-900">Cloudinary (생성 이미지 업로드)</p>
        {isConfigured && !isEditing && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-xs font-medium text-emerald-600 hover:underline"
            >
              수정
            </button>
            <form action={deleteCloudinaryConfigAction}>
              <button type="submit" className="text-xs font-medium text-red-600 hover:underline">
                삭제
              </button>
            </form>
          </div>
        )}
      </div>
      <p className="mb-3 text-xs text-zinc-500">
        등록하면 AI로 생성한 이미지를 본문에 직접 삽입(base64)하지 않고 본인 Cloudinary
        계정에 업로드한 뒤 그 링크를 삽입합니다. 등록하지 않으면 기존처럼 base64로 삽입됩니다.
      </p>

      {showForm ? (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input
            name="cloudName"
            type="text"
            autoComplete="off"
            placeholder={isConfigured ? `새 Cloud Name (현재: ${cloudName})` : 'Cloud Name'}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:border-[#005acc]"
          />
          <input
            name="apiKey"
            type="text"
            autoComplete="new-password"
            style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
            placeholder={isConfigured ? `새 API Key (현재: ${maskedApiKey})` : 'API Key'}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:border-[#005acc]"
          />
          <input
            name="apiSecret"
            type="text"
            autoComplete="new-password"
            style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
            placeholder={isConfigured ? `새 API Secret (현재: ${maskedApiSecret})` : 'API Secret'}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:border-[#005acc]"
          />
          <button
            type="submit"
            disabled={isPending}
            className={`rounded-lg bg-[#005acc] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${isConfigured ? 'sm:col-span-2' : 'sm:col-span-3'}`}
          >
            {isPending ? '저장 중...' : '저장'}
          </button>
          {isConfigured && (
            <button
              type="button"
              onClick={() => {
                setIsEditing(false)
                setState({})
              }}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600"
            >
              취소
            </button>
          )}
        </form>
      ) : (
        <div className="space-y-1 font-mono text-sm text-zinc-500">
          <p>Cloud Name: {cloudName}</p>
          <p>API Key: {maskedApiKey}</p>
          <p>API Secret: {maskedApiSecret}</p>
        </div>
      )}
      {state.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
      {state.success && <p className="mt-1 text-xs text-emerald-600">저장되었습니다.</p>}
    </div>
  )
}
