import "server-only";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TrendKeywordGroup, TrendResultGroup, TrendTimeUnit } from "./trend";

// 네이버 검색어트렌드는 회원 개인 데이터가 아니라 공개 시장 데이터라(누가 조회하든 결과 동일),
// 회원 각자 네이버 앱을 등록하게 하지 않고 AIMaster 공용 키로 조회한 뒤 여기 캐시해서
// 전체 회원이 공유한다. TTL 24시간 — 네이버 API HUB 무료 한도(검색어트렌드 월 50,000건)를
// 회원 수와 무관하게 "하루에 새로 묻는 키워드 조합 수"로만 소비하게 만드는 게 목적이다.
const TTL_MS = 24 * 60 * 60 * 1000;

export function buildCacheKey(periodMonths: number, timeUnit: TrendTimeUnit, groups: TrendKeywordGroup[]): string {
  const normalized = groups
    .map((g) => `${g.groupName}:${[...g.keywords].sort().join(",")}`)
    .sort()
    .join("|");
  return crypto.createHash("sha256").update(`${periodMonths}:${timeUnit}:${normalized}`).digest("hex");
}

export async function getCachedTrend(cacheKey: string): Promise<TrendResultGroup[] | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("naver_trend_cache")
    .select("results, fetched_at")
    .eq("cache_key", cacheKey)
    .maybeSingle();

  if (!data) return null;
  const age = Date.now() - new Date(data.fetched_at).getTime();
  if (age > TTL_MS) return null;
  return data.results as unknown as TrendResultGroup[];
}

export async function saveCachedTrend(
  cacheKey: string,
  periodMonths: number,
  timeUnit: TrendTimeUnit,
  groups: TrendKeywordGroup[],
  results: TrendResultGroup[],
): Promise<void> {
  const admin = createAdminClient();
  await admin.from("naver_trend_cache").upsert(
    {
      cache_key: cacheKey,
      period_months: periodMonths,
      time_unit: timeUnit,
      groups: groups as never,
      results: results as never,
      fetched_at: new Date().toISOString(),
    },
    { onConflict: "cache_key" },
  );
}
