"use server";

import { requireProgramAccess, logProgramUsage } from "@/lib/access";
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
 * 네이버 검색어트렌드는 회원 개인 데이터가 아니라 공개 시장 데이터라(누가 조회하든 결과 동일),
 * 회원 각자 네이버 앱을 등록하게 하지 않고 AIMaster(사장님) 계정의 공용 키
 * (NAVER_TREND_CLIENT_ID/SECRET 환경변수, NAVER API HUB에서 발급)로 조회한 뒤 캐시(24시간)를
 * 거쳐 전체 회원에게 제공한다. 이렇게 하면 회원 수가 늘어도 실제 API 호출량은 "하루에 새로
 * 묻는 키워드 조합 수"로만 늘어난다.
 */
export async function fetchTrendAction(
  groups: TrendKeywordGroup[],
  periodMonths: 1 | 3 | 6,
): Promise<FetchTrendState> {
  const user = await requireProgramAccess();

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

  const clientId = process.env.NAVER_TREND_CLIENT_ID;
  const clientSecret = process.env.NAVER_TREND_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return { error: "네이버 트렌드 조회용 공용 API 키가 아직 설정되지 않았습니다. 관리자에게 문의해주세요." };
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
