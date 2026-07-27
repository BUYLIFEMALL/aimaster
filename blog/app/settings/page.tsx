import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { PROVIDER_LABELS, maskApiKey, type ApiKeyProvider } from '@/utils/apiKeys'
import { ApiKeyRow } from './ApiKeyRow'
import { CloudinaryConfigRow } from './CloudinaryConfigRow'

const PROVIDERS: ApiKeyProvider[] = ['openai', 'anthropic', 'gemini', 'perplexity']

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const { data: keys } = await supabase
    .from('user_api_keys')
    .select('provider, api_key')
    .eq('user_id', user!.id)

  const keyMap = new Map((keys ?? []).map((k: { provider: string; api_key: string }) => [k.provider, k.api_key]))

  const { data: cloudinaryConfig } = await supabase
    .from('user_cloudinary_config')
    .select('cloud_name, api_key, api_secret')
    .eq('user_id', user!.id)
    .maybeSingle()

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
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
