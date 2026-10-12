import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Provider } from "@/lib/mastering/models";

export const ALL_PROVIDERS: Provider[] = ["gemini", "openai", "anthropic"];

/**
 * 로그인한 회원 본인이 user_api_keys 테이블에 등록한 본인 키만 가져온다.
 * 최상위 절대 불변 규칙 (2026-10-09 지시): 타인/운영자 키 폴백이나 공용 키를 절대 제공하지 않는다.
 * 키가 없으면 null을 반환하며, 호출부가 "본인 키를 등록해주세요" 안내를 띄운다.
 */
export async function getUserApiKey(userId: string, provider: Provider): Promise<string | null> {
  const { data } = await createAdminClient()
    .from("user_api_keys")
    .select("api_key")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();
  return data?.api_key?.trim() || null;
}

/** 회원 본인이 등록한 키 목록(마스킹) */
export async function getRegisteredKeys(userId: string): Promise<Record<Provider, { registered: boolean; maskedKey?: string }>> {
  const { data } = await createAdminClient().from("user_api_keys").select("provider, api_key").eq("user_id", userId).in("provider", ALL_PROVIDERS);
  const out = {} as Record<Provider, { registered: boolean; maskedKey?: string }>;
  for (const p of ALL_PROVIDERS) {
    const row = data?.find((r: { provider: string }) => r.provider === p);
    out[p] = row?.api_key ? { registered: true, maskedKey: maskApiKey(row.api_key) } : { registered: false };
  }
  return out;
}

export async function saveUserApiKey(userId: string, provider: Provider, apiKey: string): Promise<{ success: boolean; error?: string }> {
  const cleaned = apiKey.trim();
  if (!cleaned) return { success: false, error: "API 키를 입력해주세요." };
  const { error } = await createAdminClient()
    .from("user_api_keys")
    .upsert({ user_id: userId, provider, api_key: cleaned, updated_at: new Date().toISOString() }, { onConflict: "user_id,provider" });
  return error ? { success: false, error: error.message } : { success: true };
}

export async function deleteUserApiKey(userId: string, provider: Provider): Promise<void> {
  await createAdminClient().from("user_api_keys").delete().eq("user_id", userId).eq("provider", provider);
}

/** 마스킹된 키 문자열 (보안용) */
export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return "••••••••";
  return key.slice(0, 6) + "••••••••" + key.slice(-4);
}
