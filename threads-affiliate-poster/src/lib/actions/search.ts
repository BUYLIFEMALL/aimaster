"use server";

import { requireProgramAccess, logProgramUsage } from "@/lib/access";
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
 * 뉴스·블로그·카페글 검색도 트렌드와 마찬가지로 공개 데이터라, 회원 개인 키 대신
 * AIMaster 공용 키(NAVER_TREND_CLIENT_ID/SECRET — 트렌드와 같은 앱, 같은 자격증명)로
 * 조회하고 12시간 캐시한다. "이 키워드에 대해 사람들이 뭐라고 하는지" 시장 반응을
 * 상품 소싱 전에 훑어보는 용도.
 */
export async function fetchMarketResearchAction(query: string): Promise<MarketResearchState> {
  const user = await requireProgramAccess();

  const trimmed = query.trim();
  if (!trimmed) {
    return { error: "검색할 키워드를 입력해주세요." };
  }

  const clientId = process.env.NAVER_TREND_CLIENT_ID;
  const clientSecret = process.env.NAVER_TREND_CLIENT_SECRET;

  const results: Partial<Record<"news" | "blog" | "cafe", NaverSearchItem[]>> = {};
  let anyFresh = false;

  for (const { type, key } of TYPES) {
    const cached = await getCachedSearch(type, trimmed);
    if (cached) {
      results[key] = cached;
      continue;
    }

    if (!clientId || !clientSecret) {
      return { error: "네이버 검색용 공용 API 키가 아직 설정되지 않았습니다. 관리자에게 문의해주세요." };
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
