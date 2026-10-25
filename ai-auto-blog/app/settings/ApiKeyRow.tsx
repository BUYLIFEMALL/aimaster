'use client'

import { useState, useTransition } from 'react'
import { saveApiKeyAction, deleteApiKeyAction, type SaveApiKeyState } from './actions'
import type { ApiKeyProvider } from '@/utils/apiKeys'

const PLATFORM_LINKS: Record<string, { createUrl: string; signupUrl: string; note: string }> = {
  openai: {
    createUrl: 'https://platform.openai.com/api-keys',
    signupUrl: 'https://platform.openai.com/signup',
    note: 'GPT-4o 고품질 블로그 원고 작성에 사용됩니다.',
  },
  anthropic: {
    createUrl: 'https://console.anthropic.com/settings/keys',
    signupUrl: 'https://console.anthropic.com/',
    note: 'Claude 3.5 자연스러운 문체 원고 작성에 사용됩니다.',
  },
  gemini: {
    createUrl: 'https://aistudio.google.com/app/apikey',
    signupUrl: 'https://aistudio.google.com/',
    note: 'Gemini 초고속 원고 및 나노바나나 고화질 삽화 생성에 필수입니다.',
  },
  perplexity: {
    createUrl: 'https://www.perplexity.ai/settings/api',
    signupUrl: 'https://www.perplexity.ai/',
    note: '실시간 검색 및 최신 이슈 글감 수집에 사용됩니다.',
  },
  youtube_api_key: {
    createUrl: 'https://console.cloud.google.com/apis/credentials',
    signupUrl: 'https://console.cloud.google.com/',
    note: '유튜브 쇼츠 트렌드 키워드 검색 및 분석에 사용됩니다.',
  },
};

interface ApiKeyRowProps {
  provider: ApiKeyProvider
  label: string
  maskedValue: string | null
}

export function ApiKeyRow({ provider, label, maskedValue }: ApiKeyRowProps) {
  const [state, setState] = useState<SaveApiKeyState>({})
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await saveApiKeyAction(state, formData)
      setState(result)
      if (result.success) setIsEditing(false)
    })
  }

  const showForm = !maskedValue || isEditing
  const linkInfo = PLATFORM_LINKS[provider]

  return (
    <div className="rounded-xl border border-zinc-200/90 bg-white p-4 sm:p-5 shadow-xs hover:border-zinc-300 transition-all">
      {/* 1. 상단 타이틀 + 수정/삭제 버튼 (완벽한 가로 1행 분리) */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-bold text-zinc-900 tracking-tight">{label}</span>
        </div>
        {maskedValue && !isEditing && (
          <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 px-2.5 py-1 rounded-md hover:bg-emerald-50 border border-emerald-200/80 transition-colors"
            >
              수정
            </button>
            <form action={deleteApiKeyAction}>
              <input type="hidden" name="provider" value={provider} />
              <button
                type="submit"
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-2.5 py-1 rounded-md hover:bg-rose-50 border border-rose-200/80 transition-colors"
              >
                삭제
              </button>
            </form>
          </div>
        )}
      </div>

      {/* 2. 공식 플랫폼 2단 퀵 액션 버튼 세트 (상하 독립 영역으로 깔끔하게 배치) */}
      {linkInfo && (
        <div className="mb-3.5 p-3 rounded-lg bg-zinc-50 border border-zinc-200/80">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={linkInfo.createUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-create-key"
              title="해당 플랫폼 공식 콘솔에서 새 API 키 발급/생성하기"
            >
              <span>🔑</span>
              <span>API 키 발급/생성하기</span>
              <span className="text-[10px] opacity-80">↗</span>
            </a>
            <a
              href={linkInfo.signupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-platform-signup"
              title="해당 플랫폼 회원가입 및 관리 콘솔 바로가기"
            >
              <span>👤</span>
              <span>회원가입 / 콘솔</span>
              <span className="text-[10px] opacity-80">↗</span>
            </a>
          </div>
          {linkInfo.note && (
            <p className="mt-2 text-[11.5px] text-zinc-500 font-medium">
              {linkInfo.note}
            </p>
          )}
        </div>
      )}

      {/* 3. API 키 입력 폼 또는 등록 상태 표시 */}
      {showForm ? (
        <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="provider" value={provider} />
          <input
            name="apiKey"
            type="text"
            autoComplete="new-password"
            style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
            placeholder={maskedValue ? `새 키 입력 (현재: ${maskedValue})` : 'API 키 입력'}
            className="min-w-[220px] flex-1 rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-800 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
          />
          <button
            type="submit"
            disabled={isPending}
            className="btn-3d-primary px-4 py-2 text-xs font-bold"
          >
            {isPending ? '저장 중...' : '저장'}
          </button>
          {maskedValue && (
            <button
              type="button"
              onClick={() => {
                setIsEditing(false)
                setState({})
              }}
              className="rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              취소
            </button>
          )}
        </form>
      ) : (
        <div className="flex items-center gap-2 font-mono text-xs text-zinc-600 bg-zinc-50 px-3 py-2 rounded-lg border border-zinc-200/60">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-xs" />
          <span className="font-semibold text-zinc-800">{maskedValue}</span>
          <span className="text-zinc-400">·</span>
          <span className="text-emerald-700 font-sans font-medium text-[11px]">연동 완료</span>
        </div>
      )}
      {state.error && <p className="mt-1.5 text-xs font-medium text-rose-600">⚠️ {state.error}</p>}
    </div>
  )
}
