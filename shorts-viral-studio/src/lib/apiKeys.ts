import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type AIProvider = "openai" | "gemini" | "anthropic";
export type KeyProvider = AIProvider | "youtube_api_key";

/**
 * 사용자 본인이 등록한 키를 조회합니다. (BYOK 원칙 — 관리자 공용 키 폴백 없음)
 */
export async function resolveApiKey(userId: string, provider: KeyProvider): Promise<string | null> {
  const admin = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data } = await admin
    .from("user_api_keys")
    .select("api_key")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  return data?.api_key?.trim() || null;
}
