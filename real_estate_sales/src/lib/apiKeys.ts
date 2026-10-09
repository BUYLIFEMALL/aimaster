import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ApiKeyProvider, Database } from "@/types/database.types";

export const PROVIDER_LABELS: Record<ApiKeyProvider, string> = {
  openai: "OpenAI (GPT — 매물 분석)",
  anthropic: "Anthropic (Claude)",
  gemini: "Google (Gemini)",
  perplexity: "Perplexity (시세/입지 리서치)",
  seoul_opendata_api_key: "서울 열린데이터광장 인증키 (선택 — 비우면 공용 키 사용)",
  data_go_kr_service_key: "공공데이터포털 서비스키 (선택 — 비우면 공용 키 사용)",
  vworld_api_key: "브이월드 인증키 (선택 — 도메인과 함께 등록)",
  vworld_domain: "브이월드에 등록한 도메인 (선택 — 브이월드 키와 함께 등록)",
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

/**
 * 로그인한 회원 본인이 등록한 키만 돌려준다. 없으면 null — 운영자·다른 회원 키로 대신하지 않는다
 * (최상위 규칙 docs/TOP_RULE_PERSONAL_ACCOUNT_API.md). 2026-10-09 앱 공용 환경변수 폴백 삭제.
 */
export async function resolveApiKey(
  supabase: SupabaseClient<Database>,
  userId: string,
  provider: ApiKeyProvider,
): Promise<string | null> {
  return getUserApiKey(supabase, userId, provider);
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
