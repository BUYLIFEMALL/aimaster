'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/blog/utils/supabase/client'
import { getBlogBasePath, getBlogAuthPath } from '@/blog/utils/basePath'
import { PROVIDER_LABELS, maskApiKey, type ApiKeyProvider } from '@/blog/utils/apiKeyLabels'
import { ApiKeyRow } from './ApiKeyRow'
import { CloudinaryConfigRow } from './CloudinaryConfigRow'

const PROVIDERS: ApiKeyProvider[] = ['openai', 'anthropic', 'gemini', 'perplexity']
const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? 'https://buylife.xyz'

interface CloudinaryConfig {
  cloud_name: string
  api_key: string
  api_secret: string
}

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
  const [cloudinaryConfig, setCloudinaryConfig] = useState<CloudinaryConfig | null>(null)

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

      const [{ data: keys }, { data: cloudinary }] = await Promise.all([
        supabase.from('user_api_keys').select('provider, api_key').eq('user_id', user.id),
        supabase
          .from('user_cloudinary_config')
          .select('cloud_name, api_key, api_secret')
          .eq('user_id', user.id)
          .maybeSingle(),
      ])

      setKeyMap(new Map((keys ?? []).map((k: { provider: string; api_key: string }) => [k.provider, k.api_key])))
      setCloudinaryConfig(cloudinary ?? null)
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
      <a href={`${MAIN_SITE_URL}/programs`} className="mb-4 inline-block text-sm text-zinc-500 hover:text-zinc-900">
        ← 다른 프로그램 보기
      </a>
      <h1 className="mb-2 text-2xl font-bold text-zinc-900">API 키 설정</h1>
      <p className="mb-6 text-sm text-zinc-600">
        본인의 API 키를 등록하면 AI 글/이미지 생성 시 등록한 키를 우선 사용합니다. 등록하지
        않으면 앱 기본 키로 동작합니다 (제공되는 경우). 이 키는 AIMaster 계정에 연결되어
        threads 등 다른 프로그램에서도 동일하게 사용됩니다. 현재 실제 생성 기능에 사용되는
        것은 Gemini(글+이미지 생성)이고, 나머지는 저장만 됩니다.
      </p>
      <div className="space-y-3">
        {PROVIDERS.map((provider) => (
          <ApiKeyRow
            key={provider}
            provider={provider}
            label={PROVIDER_LABELS[provider]}
            maskedValue={keyMap.has(provider) ? maskApiKey(keyMap.get(provider)!) : null}
          />
        ))}
        <CloudinaryConfigRow
          cloudName={cloudinaryConfig?.cloud_name ?? null}
          maskedApiKey={cloudinaryConfig ? maskApiKey(cloudinaryConfig.api_key) : null}
          maskedApiSecret={cloudinaryConfig ? maskApiKey(cloudinaryConfig.api_secret) : null}
        />
      </div>
    </div>
  )
}
