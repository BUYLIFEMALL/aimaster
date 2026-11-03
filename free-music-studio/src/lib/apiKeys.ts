import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// 음악 생성은 회원 PC 엔진에서 키 없이 돈다. 키가 필요한 것은 AI 작사(기본 Claude, 2026-10-28 주인님 지시)뿐이다.
export type ApiKeyProvider = "anthropic";

export const PROVIDER_LABELS: Record<ApiKeyProvider, string> = {
  anthropic: "Claude(Anthropic) API 키 (AI 작사에 사용 — 음악 생성 자체는 키 없이 내 PC에서)",
};

export const ALL_PROVIDERS: ApiKeyProvider[] = ["anthropic"];

/**
 * 로그인한 회원 본인이 user_api_keys 테이블에 등록한 본인 키만 반환한다.
 * 최상위 절대 규칙: 타인/운영자 키 폴백이나 공용 키를 절대 제공하지 않는다.
 */
export async function getUserApiKey(userId: string, provider: ApiKeyProvider): Promise<string | null> {
  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("user_api_keys")
    .select("api_key")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  return data?.api_key ?? null;
}

/** 회원 본인이 등록한 API 키 목록 조회 (마스킹 처리) */
export async function getRegisteredApiKeys(
  userId: string
): Promise<Record<string, { registered: boolean; maskedKey?: string }>> {
  const adminClient = createAdminClient();
  const { data } = await adminClient.from("user_api_keys").select("provider, api_key").eq("user_id", userId);

  const result: Record<string, { registered: boolean; maskedKey?: string }> = {};
  for (const p of ALL_PROVIDERS) {
    const row = data?.find((r: { provider: string }) => r.provider === p);
    result[p] = row?.api_key ? { registered: true, maskedKey: maskApiKey(row.api_key) } : { registered: false };
  }
  return result;
}

export function maskApiKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 6)}••••••••••••${key.slice(-4)}`;
}
