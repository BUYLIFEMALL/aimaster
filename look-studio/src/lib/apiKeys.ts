import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// 최상위 규칙: AI 키는 회원 본인 것만 쓴다. 키가 없으면 null — 운영자·다른 회원 키로 대신 처리하지 않는다.
const PROVIDER = "gemini";

export async function getUserGeminiApiKey(userId: string): Promise<string | null> {
  const { data, error } = await createAdminClient()
    .from("user_api_keys")
    .select("api_key")
    .eq("user_id", userId)
    .eq("provider", PROVIDER)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data?.api_key) return null;
  return data.api_key as string;
}

export async function saveUserGeminiApiKey(userId: string, apiKey: string): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();
  const key = apiKey.trim();
  const now = new Date().toISOString();
  const { data: existing } = await admin.from("user_api_keys").select("id").eq("user_id", userId).eq("provider", PROVIDER).maybeSingle();
  if (existing) {
    const { error } = await admin.from("user_api_keys").update({ api_key: key, updated_at: now }).eq("id", existing.id).eq("user_id", userId);
    if (error) return { success: false, error: "API 키를 저장하지 못했습니다." };
  } else {
    const { error } = await admin.from("user_api_keys").insert({ user_id: userId, provider: PROVIDER, api_key: key, created_at: now, updated_at: now });
    if (error) return { success: false, error: "API 키를 저장하지 못했습니다." };
  }
  return { success: true };
}

export async function deleteUserGeminiApiKey(userId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await createAdminClient().from("user_api_keys").delete().eq("user_id", userId).eq("provider", PROVIDER);
  if (error) return { success: false, error: "API 키를 삭제하지 못했습니다." };
  return { success: true };
}

export function maskKey(key: string): string {
  return key.length <= 8 ? "••••" : `${key.slice(0, 4)}…${key.slice(-4)}`;
}
