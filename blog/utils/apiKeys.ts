import 'server-only'

export type ApiKeyProvider = 'openai' | 'anthropic' | 'gemini' | 'perplexity'

type SupabaseLike = {
  from: (table: string) => any // eslint-disable-line @typescript-eslint/no-explicit-any
}

export const PROVIDER_LABELS: Record<ApiKeyProvider, string> = {
  openai: 'OpenAI (GPT)',
  anthropic: 'Anthropic (Claude)',
  gemini: 'Google (Gemini)',
  perplexity: 'Perplexity',
}

// 프로바이더별 앱 공용(기본) 키. 사용자가 본인 키를 등록하지 않았을 때만 폴백으로 쓰인다.
const FALLBACK_ENV_KEYS: Record<ApiKeyProvider, string | undefined> = {
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  gemini: process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.NANOBANANA_API_KEY,
  perplexity: process.env.PERPLEXITY_API_KEY,
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

/** 본인 키가 등록돼 있으면 그 키를, 없으면 앱 공용 키로 폴백한다. threads의 lib/apiKeys.ts와 동일 패턴. */
export async function resolveApiKey(
  supabase: SupabaseLike,
  userId: string,
  provider: ApiKeyProvider,
): Promise<string | null> {
  const ownKey = await getUserApiKey(supabase, userId, provider)
  return ownKey || FALLBACK_ENV_KEYS[provider] || null
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return '••••••••'
  return `${key.slice(0, 6)}${'•'.repeat(8)}${key.slice(-4)}`
}
