"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { getRelatedKeywords, sanitizeSeedKeyword, type NaverAdsAuth } from "@/lib/naver/searchAd";
import { getCategoryKeywordTrend, calcTrendChangePct, type NaverAuth } from "@/lib/naver/datalab";
import { runReasonPrompt } from "@/lib/ai/opportunity";
import type { WatchlistEntry } from "@/lib/actions/watchlist";

export interface CandidateItem {
  keyword: string;
  monthlyPcSearches: number;
  monthlyMobileSearches: number;
  totalMonthlySearches: number;
  competitionLevel: string | null;
  trendChangePct: number | null;
  candidateScore: number;
  reason: string | null;
}

export interface FindCandidatesState {
  error?: string;
  candidates?: CandidateItem[];
  searchedSeed?: string;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * 후보 점수(0~100) — 검색량(최대 60점) + 경쟁정도(최대 25점, 낮을수록 유리) +
 * 관심도 상승폭(최대 15점, 데이터랩 키가 있을 때만)을 더한 휴리스틱이다. 기회 점수와
 * 달리 "검색광고 월간 검색수" 자체가 이미 실제 수치에 가까운 값이라 관심도 지수만큼
 * 큰 비중을 주지 않는다.
 */
function calcCandidateScore(item: {
  totalMonthlySearches: number;
  competitionLevel: string | null;
  trendChangePct: number | null;
}): number {
  const volumePart = Math.min(item.totalMonthlySearches / 5000, 1) * 60;
  const competitionPart =
    item.competitionLevel === "낮음" ? 25 : item.competitionLevel === "중간" ? 12 : item.competitionLevel === "높음" ? 0 : 12;
  const trendPart = item.trendChangePct != null ? Math.max(0, Math.min(item.trendChangePct, 100)) * 0.15 : 0;
  return Math.max(0, Math.min(100, Math.round((volumePart + competitionPart + trendPart) * 10) / 10));
}

function buildCandidatePrompt(categoryName: string, items: CandidateItem[]): string {
  const rows = items
    .map(
      (i) =>
        `- ${i.keyword}: 월간검색수=${i.totalMonthlySearches.toLocaleString()}(PC ${i.monthlyPcSearches.toLocaleString()}+모바일 ${i.monthlyMobileSearches.toLocaleString()}), 경쟁정도=${i.competitionLevel ?? "N/A"}, 관심도변화율=${i.trendChangePct != null ? i.trendChangePct.toFixed(1) + "%" : "N/A"}, 후보점수=${i.candidateScore}`,
    )
    .join("\n");

  return `당신은 "${categoryName}" 카테고리를 소싱하려는 이커머스 셀러에게 조언하는 전문가입니다. 아래는 실제 네이버 검색광고 데이터에서 뽑은 연관 키워드별 지표입니다.

${rows}

각 키워드에 대해, 지금 이 상품군을 소싱해볼 만한지 1문장의 한글 사유를 작성하세요. 검색량은 많은데 경쟁정도가 낮으면 "기회"로, 검색량도 많고 경쟁도 치열하면 "레드오션"으로, 검색량 자체가 적으면 "수요 부족"으로 판단하는 식으로 구체적인 숫자를 근거로 설명하세요.

반드시 아래 JSON 객체 형식으로만 응답하세요 (다른 텍스트 없이):
{"items": [{"keyword": "키워드명", "reason": "사유 문장"}, ...]}`;
}

/**
 * 카테고리 대표 시드 키워드로 연관 키워드(네이버 검색광고 키워드도구)를 조회하고,
 * 검색량 상위 후보는 데이터랩 관심도 추이까지 결합해 후보 점수를 매긴다.
 * 결과는 DB에 저장하지 않고(휴발성), 마음에 드는 항목만 회원이 직접 관심 목록에 추가한다.
 */
export async function findCandidatesAction(formData: FormData): Promise<FindCandidatesState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const categoryName = String(formData.get("categoryName") ?? "").trim();
  const categoryCode = String(formData.get("naverCategoryCode") ?? "").trim();
  const seedKeyword = String(formData.get("seedKeyword") ?? "").trim();

  if (!categoryName || !categoryCode) return { error: "카테고리를 선택해주세요." };
  if (!seedKeyword) return { error: "카테고리를 대표하는 기준 키워드를 1개 입력해주세요 (예: 청소기, 캠핑용품)." };

  const cleanSeed = sanitizeSeedKeyword(seedKeyword);
  if (!cleanSeed) return { error: "유효한 기준 키워드를 입력해주세요." };

  const [adsApiKey, adsSecretKey, adsCustomerId, naverClientId, naverClientSecret, openaiKey, geminiKey] = await Promise.all([
    resolveApiKey(supabase, user.id, "naver_ads_api_key"),
    resolveApiKey(supabase, user.id, "naver_ads_secret_key"),
    resolveApiKey(supabase, user.id, "naver_ads_customer_id"),
    resolveApiKey(supabase, user.id, "naver_client_id"),
    resolveApiKey(supabase, user.id, "naver_client_secret"),
    resolveApiKey(supabase, user.id, "openai"),
    resolveApiKey(supabase, user.id, "gemini"),
  ]);

  if (!adsApiKey || !adsSecretKey || !adsCustomerId) {
    return { error: "네이버 검색광고 API 키가 등록되어 있지 않습니다. 설정 페이지에서 본인 키를 등록해주세요." };
  }

  const adsAuth: NaverAdsAuth = { apiKey: adsApiKey, secretKey: adsSecretKey, customerId: adsCustomerId };

