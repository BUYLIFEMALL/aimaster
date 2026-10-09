"use server";

import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { searchNaver, type NaverSearchItem, type NaverSearchType } from "@/lib/naver/search";
import { getCachedSearch, saveCachedSearch } from "@/lib/naver/searchCache";

export interface MarketResearchState {
  news?: NaverSearchItem[];
  blog?: NaverSearchItem[];
  cafe?: NaverSearchItem[];
  error?: string;
  fromCache?: boolean;
}

const TYPES: { type: NaverSearchType; key: "news" | "blog" | "cafe" }[] = [
  { type: "news", key: "news" },
  { type: "blog", key: "blog" },
  { type: "cafearticle", key: "cafe" },
];

/**
 * 뉴스·블로그·카페글 검색: 회원 본인이 등록한 네이버 Client ID/Secret으로만 조회한다(운영자 공용 키 없음).
 * 결과는 공개 데이터라 12시간 캐시를 공유한다. "이 키워드에 대해 사람들이 뭐라고 하는지" 시장 반응 확인용.
 */
export async function fetchMarketResearchAction(query: string): Promise<MarketResearchState> {
  const user = await requireProgramAccess();

  const trimmed = query.trim();
  if (!trimmed) {
    return { error: "검색할 키워드를 입력해주세요." };
  }

  const supabase = await createClient();
  const [clientId, clientSecret] = await Promise.all([
    resolveApiKey(supabase, user.id, "naver_client_id"),
    resolveApiKey(supabase, user.id, "naver_client_secret"),
  ]);
  if (!clientId || !clientSecret) {
    return { error: "네이버 API 키가 없습니다. API키등록·플랫폼연동에서 본인 네이버 Client ID/Secret을 등록해주세요." };
  }

  const results: Partial<Record<"news" | "blog" | "cafe", NaverSearchItem[]>> = {};
  let anyFresh = false;

  for (const { type, key } of TYPES) {
    const cached = await getCachedSearch(type, trimmed);
    if (cached) {
      results[key] = cached;
      continue;
    }

    try {
      const items = await searchNaver({ clientId, clientSecret }, type, trimmed, 10);
      await saveCachedSearch(type, trimmed, items);
      results[key] = items;
      anyFresh = true;
    } catch (err) {
      return { error: err instanceof Error ? err.message : "검색에 실패했습니다." };
    }
  }

  await logProgramUsage({ userId: user.id, action: "fetch_naver_market_research" });
  return { ...results, fromCache: !anyFresh };
}
