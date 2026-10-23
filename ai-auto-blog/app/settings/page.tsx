'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/blog/utils/supabase/client'
import { getBlogBasePath, getBlogAuthPath } from '@/blog/utils/basePath'
import { PROVIDER_LABELS, maskApiKey, type ApiKeyProvider } from '@/blog/utils/apiKeyLabels'
import { ApiKeyRow } from './ApiKeyRow'
import { GuideLinkButton } from '@/blog/components/settings/GuideLinkButton'
import { ImageStorageNotice } from '@/blog/components/settings/ImageStorageNotice'
import { ExtensionSettings } from '@/blog/components/settings/ExtensionSettings'

// 본문 생성은 OpenAI·Claude·Gemini 중 고른 플랫폼의 키, 이미지 생성은 Gemini 키, 글감 수집은 Perplexity 키를 쓴다(2026-10-01).
// user_api_keys는 AIMaster 전체가 공유하는 테이블이라 여기서 등록한 키는 다른 프로그램에서도 그대로 쓰인다.
const ALL_PROVIDERS: ApiKeyProvider[] = ['openai', 'anthropic', 'gemini', 'perplexity', 'youtube_api_key']

// app/(main)/guides의 platform_guides.id — "AI 모델 API 키" 섹션의 등록 순서(OpenAI·
// Anthropic·Google·Perplexity)와 동일하게 맞췄다. 2026-10-01 이미지 저장을 Supabase Storage로 바꾸면서 Cloudinary 항목은 뺐다.
const GUIDE_LINKS: { guideId: string; label: string }[] = [
  { guideId: '1c5c24e2-15d4-49b8-b907-0ac6843dee3a', label: 'OpenAI API 키 발급받기' },
  { guideId: 'd03f65c2-efbb-421f-a041-a075562e3b7a', label: 'Anthropic Claude API 키 발급받기' },
  { guideId: 'f442cd37-f1e0-42a7-a3de-f9a9acf47cc4', label: 'Google Gemini API 키 발급받기' },
  { guideId: '1df95d8b-6a27-4de0-b1d9-8bbc218534ad', label: 'Perplexity API 키 발급받기' },
  { guideId: '72d39d06-a7ca-4ab0-8327-f9bb085ac394', label: 'YouTube Data API 키 발급받기 (쇼츠 검색·분석용)' },
]

// 원래 서버 컴포넌트였는데, 루트 사이트에 내장(app/(main)/blog/settings/*)될 때는 다른 blog
// 페이지들(dashboard/candidates/posts 등)과 마찬가지로 클라이언트 컴포넌트 + 브라우저
// Supabase 클라이언트로 직접 조회하는 방식이어야 한다 — 서버 컴포넌트를 'use client' 래퍼
// 안에서 그대로 import/렌더링하면 next/headers(cookies)를 못 써서 깨진다. 이 페이지가
// 루트에 아예 연결되어 있지 않았던 것도 이 문제 때문으로 보인다(2026-08-22 발견).
export default function SettingsPage() {
  const router = useRouter()
  const [supabase, setSupabase] = useState<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any
  const [loading, setLoading] = useState(true)
  const [keyMap, setKeyMap] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSupabase(createClient())
    }
  }, [])

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getUser().then(async ({ data }: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const user = data?.user
      if (!user) {
        router.push(`${getBlogAuthPath()}?redirect=${getBlogBasePath()}/settings`)
        return
      }

      const { data: keys } = await supabase.from('user_api_keys').select('provider, api_key').eq('user_id', user.id)

      setKeyMap(new Map((keys ?? []).map((k: { provider: string; api_key: string }) => [k.provider, k.api_key])))
      setLoading(false)
    })
  }, [supabase, router])

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-sm text-zinc-400">불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold text-zinc-900">API 키 설정</h1>
      <p className="mb-6 text-sm text-zinc-600">
        AI 글·이미지 생성은 여기 등록한 본인 API 키로만 동작합니다. 이 키는
        AIMaster 계정에 연결되어 threads 등 다른 프로그램에서도 동일하게 사용됩니다.
      </p>

      <div className="space-y-6">
        <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-zinc-900">🤖 AI 모델 API 키</h2>
            <p className="text-xs text-zinc-500">
              본문 생성에는 AI 글쓰기 화면에서 고른 플랫폼(OpenAI·Anthropic·Gemini)의 키가, 이미지
              생성에는 Gemini 키가, "글감 수집"에는 Perplexity 키가 쓰입니다. 등록해야 해당 기능이
              동작합니다.
            </p>
          </div>
          <div className="space-y-3">
            {ALL_PROVIDERS.map((provider) => (
              <ApiKeyRow
                key={provider}
                provider={provider}
                label={PROVIDER_LABELS[provider]}
                maskedValue={keyMap.has(provider) ? maskApiKey(keyMap.get(provider)!) : null}
              />
            ))}
          </div>
        </section>

        <ExtensionSettings />

        <ImageStorageNotice />

        <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-zinc-900">📖 연동 매뉴얼</h2>
            <p className="text-xs text-zinc-500">
              이 프로그램에서 사용하는 API 키 발급 방법을 팝업창으로 열어 옆에 두고 그대로 따라 할
              수 있습니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {GUIDE_LINKS.map((guide) => (
              <GuideLinkButton key={guide.guideId} guideId={guide.guideId} label={guide.label} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
