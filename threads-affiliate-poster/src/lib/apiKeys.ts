import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ApiKeyProvider, Database } from "@/types/database.types";

export const PROVIDER_LABELS: Record<ApiKeyProvider, string> = {
  openai: "OpenAI (GPT — 게시글 캡션 생성)",
  gemini: "Google (Gemini — 나노바나나 이미지 생성)",
  coupang_access_key: "쿠팡파트너스 Access Key (상품검색/딥링크 생성)",
  coupang_secret_key: "쿠팡파트너스 Secret Key (상품검색/딥링크 생성)",
  aliexpress_app_key: "알리익스프레스 App Key (제휴 링크 생성)",
  aliexpress_app_secret: "알리익스프레스 App Secret (제휴 링크 생성)",
  aliexpress_tracking_id: "알리익스프레스 Tracking ID (제휴 포털 → 계정 → 트래킹ID)",
  toss_access_key: "토스쇼핑 쉐어링크 Access Key (Open API 연동 정보)",
  toss_secret_key: "토스쇼핑 쉐어링크 Secret Key (Open API 연동 정보)",
  toss_publisher_id: "토스쇼핑 쉐어링크 Publisher ID (발급 주체 UUID)",
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

/**
 * 사용자 본인이 등록한 키만 사용한다. 앱(관리자) 공용 키로 폴백하지 않는다 —
 * 관리자 개인 API 키 비용을 다른 사용자가 무제한으로 쓰게 되는 데 쓰면 안 되기
 * 때문에 의도적으로 폴백을 없앴다(AIMaster 루트 CLAUDE.md "멀티테넌시 원칙" 참고).
 * threads/(자동 포스팅)의 apiKeys.ts는 이 정책 변경 이전에 만들어져 앱 공용 키
 * 폴백이 남아있는데, 이 프로젝트는 최신 정책을 따라 폴백 없이 구현한다.
 */
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
