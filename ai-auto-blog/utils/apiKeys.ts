import 'server-only'

export type { ApiKeyProvider } from './apiKeyLabels'
export { PROVIDER_LABELS, maskApiKey } from './apiKeyLabels'
import type { ApiKeyProvider } from './apiKeyLabels'

type SupabaseLike = {
  from: (table: string) => any // eslint-disable-line @typescript-eslint/no-explicit-any
}

export async function getUserApiKey(
  supabase: SupabaseLike,
  userId: string,
  provider: ApiKeyProvider,
): Promise<string | null> {
  const { data } = await supabase
    .from('user_api_keys')
    .select('api_key')
    .eq('user_id', userId)
    .eq('provider', provider)
    .maybeSingle()

  return data?.api_key ?? null
}

/** 본인 키만 사용한다 — 앱/운영자 공용 키로 폴백하지 않는다(2026-08-12 정책, 루트 CLAUDE.md
 * 멀티테넌시 원칙 3번). 본인 키가 없으면 null을 반환하니, 호출부는 반드시 "API 키 등록 필요"
 * 안내로 이어가야 한다(조용히 실패시키지 말 것). */
export async function resolveApiKey(
  supabase: SupabaseLike,
  userId: string,
  provider: ApiKeyProvider,
): Promise<string | null> {
  return getUserApiKey(supabase, userId, provider)
}
