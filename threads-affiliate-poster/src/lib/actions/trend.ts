"use server";

import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { fetchSearchTrend, type TrendKeywordGroup, type TrendResultGroup, type TrendTimeUnit } from "@/lib/naver/trend";
import { buildCacheKey, getCachedTrend, saveCachedTrend } from "@/lib/naver/trendCache";

export interface FetchTrendState {
  results?: TrendResultGroup[];
  error?: string;
  fromCache?: boolean;
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

/**
 * 네이버 검색어트렌드: 회원 본인이 등록한 네이버 Client ID/Secret으로만 조회한다(운영자 공용 키 없음 — 최상위 규칙).
 * 결과는 공개 시장 데이터라 24시간 캐시를 공유하지만, 캐시를 읽기 전에도 본인 키 등록을 먼저 확인한다.
 */
export async function fetchTrendAction(
  groups: TrendKeywordGroup[],
  periodMonths: 1 | 3 | 6,
): Promise<FetchTrendState> {
  const user = await requireProgramAccess();

  const supabase = await createClient();
  const [clientId, clientSecret] = await Promise.all([
    resolveApiKey(supabase, user.id, "naver_client_id"),
    resolveApiKey(supabase, user.id, "naver_client_secret"),
  ]);
  if (!clientId || !clientSecret) {
    return { error: "네이버 API 키가 없습니다. API키등록·플랫폼연동에서 본인 네이버 Client ID/Secret을 등록해주세요." };
  }

  const cleaned = groups
    .map((g) => ({
      groupName: g.groupName.trim(),
      keywords: g.keywords.map((k) => k.trim()).filter(Boolean).slice(0, 20),
    }))
    .filter((g) => g.groupName && g.keywords.length > 0)
    .slice(0, 5);

  if (cleaned.length === 0) {
    return { error: "그룹명과 키워드를 1개 이상 입력해주세요." };
  }

  const timeUnit: TrendTimeUnit = periodMonths === 1 ? "date" : "week";
  const cacheKey = buildCacheKey(periodMonths, timeUnit, cleaned);

  const cached = await getCachedTrend(cacheKey);
  if (cached) {
    await logProgramUsage({ userId: user.id, action: "fetch_naver_trend_cached" });
    return { results: cached, fromCache: true };
  }

  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - periodMonths);

  try {
    const results = await fetchSearchTrend(
      { clientId, clientSecret },
      { startDate: toDateStr(start), endDate: toDateStr(end), timeUnit, keywordGroups: cleaned },
    );
    await saveCachedTrend(cacheKey, periodMonths, timeUnit, cleaned, results);
    await logProgramUsage({ userId: user.id, action: "fetch_naver_trend" });
    return { results, fromCache: false };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "트렌드 조회에 실패했습니다." };
  }
}
