import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ApiKeyProvider, Database } from "@/types/database.types";

// PROVIDER_LABELS는 클라이언트 컴포넌트에서도 필요해 apiKeyLabels.ts로 분리했다.
// 이 파일(서버 전용)에서도 그대로 재노출해서 기존 import 경로(@/lib/apiKeys)를 쓰는
// 서버 코드는 수정 없이 계속 동작한다.
export { PROVIDER_LABELS } from "@/lib/apiKeyLabels";

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
 * 관리자 개인 API 키 비용을 다른 사용자가 무제한으로 쓰게 되는 데 쓰면 안 되기
 * 때문에 의도적으로 폴백을 없앴다(AIMaster 루트 CLAUDE.md "멀티테넌시 원칙" 참고).
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
