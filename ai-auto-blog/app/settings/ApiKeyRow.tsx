'use client'

import { useState, useTransition } from 'react'
import { saveApiKeyAction, deleteApiKeyAction, type SaveApiKeyState } from './actions'
import type { ApiKeyProvider } from '@/utils/apiKeys'

const PLATFORM_LINKS: Record<string, { icon: string; name: string; createUrl: string; signupUrl: string; note: string }> = {
  openai: {
    icon: '🤖',
    name: 'OpenAI (GPT-4o)',
    createUrl: 'https://platform.openai.com/api-keys',
    signupUrl: 'https://platform.openai.com/signup',
    note: '고품질 블로그 원고 및 본문 작성에 사용됩니다.',
  },
  anthropic: {
    icon: '🧠',
    name: 'Anthropic Claude',
    createUrl: 'https://console.anthropic.com/settings/keys',
    signupUrl: 'https://console.anthropic.com/',
    note: '자연스러운 문체 원고 작성에 사용됩니다.',
  },
  gemini: {
    icon: '✨',
    name: 'Google Gemini',
    createUrl: 'https://aistudio.google.com/app/apikey',
    signupUrl: 'https://aistudio.google.com/',
    note: '초고속 원고 및 고화질 삽화 생성에 필수입니다.',
  },
  perplexity: {
    icon: '🔍',
    name: 'Perplexity AI',
    createUrl: 'https://www.perplexity.ai/settings/api',
    signupUrl: 'https://www.perplexity.ai/',
    note: '실시간 검색 및 최신 트렌드 이슈 글감 수집에 사용됩니다.',
  },
  youtube_api_key: {
    icon: '📺',
    name: 'YouTube Data API v3',
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
    <div className="rounded-xl border border-zinc-200/90 bg-white shadow-xs overflow-hidden transition-all hover:border-zinc-300">
      {/* 1행: 플랫폼 가이드 및 우상단 공식 링크/콘솔 버튼 2개 */}
      {linkInfo && (
        <div className="px-4 py-2.5 bg-zinc-50/80 border-b border-zinc-200/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm shrink-0">{linkInfo.icon}</span>
            <span className="text-xs font-bold text-zinc-800 shrink-0">{linkInfo.name}</span>
            <span className="text-[11px] text-zinc-500 truncate hidden sm:inline">· {linkInfo.note}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={linkInfo.createUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-create-key"
              title="해당 플랫폼 공식 콘솔에서 새 API 키 발급/생성하기"
            >
              <span>🔑</span>
              <span>API 키 발급/생성</span>
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
        </div>
      )}

      {/* 2행: 실제 키 관리 한 행 (라벨 + 키 상태 박스 + 수정/삭제) */}
      <div className="p-4 bg-white flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <span className="text-xs sm:text-sm font-bold text-zinc-900 whitespace-nowrap">{label}</span>
            {!showForm && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-50 border border-zinc-200/80 font-mono text-xs text-zinc-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-xs" />
                <span className="font-semibold text-zinc-800">{maskedValue}</span>
                <span className="text-zinc-400">·</span>
                <span className="text-emerald-700 font-sans font-medium text-[11px]">연동 완료</span>
              </div>
            )}
          </div>

          {maskedValue && !isEditing && (
            <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-xs font-semibold text-zinc-700 hover:text-blue-600 px-2.5 py-1 rounded-md hover:bg-blue-50 border border-zinc-200 hover:border-blue-200 transition-colors"
              >
                수정
              </button>
              <form action={deleteApiKeyAction}>
                <input type="hidden" name="provider" value={provider} />
                <button
                  type="submit"
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-2.5 py-1 rounded-md hover:bg-rose-50 border border-zinc-200 hover:border-rose-200 transition-colors"
                >
                  삭제
                </button>
              </form>
            </div>
          )}
        </div>

        {/* 폼 열림 상태 (입력창) */}
        {showForm && (
          <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-zinc-100">
            <input type="hidden" name="provider" value={provider} />
            <input
              name="apiKey"
              type="text"
              autoComplete="new-password"
              style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
              placeholder={maskedValue ? `새 키 입력 (현재: ${maskedValue})` : 'API 키 입력'}
              className="min-w-[240px] flex-1 rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
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
        )}

        {state.error && <p className="mt-1 text-xs font-medium text-rose-600">⚠️ {state.error}</p>}
      </div>
    </div>
  )
}
