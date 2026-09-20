import "server-only";

// 본인 키만 사용한다 — 앱/운영자 공용 키로 폴백하지 않는다(루트 CLAUDE.md 멀티테넌시
// 원칙 3번, 2026-08-12 정책). 본인 키가 없으면 null을 반환하니, 호출부는 반드시
// "API 키 등록 필요" 안내로 이어가야 한다(조용히 실패시키지 말 것). 각 서브프로젝트의
// utils/apiKeys.ts(blog 등)와 동일한 패턴 — 루트 앱에는 이 파일이 없어서 새로 만듦.

export type ApiKeyProvider = "openai" | "anthropic" | "gemini" | "perplexity";

type SupabaseLike = {
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

export async function resolveApiKey(
  supabase: SupabaseLike,
  userId: string,
  provider: ApiKeyProvider
): Promise<string | null> {
  const { data } = await supabase
    .from("user_api_keys")
    .select("api_key")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  return data?.api_key ?? null;
}
