import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ApiKeyProvider, Database } from "@/types/database.types";

export const PROVIDER_LABELS: Record<ApiKeyProvider, string> = {
  openai: "OpenAI (GPT — 게시글 생성)",
  gemini: "Google (Gemini — 카드뉴스 이미지 생성)",
  perplexity: "Perplexity (실시간 주제 수집)",
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

/** 본인 키만 사용한다 — 앱/운영자 공용 키로 폴백하지 않는다(2026-08-12 정책, 루트 CLAUDE.md
 * 멀티테넌시 원칙 3번). 본인 키가 없으면 null을 반환하니, 호출부는 반드시 "API 키 등록 필요"
 * 안내로 이어가야 한다(조용히 실패시키지 말 것). */
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
