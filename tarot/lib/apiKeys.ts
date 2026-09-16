import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * mbti-character와 동일한 표준 패턴이다 — 로그인한 회원 본인이 /settings에서 등록한 키만
 * 공용 user_api_keys 테이블(provider별 1행, user_id+provider unique)에서 조회해서 쓴다.
 * 앱/운영자 공용 키로 폴백하지 않는다(루트 CLAUDE.md "API 키는 본인 것만 사용" 원칙).
 *
 * 이 프로젝트는 두 provider를 쓴다:
 * - gemini: 카드 일러스트 생성("나노바나나", /api/generate-card-image)
 * - openai: 타로 해석 텍스트 생성(/api/generate-reading) — naver-cafe-poster 등 이 저장소의
 *   다른 서브프로젝트가 자유 형식 한국어 텍스트 생성에 공통적으로 OpenAI를 쓰는 관례를 따랐다.
 */
export type ApiKeyProvider = "gemini" | "openai";

export const PROVIDER_LABELS: Record<ApiKeyProvider, string> = {
  gemini: "Google Gemini (나노바나나 — AI 카드 일러스트 생성)",
  openai: "OpenAI (GPT — AI 타로 해석 생성)",
};

export async function getUserApiKey(userId: string, provider: ApiKeyProvider): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_api_keys")
    .select("api_key")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  return (data as { api_key: string } | null)?.api_key ?? null;
}

/**
 * 본인이 등록한 키만 사용한다 — 앱/운영자 공용 키로 폴백하지 않는다(루트 CLAUDE.md
 * "API 키는 본인 것만 사용" 원칙). 키가 없으면 null을 반환하니, 호출부는 반드시
 * "/settings에서 본인 키를 등록해주세요"로 안내하고 생성을 막아야 한다.
 */
export async function resolveApiKey(userId: string, provider: ApiKeyProvider): Promise<string | null> {
  return getUserApiKey(userId, provider);
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 6)}${"•".repeat(8)}${key.slice(-4)}`;
}
