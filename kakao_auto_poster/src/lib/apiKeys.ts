import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ApiKeyProvider, Database } from "@/types/database.types";

export { PROVIDER_LABELS } from "./apiKeyLabels";

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
 * 사용자 본인이 등록한 키만 사용한다. 앱(관리자) 공용 키로 폴백하지 않는다 —
 * AIMaster 루트 CLAUDE.md의 "API 키는 본인 것만 사용" 원칙(insta_auto_poster에서 이미 적용).
 * 키가 없으면 null을 반환하니, 호출부에서 반드시 "설정에서 본인 키를 등록해주세요"로
 * 안내하고 생성을 막아야 한다.
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
  return new Set((data ?? []).map((row) => row.provider));
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 6)}${"•".repeat(8)}${key.slice(-4)}`;
}
