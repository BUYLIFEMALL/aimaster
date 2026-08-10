import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ApiKeyProvider, Database } from "@/types/database.types";

export const PROVIDER_LABELS: Record<ApiKeyProvider, string> = {
  openai: "OpenAI (GPT)",
  anthropic: "Anthropic (Claude)",
  gemini: "Google (Gemini)",
  perplexity: "Perplexity",
};

// 프로바이더별 앱 공용(기본) 키. 사용자가 본인 키를 등록하지 않았을 때만 폴백으로 쓰인다.
const FALLBACK_ENV_KEYS: Record<ApiKeyProvider, string | undefined> = {
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  gemini: process.env.GEMINI_API_KEY,
  perplexity: process.env.PERPLEXITY_API_KEY,
};

export async function getUserApiKey(
  supabase: SupabaseClient<Database>,
  userId: string,
  provider: ApiKeyProvider,
): Promise<string | null> {
  const { data } = await supabase
    .from("user_api_keys")
    .select("api_key")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  return data?.api_key ?? null;
}

/** 본인 키가 등록돼 있으면 그 키를, 없으면 앱 공용 키로 폴백한다. 기본적으로 본인 키를 우선한다. */
export async function resolveApiKey(
  supabase: SupabaseClient<Database>,
  userId: string,
  provider: ApiKeyProvider,
): Promise<string | null> {
  const ownKey = await getUserApiKey(supabase, userId, provider);
  return ownKey || FALLBACK_ENV_KEYS[provider] || null;
}

export interface ResolvedApiKey {
  key: string | null;
  /** true면 사용자 본인이 등록한 키, false면 앱 공용 폴백 키를 쓴 것. */
  isOwnKey: boolean;
}

/**
 * resolveApiKey와 동일하지만, 반환된 키가 본인 키인지 앱 폴백 키인지도 함께 알려준다.
 * 폴백 키를 쓴 경우엔 같은 입력(매물+모델)에 대한 AI 분석 결과를 사용자 간에 공유해서
 * 캐싱할 수 있어 앱 공용 키 비용을 아낄 수 있다 — real_estate_sales의
 * runListingAnalysis에서 사용.
 */
export async function resolveApiKeyWithSource(
  supabase: SupabaseClient<Database>,
  userId: string,
  provider: ApiKeyProvider,
): Promise<ResolvedApiKey> {
  const ownKey = await getUserApiKey(supabase, userId, provider);
  if (ownKey) return { key: ownKey, isOwnKey: true };
  return { key: FALLBACK_ENV_KEYS[provider] ?? null, isOwnKey: false };
}

export async function getRegisteredProviders(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Set<ApiKeyProvider>> {
  const { data } = await supabase.from("user_api_keys").select("provider").eq("user_id", userId);
  return new Set((data ?? []).map((row) => row.provider as ApiKeyProvider));
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 6)}${"•".repeat(8)}${key.slice(-4)}`;
}
