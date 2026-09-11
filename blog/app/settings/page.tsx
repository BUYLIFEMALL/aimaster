'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/blog/utils/supabase/client'
import { getBlogBasePath, getBlogAuthPath } from '@/blog/utils/basePath'
import { PROVIDER_LABELS, maskApiKey, type ApiKeyProvider } from '@/blog/utils/apiKeyLabels'
import { ApiKeyRow } from './ApiKeyRow'
import { CloudinaryConfigRow } from './CloudinaryConfigRow'

const PRIMARY_PROVIDERS: ApiKeyProvider[] = ['gemini']
const RESERVE_PROVIDERS: ApiKeyProvider[] = ['openai', 'anthropic', 'perplexity']

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
      <h1 className="mb-2 text-2xl font-bold text-zinc-900">API 키 설정</h1>
      <p className="mb-6 text-sm text-zinc-600">
        본인의 API 키를 등록하면 AI 글/이미지 생성 시 등록한 키를 우선 사용합니다. 이 키는
        AIMaster 계정에 연결되어 threads 등 다른 프로그램에서도 동일하게 사용됩니다.
      </p>

      <div className="space-y-6">
        <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-zinc-900">🤖 AI 글/이미지 생성 (Gemini)</h2>
            <p className="text-xs text-zinc-500">
              실제로 블로그 글과 이미지를 생성하는 데 쓰이는 키입니다 — 등록해야 "AI 글쓰기"가
              동작합니다.
            </p>
          </div>
          <div className="space-y-3">
            {PRIMARY_PROVIDERS.map((provider) => (
              <ApiKeyRow
                key={provider}
                provider={provider}
                label={PROVIDER_LABELS[provider]}
                maskedValue={keyMap.has(provider) ? maskApiKey(keyMap.get(provider)!) : null}
              />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-zinc-900">☁️ 이미지 클라우드 저장 (Cloudinary)</h2>
            <p className="text-xs text-zinc-500">생성된 이미지를 업로드해 보관하는 저장소 설정입니다.</p>
          </div>
          <CloudinaryConfigRow
            cloudName={cloudinaryConfig?.cloud_name ?? null}
            maskedApiKey={cloudinaryConfig ? maskApiKey(cloudinaryConfig.api_key) : null}
            maskedApiSecret={cloudinaryConfig ? maskApiKey(cloudinaryConfig.api_secret) : null}
          />
        </section>

        <section className="rounded-2xl border border-dashed border-zinc-300 bg-white p-5">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-zinc-700">🔑 예비 등록 (아직 미사용)</h2>
            <p className="text-xs text-zinc-500">
              다른 AIMaster 프로그램에서 쓰일 수 있도록 미리 등록해두는 키입니다 — 이 블로그
              자동화 자체에서는 아직 실제로 호출하지 않습니다.
            </p>
          </div>
          <div className="space-y-3">
            {RESERVE_PROVIDERS.map((provider) => (
              <ApiKeyRow
                key={provider}
                provider={provider}
                label={PROVIDER_LABELS[provider]}
                maskedValue={keyMap.has(provider) ? maskApiKey(keyMap.get(provider)!) : null}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
