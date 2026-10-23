import "server-only";

type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

// BLC-08a: 네이버 검색 키(naver_client_id/secret)도 공용 user_api_keys 항목을 그대로 읽는다(새 키 항목 없음).
export async function resolveApiKey(supabase: SupabaseLike, userId: string, provider: "openai" | "anthropic" | "gemini" | "naver_client_id" | "naver_client_secret") {
  const { data } = await supabase
    .from("user_api_keys")
    .select("api_key")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();
  return data?.api_key ?? null;
}
