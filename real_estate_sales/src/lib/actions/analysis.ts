"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveApiKey, resolveApiKeyWithSource } from "@/lib/apiKeys";
import { analyzeListing } from "@/lib/ai/analyze";
import type { AnalysisModel } from "@/lib/ai/models";
import { getDistrictSentiment } from "@/lib/ai/sentiment";
import type { Database } from "@/types/database.types";

export interface AnalysisActionState {
  error?: string;
  success?: boolean;
}

/**
 * 매물 하나를 분석해서 real_estate_analyses에 저장하는 핵심 로직.
 * 매물 상세 페이지 첫 조회 시 자동 실행(ensureListingAnalysis)과, 사용자가 직접
 * 누르는 "다시 분석하기" 버튼(analyzeListingAction) 양쪽에서 재사용한다.
 * 시장 분위기는 자치구+날짜 단위로 캐싱된 Perplexity 조사 결과("오늘 기준 한국
 * 부동산 정책 분위기와 해당 자치구 분위기 조사")를 그대로 분석 프롬프트에 반영한다.
 */
export async function runListingAnalysis(
  supabase: SupabaseClient<Database>,
  userId: string,
  listingId: string,
  model: AnalysisModel,
): Promise<{ error: string } | { error?: undefined }> {
  const { data: listing } = await supabase
    .from("real_estate_listings")
    .select("*")
    .eq("id", listingId)
    .maybeSingle();

  if (!listing) {
    return { error: "매물 정보를 찾을 수 없습니다." };
  }

  const [openaiResolved, perplexityKey] = await Promise.all([
    resolveApiKeyWithSource(supabase, userId, "openai"),
    resolveApiKey(supabase, userId, "perplexity"),
  ]);
  const openaiKey = openaiResolved.key;
  const usedFallbackKey = !openaiResolved.isOwnKey;

  if (!openaiKey) {
    return { error: "OpenAI API 키가 없습니다. 설정에서 본인 키를 등록해주세요." };
  }
  if (!perplexityKey) {
    return { error: "Perplexity API 키가 없습니다. 설정에서 본인 키를 등록해주세요." };
  }

  // 앱 공용(폴백) 키를 쓰는 사용자끼리는, 같은 매물+같은 모델이면 이미 다른 사용자가
  // 만들어둔 분석 결과를 그대로 복사해서 쓰고 GPT를 다시 호출하지 않는다 — 앱 계정의
  // 실제 API 비용을 절감하기 위함. 본인 키를 쓰는 사용자는 항상 새로 분석한다(본인 비용).
  if (usedFallbackKey) {
    const admin = createAdminClient();
    const { data: shared } = await admin
      .from("real_estate_analyses")
      .select("undervaluation_index, predicted_growth_pct, investment_score, rationale, raw_result")
      .eq("listing_id", listingId)
      .eq("model", model)
      .eq("used_fallback_key", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (shared) {
      const { error: copyError } = await supabase.from("real_estate_analyses").insert({
        user_id: userId,
        listing_id: listingId,
        model,
        undervaluation_index: shared.undervaluation_index,
        predicted_growth_pct: shared.predicted_growth_pct,
        investment_score: shared.investment_score,
        rationale: shared.rationale,
        raw_result: shared.raw_result,
        used_fallback_key: true,
      });
      if (copyError) {
        return { error: `분석 결과 저장에 실패했습니다: ${copyError.message}` };
      }
      await supabase
        .from("real_estate_user_matches")
        .update({ status: "analyzed" })
        .eq("user_id", userId)
        .eq("listing_id", listingId);
      return {};
    }
  }

  try {
    const sentiment = await getDistrictSentiment(supabase, listing.sgg_nm, perplexityKey);

    // 전세가율/괴리율은 원본 API에 없어 여기서 계산한다.
    // 전세가율 = (직전 전세 보증금) / (매매가) * 100
    // 괴리율 = (거래금액 - 공시가격) / 공시가격 * 100 (거래금액을 원 단위로 환산해서 비교)
    const priceWon = listing.price_amount ? listing.price_amount * 10000 : null;
    const jeonseRatioPct =
      listing.prev_deposit && priceWon
        ? Number(((listing.prev_deposit * 10000 * 100) / priceWon).toFixed(1))
        : null;
    const gapRatioPct =
      priceWon && listing.official_price
        ? Number((((priceWon - listing.official_price) / listing.official_price) * 100).toFixed(1))
        : null;

    const result = await analyzeListing(
      {
        dataProvidedAt: listing.data_provided_at,
        priceAmountManwon: listing.price_amount,
        officialPrice: listing.official_price,
        buildingYear: listing.building_year,
        jeonseRatioPct,
        gapRatioPct,
        contractDate: listing.contract_date,
        dealType: "매매",
        prevDepositManwon: listing.prev_deposit,
        prevRentManwon: listing.prev_rent,
        buildingArea: listing.building_area,
        exclusiveArea: listing.exclusive_area,
        sggNm: listing.sgg_nm,
        floor: listing.floor,
        marketSentiment: sentiment,
      },
      model,
      openaiKey,
    );

    if (result.error) {
      console.error(
        `AI 분석 오류 응답 (listing ${listingId}, model ${model}):`,
        JSON.stringify(result),
      );
      return { error: result.error };
    }

    const { error: insertError } = await supabase.from("real_estate_analyses").insert({
      user_id: userId,
      listing_id: listingId,
      model,
      undervaluation_index: result.undervaluation_index ?? null,
      predicted_growth_pct: result.forecast_growth_rate ?? null,
      investment_score: result.attractiveness_score ?? null,
      rationale: result.rationale ?? null,
      raw_result: JSON.parse(JSON.stringify(result)),
      used_fallback_key: usedFallbackKey,
    });

    if (insertError) {
      return { error: `분석 결과 저장에 실패했습니다: ${insertError.message}` };
    }

    await supabase
      .from("real_estate_user_matches")
      .update({ status: "analyzed" })
      .eq("user_id", userId)
      .eq("listing_id", listingId);

    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "AI 분석에 실패했습니다." };
  }
}

