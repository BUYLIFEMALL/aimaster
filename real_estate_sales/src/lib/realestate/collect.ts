import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildDedupKey,
  buildPnu,
  fetchApartAssessedPrice,
  fetchBuildingRegister,
  fetchLandPrice,
  fetchLandUsePlan,
  fetchSeoulRentComparables,
  fetchSeoulTrades,
} from "@/lib/publicdata/client";
import { sendTelegramMessage } from "@/lib/telegram/client";
import { ensureListingAnalysis } from "@/lib/actions/analysis";

// 실거래 수집 → AI 분석 → 텔레그램 발송의 핵심 로직. cron 기반 예약 조회
// (api/collect/dispatch)와 사용자가 직접 누르는 수동 "지금 조회하기"
// (lib/actions/query.ts) 양쪽에서 동일하게 재사용한다.

export const MAX_NEW_LISTINGS_PER_DISTRICT = 20; // 함수 실행 시간 제한을 고려한 회당 수집 상한
export const MAX_MATCHES_PER_RUN = 20; // 사용자 한 명에게 한 번에 몰아서 알림/분석하는 상한
export const MATCH_CANDIDATE_WINDOW = 100; // "아직 못 받은 실거래" 확인 시 뒤져볼 최근 후보 수

type AdminClient = ReturnType<typeof createAdminClient>;

export async function collectDistrict(
  supabase: AdminClient,
  sggCd: string,
  sggNm: string,
  year: number,
): Promise<{ newCount: number }> {
  const trades = await fetchSeoulTrades({ sggCd, year, numOfRows: 200 });
  const validTrades = trades.filter((row) => row.CTRT_DAY && row.BLDG_NM);

  // 최대 200건을 매번 한 건씩 존재 여부 조회하던 것을, 한 번의 IN 쿼리로 일괄 확인하도록 변경.
  const dedupKeys = validTrades.map((row) => buildDedupKey(row));
  const existingSet = new Set<string>();
  if (dedupKeys.length > 0) {
    const { data: existingRows } = await supabase
      .from("real_estate_listings")
      .select("dedup_key")
      .in("dedup_key", dedupKeys);
    for (const r of existingRows ?? []) existingSet.add(r.dedup_key);
  }

  let newCount = 0;

  for (let i = 0; i < validTrades.length; i++) {
    if (newCount >= MAX_NEW_LISTINGS_PER_DISTRICT) break;

    const row = validTrades[i];
    const dedupKey = dedupKeys[i];
    if (existingSet.has(dedupKey)) continue;

    // 신규 실거래 → 건축물대장/공시가격/전월세 3종을 병렬로 조회 (하나 실패해도 나머지는 반영).
    const [buildingResult, priceResult, rentResult] = await Promise.allSettled([
      fetchBuildingRegister({
        sigunguCd: row.CGG_CD,
        bjdongCd: row.STDG_CD,
        bun: row.MNO,
        ji: row.SNO,
      }),
      fetchApartAssessedPrice({ pnu: buildPnu(row), stdrYear: year - 1 }),
      fetchSeoulRentComparables({ sggCd, sggNm, stdgCd: row.STDG_CD, bldgNm: row.BLDG_NM, year }),
    ]);

    let exclusiveArea: number | null = null;
    if (buildingResult.status === "fulfilled") {
      const area = buildingResult.value[0]?.area;
      if (area) exclusiveArea = Number(area);
    } else {
      console.error("건축물대장 조회 실패:", buildingResult.reason);
    }

    let officialPrice: number | null = null;
    if (priceResult.status === "fulfilled") {
      if (priceResult.value[0]?.pblntfPc) officialPrice = Number(priceResult.value[0].pblntfPc);
    } else {
      console.error("VWorld 공시가격 조회 실패:", priceResult.reason);
    }

    let prevDeposit: number | null = null;
    let prevRent: number | null = null;
    if (rentResult.status === "fulfilled") {
      const latest = rentResult.value[0];
      if (latest) {
        prevDeposit = Number(latest.GRFE) || null;
        prevRent = Number(latest.RTFE) || null;
      }
    } else {
      console.error("전월세 비교 조회 실패:", rentResult.reason);
    }

    const { error: insertError } = await supabase.from("real_estate_listings").insert({
      dedup_key: dedupKey,
      sgg_cd: sggCd,
      sgg_nm: sggNm,
      stdg_nm: row.STDG_NM,
      bldg_nm: row.BLDG_NM,
      floor: row.FLR,
      contract_date: normalizeDate(row.CTRT_DAY, year),
      building_area: toNumberOrNull(row.ARCH_AREA),
      exclusive_area: exclusiveArea,
      price_amount: toNumberOrNull(row.THING_AMT),
      official_price: officialPrice,
      building_year: toNumberOrNull(row.ARCH_YR),
      prev_deposit: prevDeposit,
      prev_rent: prevRent,
      pnu: buildPnu(row),
      raw_data: row,
      data_provided_at: new Date().toISOString().slice(0, 10),
    });

    if (insertError) {
      console.error("실거래 저장 실패:", insertError.message);
      continue;
    }

    newCount += 1;
  }

  return { newCount };
}

