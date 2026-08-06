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

/**
 * 이 앱은 각 회원이 본인 API 키를 등록해서 본인 키로 생성 기능을 쓰는 것을 기본 모델로 한다.
 * 화면에서 "이 기능을 쓰려면 키를 등록하세요" 안내를 보여주기 위해, 앱 폴백 키 존재 여부와
 * 무관하게 본인이 직접 등록한 키가 있는지만 확인한다.
 */
export async function getRegisteredProviders(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Set<ApiKeyProvider>> {
  const { data } = await supabase.from("user_api_keys").select("provider").eq("user_id", userId);
  return new Set((data ?? []).map((row) => row.provider));
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 6)}${"•".repeat(8)}${key.slice(-4)}`;
}
