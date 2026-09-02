"use server";

import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { searchProducts as searchAliexpress } from "@/lib/aliexpress/client";
import { searchProducts as searchDomeggook } from "@/lib/domeggook/client";
import { searchProducts as searchElevenst } from "@/lib/elevenst/client";
import { translateToEnglishKeyword } from "@/lib/ai/translateKeyword";
import { calcMargin, MARGIN_DEFAULTS, DOMESTIC_MARGIN_DEFAULTS } from "@/lib/margin";

// Phase 11 — 관심 키워드 여러 개를 한 번에 검색해 대표(최저가) 상품 기준 마진을 계산한다.
// 상세 계산기(SourcingCalculator)와 달리 상품을 하나하나 고르지 않고, 채널별 검색결과 중
// 최저가 상품을 보수적인 대표값으로 삼아 빠르게 여러 키워드/채널을 비교하는 용도다.
// 정확한 최종 의사결정은 /sourcing의 단일 계산기로 상품을 직접 골라 확인할 것을 권장한다.

export type Platform = "aliexpress" | "domeggook" | "elevenst";
const DOMESTIC_PLATFORMS: Platform[] = ["domeggook", "elevenst"];
const MAX_KEYWORDS = 20;

export interface BatchMarginRow {
  keyword: string;
  platform: Platform;
  title: string;
  sourcePriceKrw: number;
  sellingPriceKrw: number;
  marginRatePct: number;
  contributionProfitKrw: number;
  detailUrl: string;
}

export interface BatchMarginSkip {
  keyword: string;
  platform: Platform;
  reason: string;
}

export interface BatchMarginState {
  error?: string;
  rows?: BatchMarginRow[];
  skipped?: BatchMarginSkip[];
}

interface PricedCandidate {
  title: string;
  priceKrw: number;
  detailUrl: string;
}

export async function runBatchMarginCalculationAction(formData: FormData): Promise<BatchMarginState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  let keywords: string[];
  let platforms: Platform[];
  try {
    keywords = JSON.parse(String(formData.get("keywords") ?? "[]"));
    platforms = JSON.parse(String(formData.get("platforms") ?? "[]"));
  } catch {
    return { error: "잘못된 요청입니다." };
  }

  keywords = Array.from(new Set(keywords.map((k) => k.trim()).filter(Boolean)));
  if (keywords.length === 0) return { error: "키워드를 1개 이상 선택해주세요." };
  if (keywords.length > MAX_KEYWORDS) return { error: `한 번에 최대 ${MAX_KEYWORDS}개 키워드까지 계산할 수 있습니다.` };
  if (platforms.length === 0) return { error: "채널을 1개 이상 선택해주세요." };

  const [appKey, appSecret, trackingId, domeggookKey, elevenstKey, openaiKey, geminiKey] = await Promise.all([
    resolveApiKey(supabase, user.id, "aliexpress_app_key"),
    resolveApiKey(supabase, user.id, "aliexpress_app_secret"),
    resolveApiKey(supabase, user.id, "aliexpress_tracking_id"),
    resolveApiKey(supabase, user.id, "domeggook_api_key"),
    resolveApiKey(supabase, user.id, "elevenst_api_key"),
    resolveApiKey(supabase, user.id, "openai"),
    resolveApiKey(supabase, user.id, "gemini"),
  ]);

  async function fetchCandidates(keyword: string, platform: Platform): Promise<PricedCandidate[] | { skipReason: string }> {
    if (platform === "aliexpress") {
      if (!appKey || !appSecret || !trackingId) return { skipReason: "알리익스프레스 API 키 미등록" };
      const { keyword: searchKeyword } = await translateToEnglishKeyword(keyword, { openai: openaiKey, gemini: geminiKey });
      const products = await searchAliexpress(searchKeyword, { appKey, appSecret, trackingId, pageSize: 10 });
      return products
        .filter((p) => p.salePriceKrw != null)
        .map((p) => ({ title: p.title, priceKrw: p.salePriceKrw!, detailUrl: p.detailUrl }));
    }
    if (platform === "domeggook") {
      if (!domeggookKey) return { skipReason: "도매매 API 키 미등록" };
      const products = await searchDomeggook(keyword, { apiKey: domeggookKey, pageSize: 10 });
      return products
        .filter((p) => p.priceKrw != null)
        .map((p) => ({ title: p.title, priceKrw: p.priceKrw!, detailUrl: p.detailUrl }));
    }
    if (!elevenstKey) return { skipReason: "11번가 API 키 미등록" };
    const products = await searchElevenst(keyword, { apiKey: elevenstKey, pageSize: 10 });
    return products
      .map((p) => ({ title: p.title, priceKrw: p.salePriceKrw ?? p.priceKrw, detailUrl: p.detailUrl }))
      .filter((p): p is PricedCandidate => p.priceKrw != null);
  }

  const tasks = keywords.flatMap((keyword) => platforms.map((platform) => ({ keyword, platform })));

  const outcomes = await Promise.all(
    tasks.map(async ({ keyword, platform }) => {
      try {
        const candidates = await fetchCandidates(keyword, platform);
        if ("skipReason" in candidates) return { keyword, platform, skip: candidates.skipReason };
        if (candidates.length === 0) return { keyword, platform, skip: "검색된 상품이 없습니다" };

        const cheapest = candidates.reduce((min, c) => (c.priceKrw < min.priceKrw ? c : min));
        const defaults = DOMESTIC_PLATFORMS.includes(platform) ? DOMESTIC_MARGIN_DEFAULTS : MARGIN_DEFAULTS;
        const sellingPriceKrw = Math.round(cheapest.priceKrw * 2.5);
        const margin = calcMargin({
          sourcePriceKrw: cheapest.priceKrw,
          customsDutyRate: defaults.customsDutyRate,
          vatRate: defaults.vatRate,
          shippingPerUnitKrw: defaults.shippingPerUnitKrw,
          domesticFeePerUnitKrw: defaults.domesticFeePerUnitKrw,
          platformFeeRate: defaults.platformFeeRate,
          deliveryFeeKrw: defaults.deliveryFeeKrw,
          marketingFeeKrw: defaults.marketingFeeKrw,
          sellingPriceKrw,
        });

        const row: BatchMarginRow = {
          keyword,
          platform,
          title: cheapest.title,
          sourcePriceKrw: cheapest.priceKrw,
          sellingPriceKrw,
          marginRatePct: margin.marginRatePct,
          contributionProfitKrw: margin.contributionProfitKrw,
          detailUrl: cheapest.detailUrl,
        };
        return { keyword, platform, row };
      } catch (err) {
        return { keyword, platform, skip: err instanceof Error ? err.message : "조회 실패" };
      }
    }),
  );

  const rows = outcomes
    .filter((o): o is { keyword: string; platform: Platform; row: BatchMarginRow } => "row" in o)
    .map((o) => o.row)
    .sort((a, b) => b.marginRatePct - a.marginRatePct);

  const skipped = outcomes
    .filter((o): o is { keyword: string; platform: Platform; skip: string } => "skip" in o)
    .map((o) => ({ keyword: o.keyword, platform: o.platform, reason: o.skip }));

  await logProgramUsage({
    userId: user.id,
    action: "batch_margin_calc",
    quantity: tasks.length,
    metadata: { keywordCount: keywords.length, platforms },
  });

  return { rows, skipped };
}