// 이 사용자가 이 지역 실거래 중 아직 매칭(real_estate_user_matches)되지 않은 것을 찾는다.
// 사용자의 전체 매칭 이력을 훑는 대신, 이 지역 최근 실거래 후보만 먼저 좁혀서 그 안에서만
// 매칭 여부를 확인 — 매칭 이력이 아무리 쌓여도 쿼리 비용이 늘어나지 않도록 함.
export async function findUnmatchedListingIds(
  supabase: AdminClient,
  userId: string,
  sggCd: string,
): Promise<string[]> {
  const { data: listings } = await supabase
    .from("real_estate_listings")
    .select("id")
    .eq("sgg_cd", sggCd)
    .order("collected_at", { ascending: false })
    .limit(MATCH_CANDIDATE_WINDOW);

  const candidateIds = (listings ?? []).map((l) => l.id);
  if (candidateIds.length === 0) return [];

  const { data: matched } = await supabase
    .from("real_estate_user_matches")
    .select("listing_id")
    .eq("user_id", userId)
    .in("listing_id", candidateIds);
  const matchedSet = new Set((matched ?? []).map((m) => m.listing_id));

  return candidateIds.filter((id) => !matchedSet.has(id)).slice(0, MAX_MATCHES_PER_RUN);
}

export async function notifyUserForListings(
  supabase: AdminClient,
  userId: string,
  sggNm: string,
  listingIds: string[],
) {
  if (listingIds.length === 0) return;

  const matchRows = listingIds.map((listingId) => ({
    user_id: userId,
    listing_id: listingId,
    status: "new" as const,
  }));
  await supabase.from("real_estate_user_matches").upsert(matchRows, {
    onConflict: "user_id,listing_id",
    ignoreDuplicates: true,
  });

  const { data: telegramLink } = await supabase
    .from("user_telegram_links")
    .select("bot_token, chat_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!telegramLink?.bot_token || !telegramLink?.chat_id) return;

  for (const listingId of listingIds) {
    try {
      const { data: listing } = await supabase
        .from("real_estate_listings")
        .select("*")
        .eq("id", listingId)
        .maybeSingle();
      if (!listing) continue;

      const priceEok = listing.price_amount
        ? (listing.price_amount / 10000).toFixed(1)
        : "-";
      let message = `🏠 새 실거래 발견\n\n${sggNm} ${listing.stdg_nm ?? "-"} ${listing.bldg_nm ?? "-"}\n전용 ${listing.exclusive_area ?? "-"}m² / ${listing.floor ?? "-"}층\n거래금액 ${priceEok}억`;

      // 텔레그램으로 알리기 전에, 이 사용자의 등록 키/선호 모델로 AI 투자 분석까지
      // 미리 돌려서 결과를 같이 전달한다 (이미 분석돼 있으면 재호출하지 않음).
      try {
        await ensureListingAnalysis(supabase, userId, listingId);
        const { data: analysis } = await supabase
          .from("real_estate_analyses")
          .select("investment_score, undervaluation_index, predicted_growth_pct, rationale")
          .eq("user_id", userId)
          .eq("listing_id", listingId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (analysis) {
          message += `\n\n🤖 AI 투자 분석\n투자 매력도 ${analysis.investment_score ?? "-"}점 · 저평가지수 ${analysis.undervaluation_index ?? "-"} · 1년 상승예측률 ${analysis.predicted_growth_pct ?? "-"}%`;
          if (analysis.rationale) message += `\n${analysis.rationale}`;
        }
      } catch (err) {
        console.error(`AI 분석 실패 (user ${userId}):`, err);
      }

      await sendTelegramMessage({
        botToken: telegramLink.bot_token,
        chatId: telegramLink.chat_id,
        text: message,
      });
      // 이미 분석까지 끝나 "analyzed"로 바뀌어 있을 수 있어, "new" 상태일 때만
      // "notified"로 올린다 (analyzed 상태를 덮어써서 되돌리지 않도록).
      await supabase
        .from("real_estate_user_matches")
        .update({ status: "notified" })
        .eq("user_id", userId)
        .eq("listing_id", listingId)
        .eq("status", "new");
    } catch (err) {
      console.error(`텔레그램 알림 실패 (user ${userId}):`, err);
    }
  }
}

export interface LandInfo {
  pnu: string;
  pricePerM2: number | null;
  priceStdrYear: string | null;
  useZones: string | null;
}

// 매물이 깔고 앉은 PNU 기준으로 개별공시지가·용도지역/지구를 조회해서 캐싱한다.
// 공시지가는 연 1회만 갱신되므로, 이미 캐싱돼 있으면 재호출하지 않는다(같은 단지 여러
// 매물이 같은 PNU를 공유하는 경우가 많아 비용 절감 효과가 큼). 재건축/토지가치 관점의
// AI 투자분석(analyzeListing)에 이 값을 함께 넘겨준다.
export async function ensureLandInfo(pnu: string): Promise<LandInfo | null> {
  if (!pnu) return null;
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("real_estate_land_info")
    .select("pnu, price_per_m2, price_stdr_year, use_zones")
    .eq("pnu", pnu)
    .maybeSingle();

  if (existing) {
    return {
      pnu: existing.pnu,
      pricePerM2: existing.price_per_m2,
      priceStdrYear: existing.price_stdr_year,
      useZones: existing.use_zones,
    };
  }

  try {
    const stdrYear = new Date().getFullYear() - 1; // 아파트 공시가격 조회와 동일한 관례(전년도 기준)
    const [priceRows, useRows] = await Promise.all([
      fetchLandPrice({ pnu, stdrYear }),
      fetchLandUsePlan({ pnu }),
    ]);

    const latestPrice = [...priceRows].sort((a, b) =>
      (b.lastUpdtDt ?? "").localeCompare(a.lastUpdtDt ?? ""),
    )[0];
    const pricePerM2 = latestPrice?.pblntfPclnd ? Number(latestPrice.pblntfPclnd) : null;
    const priceStdrYear = latestPrice?.stdrYear ?? null;
    const useZones =
      useRows.length > 0
        ? Array.from(new Set(useRows.map((r) => r.prposAreaDstrcCodeNm).filter(Boolean))).join(
            ", ",
          )
        : null;

    await admin.from("real_estate_land_info").upsert(
      {
        pnu,
        price_per_m2: Number.isFinite(pricePerM2) ? pricePerM2 : null,
        price_stdr_year: priceStdrYear,
        use_zones: useZones,
        raw_price_data: priceRows,
        raw_use_data: useRows,
      },
      { onConflict: "pnu" },
    );

    return { pnu, pricePerM2, priceStdrYear, useZones };
  } catch (err) {
    console.error(`토지 정보 조회 실패 (pnu ${pnu}):`, err);
    return null;
  }
}

// 서울 열린데이터광장 응답은 필드가 문자열/숫자 어느 쪽으로도 올 수 있어 항상 String()으로 보정한다.
export function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

// CTRT_DAY는 보통 "MMDD" 또는 "YYYYMMDD" 형태 — 서울 API 응답 형식에 맞춰 연도를 보정한다.
export function normalizeDate(ctrtDay: unknown, year: number): string | null {
  if (!ctrtDay) return null;
  const digits = String(ctrtDay).replace(/\D/g, "");
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }
  if (digits.length === 4) {
    return `${year}-${digits.slice(0, 2)}-${digits.slice(2, 4)}`;
  }
  return null;
}
