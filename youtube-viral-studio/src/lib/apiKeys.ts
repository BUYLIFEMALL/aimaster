import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type ApiKeyProvider = "youtube_api_key" | "openai" | "gemini" | "claude";

export const PROVIDER_LABELS: Record<ApiKeyProvider, string> = {
  youtube_api_key: "YouTube Data API v3 키 (필수 - 떡상 영상/채널 수집)",
  openai: "OpenAI API 키 (선택 - 영상 분석 및 스크립트 재구성)",
  gemini: "Google Gemini API 키 (선택 - AI 쇼츠 벤치마킹)",
  claude: "Anthropic Claude API 키 (선택 - 훅킹 대본 분석)",
};

export const ALL_PROVIDERS: ApiKeyProvider[] = [
  "youtube_api_key",
  "openai",
  "gemini",
  "claude",
];

/**
 * 로그인한 회원 본인이 user_api_keys 테이블에 등록한 본인 키만 반환한다.
 * 최상위 절대 규칙: 타인/운영자 키 폴백이나 공용 키를 절대 제공하지 않는다.
 */
export async function getUserApiKey(
  userId: string,
  provider: ApiKeyProvider
): Promise<string | null> {
  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("user_api_keys")
    .select("api_key")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  return data?.api_key ?? null;
}

/**
 * 회원 본인이 등록한 모든 API 키 목록 조회 (마스킹 처리)
 */
export async function getRegisteredApiKeys(
  userId: string
): Promise<Record<string, { registered: boolean; maskedKey?: string }>> {
  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("user_api_keys")
    .select("provider, api_key")
    .eq("user_id", userId);

  const result: Record<string, { registered: boolean; maskedKey?: string }> = {};

  for (const p of ALL_PROVIDERS) {
    const row = data?.find((r: { provider: string }) => r.provider === p);
    if (row && row.api_key) {
      result[p] = {
        registered: true,
        maskedKey: maskApiKey(row.api_key),
      };
    } else {
      result[p] = {
        registered: false,
      };
    }
  }

  return result;
}

export function maskApiKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 6)}${"•".repeat(Math.max(4, key.length - 10))}${key.slice(-4)}`;
}
