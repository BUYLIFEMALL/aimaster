"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { analyzeListing } from "@/lib/ai/analyze";
import type { AnalysisModel } from "@/lib/ai/models";
import { getDistrictSentiment } from "@/lib/ai/sentiment";

export interface AnalysisActionState {
  error?: string;
  success?: boolean;
}

export async function analyzeListingAction(
  _prevState: AnalysisActionState,
  formData: FormData,
): Promise<AnalysisActionState> {
  const user = await requireProgramAccess();
  const listingId = String(formData.get("listingId"));
  const model = String(formData.get("model") ?? "gpt-5.6-luna") as AnalysisModel;

  const supabase = await createClient();

  const { data: listing } = await supabase
    .from("real_estate_listings")
    .select("*")
    .eq("id", listingId)
    .maybeSingle();

  if (!listing) {
    return { error: "매물 정보를 찾을 수 없습니다." };
  }

  const [openaiKey, perplexityKey] = await Promise.all([
    resolveApiKey(supabase, user.id, "openai"),
    resolveApiKey(supabase, user.id, "perplexity"),
  ]);

  if (!openaiKey) {
    return { error: "OpenAI API 키가 없습니다. 설정에서 본인 키를 등록하거나 관리자에게 문의해주세요." };
  }
  if (!perplexityKey) {
    return { error: "Perplexity API 키가 없습니다. 설정에서 본인 키를 등록하거나 관리자에게 문의해주세요." };
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
      return { error: result.error };
    }

    const { error: insertError } = await supabase.from("real_estate_analyses").insert({
      user_id: user.id,
      listing_id: listingId,
      model,
      undervaluation_index: result.undervaluation_index ?? null,
      predicted_growth_pct: result.forecast_growth_rate ?? null,
      investment_score: result.attractiveness_score ?? null,
      rationale: result.rationale ?? null,
      raw_result: JSON.parse(JSON.stringify(result)),
    });

    if (insertError) {
      return { error: `분석 결과 저장에 실패했습니다: ${insertError.message}` };
    }

    await supabase
      .from("real_estate_user_matches")
      .update({ status: "analyzed" })
      .eq("user_id", user.id)
      .eq("listing_id", listingId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "AI 분석에 실패했습니다." };
  }

  revalidatePath(`/listings/${listingId}`);
  return { success: true };
}