  let related;
  try {
    related = await getRelatedKeywords(adsAuth, seedKeyword);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "네이버 검색광고 API 호출에 실패했습니다." };
  }

  const ranked = related
    .filter((r) => r.keyword && r.totalMonthlySearches > 0)
    .sort((a, b) => b.totalMonthlySearches - a.totalMonthlySearches)
    .slice(0, 20);

  const ENRICH_COUNT = 8;
  const toEnrich = ranked.slice(0, ENRICH_COUNT);
  const rest = ranked.slice(ENRICH_COUNT);

  const enriched: CandidateItem[] = [];

  if (naverClientId && naverClientSecret) {
    const datalabAuth: NaverAuth = { clientId: naverClientId, clientSecret: naverClientSecret };
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);

    for (const item of toEnrich) {
      let trendChangePct: number | null = null;
      try {
        const points = await getCategoryKeywordTrend(datalabAuth, {
          categoryName,
          categoryCode,
          keyword: item.keyword,
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          timeUnit: "week",
        });
        trendChangePct = calcTrendChangePct(points);
      } catch (err) {
        console.error(`[trending-product-finder] "${item.keyword}" 관심도 추이 조회 실패:`, err);
      }
      enriched.push({
        ...item,
        trendChangePct,
        candidateScore: calcCandidateScore({ ...item, trendChangePct }),
        reason: null,
      });
    }
  } else {
    for (const item of toEnrich) {
      enriched.push({ ...item, trendChangePct: null, candidateScore: calcCandidateScore({ ...item, trendChangePct: null }), reason: null });
    }
  }

  const restItems: CandidateItem[] = rest.map((item) => ({
    ...item,
    trendChangePct: null,
    candidateScore: calcCandidateScore({ ...item, trendChangePct: null }),
    reason: null,
  }));

  let candidates = [...enriched, ...restItems].sort((a, b) => b.candidateScore - a.candidateScore);

  if (openaiKey || geminiKey) {
    try {
      const prompt = buildCandidatePrompt(categoryName, candidates.slice(0, ENRICH_COUNT));
      const reasons = await runReasonPrompt(prompt, { openai: openaiKey, gemini: geminiKey });
      candidates = candidates.map((c) => ({ ...c, reason: reasons.get(c.keyword) ?? c.reason }));
    } catch (err) {
      console.error("[trending-product-finder] 후보 추천 사유 생성 실패:", err);
    }
  }

  return { candidates, searchedSeed: cleanSeed };
}

export interface AddCandidateState {
  error?: string;
  entry?: WatchlistEntry;
}

const SELECT_COLUMNS =
  "id, category_name, naver_category_code, keywords, is_active, sourcing_alert_enabled, sourcing_alert_interval_minutes, sourcing_alert_channels";

function toEntry(row: {
  id: string;
  category_name: string;
  naver_category_code: string | null;
  keywords: string[];
  is_active: boolean;
  sourcing_alert_enabled: boolean;
  sourcing_alert_interval_minutes: number | null;
  sourcing_alert_channels: string[];
}): WatchlistEntry {
  return {
    id: row.id,
    categoryName: row.category_name,
    naverCategoryCode: row.naver_category_code,
    keywords: row.keywords,
    isActive: row.is_active,
    sourcingAlertEnabled: row.sourcing_alert_enabled,
    sourcingAlertIntervalMinutes: row.sourcing_alert_interval_minutes,
    sourcingAlertChannels: row.sourcing_alert_channels,
  };
}

/**
 * 후보 키워드 1개를 해당 카테고리의 관심 목록에 추가한다(없으면 새로 만든다).
 * 성공 시 최신 상태의 entry를 반환해서, 클라이언트가 서버 컴포넌트 재검증 타이밍에
 * 의존하지 않고 화면 상태를 즉시 갱신할 수 있게 한다(2026-08-31: revalidatePath만으로는
 * 같은 화면의 "등록된 관심 목록" 영역이 곧바로 갱신되지 않는 문제가 실계정에서 재현됨).
 */
export async function addCandidateToWatchlistAction(formData: FormData): Promise<AddCandidateState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const categoryName = String(formData.get("categoryName") ?? "").trim();
  const categoryCode = String(formData.get("naverCategoryCode") ?? "").trim();
  const keyword = String(formData.get("keyword") ?? "").trim();

  if (!categoryName || !categoryCode || !keyword) return { error: "잘못된 요청입니다." };

  const { data: existing } = await supabase
    .from("trend_watchlist")
    .select(SELECT_COLUMNS)
    .eq("user_id", user.id)
    .eq("naver_category_code", categoryCode)
    .maybeSingle();

  if (existing) {
    if (existing.keywords.includes(keyword)) {
      return { entry: toEntry(existing) };
    }
    if (existing.keywords.length >= 10) {
      return { error: "이 카테고리는 이미 키워드 10개가 등록되어 있습니다. 관심 목록에서 정리 후 다시 추가해주세요." };
    }
    const { data, error } = await supabase
      .from("trend_watchlist")
      .update({ keywords: [...existing.keywords, keyword] })
      .eq("id", existing.id)
      .select(SELECT_COLUMNS)
      .single();
    if (error) return { error: error.message };
    revalidatePath("/watchlist");
    return { entry: toEntry(data) };
  }

  const { data, error } = await supabase
    .from("trend_watchlist")
    .insert({
      user_id: user.id,
      category_name: categoryName,
      naver_category_code: categoryCode,
      keywords: [keyword],
    })
    .select(SELECT_COLUMNS)
    .single();
  if (error) return { error: error.message };

  revalidatePath("/watchlist");
  return { entry: toEntry(data) };
}
