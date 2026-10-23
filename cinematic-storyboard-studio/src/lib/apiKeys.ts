import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type ApiKeyProvider = "gemini";

/**
 * 로그인한 회원 본인이 user_api_keys 테이블에 등록한 본인 Gemini API 키를 가져온다.
 * 최상위 절대 불변 규칙 (2026-10-09 지시):
 * 타인/운영자 키 폴백이나 공용 키를 절대 제공하지 않는다.
 * 키가 없으면 null을 반환하며, 클라이언트에서 "본인 키를 등록해주세요"를 띄운다.
 */
export async function getUserGeminiApiKey(userId: string): Promise<string | null> {
  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("user_api_keys")
    .select("api_key")
    .eq("user_id", userId)
    .eq("provider", "gemini")
    .maybeSingle();

  return data?.api_key?.trim() || null;
}

/**
 * 회원 본인의 Gemini API 키를 저장하거나 업데이트한다.
 */
export async function saveUserGeminiApiKey(userId: string, apiKey: string): Promise<{ success: boolean; error?: string }> {
  const adminClient = createAdminClient();
  const cleaned = apiKey.trim();
  if (!cleaned) {
    return { success: false, error: "API 키를 입력해주세요." };
  }

  const { error } = await adminClient
    .from("user_api_keys")
    .upsert(
      {
        user_id: userId,
        provider: "gemini",
        api_key: cleaned,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    );

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

/**
 * 마스킹된 키 문자열 (보안용)
 */
export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return "••••••••";
  return key.slice(0, 6) + "••••••••" + key.slice(-4);
}
