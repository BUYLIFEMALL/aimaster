'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import type { ApiKeyProvider } from '@/utils/apiKeys'

export interface SaveApiKeyState {
  error?: string
  success?: boolean
}

const VALID_PROVIDERS: ApiKeyProvider[] = ['openai', 'anthropic', 'gemini', 'perplexity']

export async function saveApiKeyAction(
  _prevState: SaveApiKeyState,
  formData: FormData,
): Promise<SaveApiKeyState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '로그인이 필요합니다.' }
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
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const provider = String(formData.get('provider'))

  await supabase.from('user_api_keys').delete().eq('user_id', user.id).eq('provider', provider)

  revalidatePath('/settings')
}

export interface SaveCloudinaryState {
  error?: string
  success?: boolean
}

export async function saveCloudinaryConfigAction(
  _prevState: SaveCloudinaryState,
  formData: FormData,
): Promise<SaveCloudinaryState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  const cloudName = String(formData.get('cloudName') ?? '').trim()
  const apiKey = String(formData.get('apiKey') ?? '').trim()
  const apiSecret = String(formData.get('apiSecret') ?? '').trim()

  if (!cloudName || !apiKey || !apiSecret) {
    return { error: 'Cloud Name, API Key, API Secret을 모두 입력해주세요.' }
  }

  const { error } = await supabase
    .from('user_cloudinary_config')
    .upsert(
      { user_id: user.id, cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret },
      { onConflict: 'user_id' },
    )

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function deleteCloudinaryConfigAction() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('user_cloudinary_config').delete().eq('user_id', user.id)

  revalidatePath('/settings')
}
