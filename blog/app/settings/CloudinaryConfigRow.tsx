'use client'

import { useActionState } from 'react'
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

const initialState: SaveCloudinaryState = {}

export function CloudinaryConfigRow({ cloudName, maskedApiKey, maskedApiSecret }: CloudinaryConfigRowProps) {
  const [state, formAction, isPending] = useActionState(saveCloudinaryConfigAction, initialState)
  const isConfigured = !!cloudName

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-zinc-900">Cloudinary (생성 이미지 업로드)</p>
        {isConfigured && (
          <form action={deleteCloudinaryConfigAction}>
            <button type="submit" className="text-xs font-medium text-red-600 hover:underline">
              삭제
            </button>
          </form>
        )}
      </div>
      <p className="mb-3 text-xs text-zinc-500">
        등록하면 AI로 생성한 이미지를 본문에 직접 삽입(base64)하지 않고 본인 Cloudinary
        계정에 업로드한 뒤 그 링크를 삽입합니다. 등록하지 않으면 기존처럼 base64로 삽입됩니다.
      </p>

      {isConfigured ? (
        <div className="space-y-1 font-mono text-sm text-zinc-500">
          <p>Cloud Name: {cloudName}</p>
          <p>API Key: {maskedApiKey}</p>
          <p>API Secret: {maskedApiSecret}</p>
        </div>
      ) : (
        <form action={formAction} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input
            name="cloudName"
            type="text"
            autoComplete="off"
            placeholder="Cloud Name"
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:border-[#005acc]"
          />
          <input
            name="apiKey"
            type="text"
            autoComplete="new-password"
            style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
            placeholder="API Key"
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:border-[#005acc]"
          />
          <input
            name="apiSecret"
            type="text"
            autoComplete="new-password"
            style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
            placeholder="API Secret"
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:border-[#005acc]"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-[#005acc] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 sm:col-span-3"
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
