import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type AIProvider = "openai" | "gemini" | "anthropic";

/**
 * 사용자 본인이 등록한 AI 키를 조회합니다. (BYOK 원칙 — 관리자 공용 키 폴백 없음)
 */
export async function resolveApiKey(userId: string, provider: string): Promise<string | null> {
  const admin = createAdminClient() as any;
  const { data } = await admin
    .from("user_api_keys")
    .select("api_key")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  return data?.api_key?.trim() ?? null;
}

/**
 * 사용자가 등록해 둔 AI 키 중 사용 가능한 첫 번째 키(또는 기본 키)를 찾습니다.
 * 기본 선호 순서: OpenAI -> Gemini -> Anthropic
 */
export async function resolveAvailableAI(
  userId: string,
  preferredProvider?: AIProvider
): Promise<{ provider: AIProvider; apiKey: string } | null> {
  if (preferredProvider) {
    const key = await resolveApiKey(userId, preferredProvider);
    return key ? { provider: preferredProvider, apiKey: key } : null;
  }

  const providers: AIProvider[] = ["openai", "gemini", "anthropic"];
  for (const p of providers) {
    const key = await resolveApiKey(userId, p);
    if (key) return { provider: p, apiKey: key };
  }

  return null;
}
