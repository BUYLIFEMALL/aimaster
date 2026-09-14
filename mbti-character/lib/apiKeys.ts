import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * 2026-09-14: 처음엔 로그인이 없어서 방문자가 결과 화면에서 그때그때 Gemini API 키를 입력하고
 * 브라우저 localStorage에만 보관하는 BYOK 방식으로 만들었다(components/
 * CharacterImageGenerator.tsx 옛 버전). 이후 로그인이 필수가 되면서 이 임시방편이 플랫폼
 * 표준과 어긋난 채로 남아있었다 — 사용자가 "이미지 생성과 콘텐츠를 생성하려면 api키를
 * 등록해야 하지 않아? 프로그램 시작할때 등록하게 하는 내용이 빠져있네"라고 지적해서
 * 발견/수정했다. 이제 다른 서브프로젝트(naver-cafe-poster/insta_auto_poster 등)와 동일하게
 * 공용 user_api_keys 테이블에 로그인한 회원 본인 키를 등록해두고 재사용하는 표준 패턴을
 * 따른다 — localStorage/클라이언트 직접 입력 방식은 완전히 제거했다.
 */
export type ApiKeyProvider = "gemini";

export const PROVIDER_LABELS: Record<ApiKeyProvider, string> = {
  gemini: "Google Gemini (나노바나나 — AI 캐릭터 이미지 생성)",
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
