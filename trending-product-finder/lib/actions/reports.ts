"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { getCategoryKeywordTrend, calcTrendChangePct, type NaverAuth } from "@/lib/naver/datalab";
import { getShoppingCompetition } from "@/lib/naver/shoppingSearch";
import { calcOpportunityScore, generateReasons, type OpportunityResult } from "@/lib/ai/opportunity";
import type { Json } from "@/types/database.types";

export interface GenerateReportState {
  error?: string;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function generateReportAction(formData: FormData): Promise<GenerateReportState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const watchlistId = String(formData.get("watchlistId") ?? "");

  const { data: watchlist } = await supabase
    .from("trend_watchlist")
    .select("id, category_name, naver_category_code, keywords")
    .eq("id", watchlistId)
    .eq("user_id", user.id)
    .single();

  if (!watchlist) return { error: "관심 목록을 찾을 수 없습니다." };

  const [naverClientId, naverClientSecret, openaiKey, geminiKey] = await Promise.all([
    resolveApiKey(supabase, user.id, "naver_client_id"),
    resolveApiKey(supabase, user.id, "naver_client_secret"),
    resolveApiKey(supabase, user.id, "openai"),
    resolveApiKey(supabase, user.id, "gemini"),
  ]);

  if (!naverClientId || !naverClientSecret) {
    return { error: "네이버 Client ID/Secret이 등록되어 있지 않습니다. 설정 페이지에서 본인 키를 등록해주세요." };
  }

  const auth: NaverAuth = { clientId: naverClientId, clientSecret: naverClientSecret };

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
  const startDateStr = formatDate(startDate);
  const endDateStr = formatDate(endDate);

  const results: OpportunityResult[] = [];

  for (const keyword of watchlist.keywords) {
    try {
      const trendPoints = await getCategoryKeywordTrend(auth, {
        categoryName: watchlist.category_name,
        categoryCode: watchlist.naver_category_code ?? "",
        keyword,
        startDate: startDateStr,
        endDate: endDateStr,
        timeUnit: "week",
      });
      const trendIndex = trendPoints.length ? trendPoints[trendPoints.length - 1].ratio : null;
      const trendChangePct = calcTrendChangePct(trendPoints);

      const competition = await getShoppingCompetition(auth, keyword);

      await supabase.from("trend_snapshots").insert({
        user_id: user.id,
        watchlist_id: watchlist.id,
        keyword,
        trend_index: trendIndex,
        period_start: startDateStr,
        period_end: endDateStr,
        time_unit: "week",
        source: "naver_datalab",
        raw: trendPoints as unknown as Json,
      });

      await supabase.from("shopping_competition").insert({
        user_id: user.id,
        watchlist_id: watchlist.id,
        keyword,
        product_count: competition.productCount,
        min_price: competition.minPrice,
        max_price: competition.maxPrice,
      });

      const opportunityScore = calcOpportunityScore({
        keyword,
        trendIndex,
        trendChangePct,
        productCount: competition.productCount,
        minPrice: competition.minPrice,
        maxPrice: competition.maxPrice,
      });

      results.push({
        keyword,
        trendIndex,
        trendChangePct,
        productCount: competition.productCount,
        minPrice: competition.minPrice,
        maxPrice: competition.maxPrice,
        opportunityScore,
      });
    } catch (err) {
      results.push({
        keyword,
        trendIndex: null,
        trendChangePct: null,
        productCount: null,
        minPrice: null,
        maxPrice: null,
        opportunityScore: 0,
      });
      console.error(`[trending-product-finder] "${keyword}" 조회 실패:`, err);
    }
  }

  let reasons = new Map<string, string>();
  if (openaiKey || geminiKey) {
    try {
      reasons = await generateReasons(results, { openai: openaiKey, gemini: geminiKey });
    } catch (err) {
      console.error("[trending-product-finder] AI 추천 사유 생성 실패:", err);
    }
  }

  const items = results
    .map((r) => ({ ...r, reason: reasons.get(r.keyword) ?? null }))
    .sort((a, b) => b.opportunityScore - a.opportunityScore);

  const { error: insertError } = await supabase.from("recommendation_reports").insert({
    user_id: user.id,
    watchlist_id: watchlist.id,
    ai_summary: openaiKey || geminiKey ? null : "AI 키가 등록되지 않아 추천 사유 없이 지표만 계산했습니다.",
    items: items as unknown as Json,
  });
  if (insertError) return { error: insertError.message };

  await logProgramUsage({
    userId: user.id,
    action: "generate_report",
    quantity: watchlist.keywords.length,
    metadata: { watchlistId: watchlist.id },
  });

  revalidatePath("/reports");
  return {};
}
