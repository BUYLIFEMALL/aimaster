import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// 최상위 규칙: 키는 회원 본인 것만 쓴다. 키가 없으면 null — 운영자·다른 회원 키로 대신 처리하지 않는다.
// provider 이름은 다른 프로그램과 같은 공용 이름을 쓴다(user_api_keys 제약에 이미 있음).
export const KEY_PROVIDERS = [
  "openai",
  "gemini",
  "naver_client_id",
  "naver_client_secret",
  "naver_ads_api_key",
  "naver_ads_secret_key",
  "naver_ads_customer_id",
] as const;
export type KeyProvider = (typeof KEY_PROVIDERS)[number];

export function isKeyProvider(v: unknown): v is KeyProvider {
  return typeof v === "string" && (KEY_PROVIDERS as readonly string[]).includes(v);
}

export async function getUserApiKeys(userId: string, providers: readonly KeyProvider[] = KEY_PROVIDERS): Promise<Partial<Record<KeyProvider, string>>> {
  const { data } = await createAdminClient()
    .from("user_api_keys")
    .select("provider, api_key, created_at")
    .eq("user_id", userId)
    .in("provider", [...providers])
    .order("created_at", { ascending: false });
  const out: Partial<Record<KeyProvider, string>> = {};
  for (const row of data ?? []) {
    const p = row.provider as KeyProvider;
    if (!out[p] && row.api_key) out[p] = row.api_key as string;
  }
  return out;
}

export async function saveUserApiKey(userId: string, provider: KeyProvider, apiKey: string): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  const key = apiKey.trim();
  const now = new Date().toISOString();
  const { data: existing } = await admin.from("user_api_keys").select("id").eq("user_id", userId).eq("provider", provider).maybeSingle();
  if (existing) {
    const { error } = await admin.from("user_api_keys").update({ api_key: key, updated_at: now }).eq("id", existing.id).eq("user_id", userId);
    if (error) return { success: false, error: "API 키를 저장하지 못했습니다." };
  } else {
    const { error } = await admin.from("user_api_keys").insert({ user_id: userId, provider, api_key: key, created_at: now, updated_at: now });
    if (error) return { success: false, error: "API 키를 저장하지 못했습니다." };
  }
  return { success: true };
}

export async function deleteUserApiKey(userId: string, provider: KeyProvider): Promise<{ success: boolean; error?: string }> {
  const { error } = await createAdminClient().from("user_api_keys").delete().eq("user_id", userId).eq("provider", provider);
  if (error) return { success: false, error: "API 키를 삭제하지 못했습니다." };
  return { success: true };
}

export function maskKey(key: string): string {
  return key.length <= 8 ? "••••" : `${key.slice(0, 4)}…${key.slice(-4)}`;
}
