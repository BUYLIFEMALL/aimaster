import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// 공용 키 표(user_api_keys)의 항목 이름 — 한 번 등록하면 AIMaster의 다른 프로그램도 같은 항목을 그대로 쓴다(회원 연동 정보 공용 저장 규칙).
// upstage·tavily는 이 프로그램(v1.01)에서 처음 추가한 공용 항목이다.
export type ApiKeyProvider = "upstage" | "tavily";

export const PROVIDER_NAMES: Record<ApiKeyProvider, string> = {
  upstage: "Upstage",
  tavily: "Tavily",
};

export const PROVIDER_LABELS: Record<ApiKeyProvider, string> = {
  upstage: "Upstage API 키 (필수 — 답변 생성·문서 임베딩·PDF 읽기)",
  tavily: "Tavily API 키 (선택 — 최신 정보 웹 검색)",
};

export const ALL_PROVIDERS: ApiKeyProvider[] = ["upstage", "tavily"];

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
  const prefix = key.slice(0, 6);
  const suffix = key.slice(-4);
  return `${prefix}••••••••••••${suffix}`;
}