/**
 * 이미 분석 결과가 있으면 아무것도 안 하고, 없으면 사용자의 선호 모델(설정에서
 * 등록한 값, 없으면 기본값)로 자동 분석해서 저장한다. 매물 상세 페이지에서
 * "누르지 않아도 바로 분석 결과가 보이도록" 최초 조회 시 서버 컴포넌트에서 호출한다.
 * 이미 분석된 매물은 다시 API를 호출하지 않으므로 비용이 반복되지 않는다.
 */
export async function ensureListingAnalysis(
  supabase: SupabaseClient<Database>,
  userId: string,
  listingId: string,
): Promise<void> {
  const { data: existing } = await supabase
    .from("real_estate_analyses")
    .select("id")
    .eq("user_id", userId)
    .eq("listing_id", listingId)
    .maybeSingle();

  if (existing) return;

  const { data: pref } = await supabase
    .from("real_estate_user_preferences")
    .select("preferred_model")
    .eq("user_id", userId)
    .maybeSingle();

  const model = (pref?.preferred_model ?? "gpt-5.6-luna") as AnalysisModel;

  // 키가 없으면 조용히 건너뛴다 — 페이지는 "설정에서 키/모델을 등록해주세요" 안내만 보여준다.
  await runListingAnalysis(supabase, userId, listingId, model).catch(() => undefined);
}

/** 이미 있는 분석 결과를 무시하고 강제로 다시 분석한다 ("다시 분석하기" 버튼용). */
export async function reanalyzeListingAction(
  _prevState: AnalysisActionState,
  formData: FormData,
): Promise<AnalysisActionState> {
  const user = await requireProgramAccess();
  const listingId = String(formData.get("listingId"));
  const supabase = await createClient();

  const { data: pref } = await supabase
    .from("real_estate_user_preferences")
    .select("preferred_model")
    .eq("user_id", user.id)
    .maybeSingle();

  const model = (pref?.preferred_model ?? "gpt-5.6-luna") as AnalysisModel;

  const result = await runListingAnalysis(supabase, user.id, listingId, model);
  if (result.error) {
    return { error: result.error };
  }

  revalidatePath(`/listings/${listingId}`);
  return { success: true };
}
