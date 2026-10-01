'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import type { ApiKeyProvider } from '@/utils/apiKeys'
import { checkProgramAccessApi } from '@/utils/access'

export interface SaveApiKeyState {
  error?: string
  success?: boolean
}

const VALID_PROVIDERS: ApiKeyProvider[] = ['openai', 'anthropic', 'gemini', 'perplexity']

export async function saveApiKeyAction(
  _prevState: SaveApiKeyState,
  formData: FormData,
): Promise<SaveApiKeyState> {
  // 로그인만이 아니라 tistory-auto-blog 이용 권한까지 확인한다(멀티테넌시 원칙 1번 — 2026-10-01 독립 배포 분리 때 누락 발견).
  const access = await checkProgramAccessApi()
  const user = access.allowed ? access.user : null
  const supabase = await createClient()

  if (!user) {
    return { error: '로그인 및 프로그램 이용 권한이 필요합니다.' }
  }

  const provider = String(formData.get('provider')) as ApiKeyProvider
  const apiKey = String(formData.get('apiKey') ?? '').trim()

  if (!VALID_PROVIDERS.includes(provider)) {
    return { error: '알 수 없는 provider입니다.' }
  }
  if (!apiKey) {
    return { error: 'API 키를 입력해주세요.' }
  }

  const { error } = await supabase
    .from('user_api_keys')
    .upsert({ user_id: user.id, provider, api_key: apiKey }, { onConflict: 'user_id,provider' })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function deleteApiKeyAction(formData: FormData) {
  // 로그인만이 아니라 tistory-auto-blog 이용 권한까지 확인한다(멀티테넌시 원칙 1번 — 2026-10-01 독립 배포 분리 때 누락 발견).
  const access = await checkProgramAccessApi()
  const user = access.allowed ? access.user : null
  const supabase = await createClient()
  if (!user) return

  const provider = String(formData.get('provider'))

  await supabase.from('user_api_keys').delete().eq('user_id', user.id).eq('provider', provider)

  revalidatePath('/settings')
}
