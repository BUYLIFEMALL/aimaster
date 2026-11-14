"use server";

// E2-1 등록 정보 도우미 — 연관 키워드·월간 검색수(회원 본인 네이버 검색광고 키, 무료·계정 한도 있음).
// 운영자 키로 대신 부르지 않는다. 키가 없으면 설정 안내만 돌려준다.
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { getRelatedKeywords, sanitizeSeedKeyword, type RelatedKeyword } from "@/lib/naver/searchAd";

const LIMIT = 20;

export async function relatedKeywordsAction(seed: string): Promise<{ keywords?: RelatedKeyword[]; error?: string; needsKey?: boolean }> {
  const user = await requireProgramAccess();
  const cleanSeed = sanitizeSeedKeyword(String(seed ?? "").slice(0, 40));
  if (!cleanSeed) return { error: "기준 키워드를 입력해 주세요." };

  const supabase = await createClient();
  const [apiKey, secretKey, customerId] = await Promise.all([
    resolveApiKey(supabase, user.id, "naver_ads_api_key"),
    resolveApiKey(supabase, user.id, "naver_ads_secret_key"),
    resolveApiKey(supabase, user.id, "naver_ads_customer_id"),
  ]);
  if (!apiKey || !secretKey || !customerId) {
    return { needsKey: true, error: "네이버 검색광고 API 키가 없습니다. 설정 화면에서 본인 키 3개를 등록해 주세요." };
  }

  try {
    const related = await getRelatedKeywords({ apiKey, secretKey, customerId }, cleanSeed);
    const keywords = related
      .filter((r) => r.keyword && r.totalMonthlySearches > 0)
      .sort((a, b) => b.totalMonthlySearches - a.totalMonthlySearches)
      .slice(0, LIMIT);
    return { keywords };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "네이버 검색광고 API 호출에 실패했습니다." };
  }
}
