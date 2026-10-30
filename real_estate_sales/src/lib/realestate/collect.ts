import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildDedupKey,
  buildPnu,
  fetchApartAssessedPrice,
  fetchMolitRents,
  fetchBuildingRegister,
  fetchLandPrice,
  fetchLandUsePlan,
  fetchSeoulRentComparables,
  fetchSeoulTrades,
  fetchMolitTrades,
  type PublicDataKeys,
} from "@/lib/publicdata/client";
import { isSeoulDistrict } from "@/lib/publicdata/districts";
import { normalizeDealTypes, normalizePropertyTypes, pickAssessedPrice, pickRentComparable, PROPERTY_TYPES, propertyTypeOf, rentToListing, seoulRentToComparables, type PropertyType, type RentComparable } from "@/lib/publicdata/molit";
import { sendTelegramMessage } from "@/lib/telegram/client";
import { sendAlimtalk } from "@/lib/solapi/client";
import { ensureListingAnalysis } from "@/lib/actions/analysis";
import { formatDealPrice } from "@/lib/format";

// 실거래 수집 → AI 분석 → 텔레그램 발송의 핵심 로직. cron 기반 예약 조회
// (api/collect/dispatch)와 사용자가 직접 누르는 수동 "지금 조회하기"
// (lib/actions/query.ts) 양쪽에서 동일하게 재사용한다.

export const MAX_NEW_LISTINGS_PER_DISTRICT = 20; // 함수 실행 시간 제한을 고려한 회당 수집 상한
export const MAX_MATCHES_PER_RUN = 20; // 사용자 한 명에게 한 번에 몰아서 알림/분석하는 상한
export const MATCH_CANDIDATE_WINDOW = 100; // "아직 못 받은 실거래" 확인 시 뒤져볼 최근 후보 수

type AdminClient = ReturnType<typeof createAdminClient>;

const MAX_NEW_RENTS_PER_DISTRICT = 20; // 전월세는 줄마다 외부 조회가 없어 시간 부담이 작다

/** 이미 저장된 중복 키. 키가 많으면 주소 길이 한도에 걸리므로 나눠서 묻는다 */
async function findExistingKeys(supabase: AdminClient, keys: string[]): Promise<Set<string>> {
  const found = new Set<string>();
  for (let i = 0; i < keys.length; i += 100) {
    const { data, error } = await supabase.from("real_estate_listings").select("dedup_key").in("dedup_key", keys.slice(i, i + 100));
    if (error) throw new Error(`중복 확인 실패: ${error.message}`);
    for (const row of data ?? []) found.add(row.dedup_key);
  }
  return found;
}

export async function collectDistrict(
  supabase: AdminClient,
  sggCd: string,
  sggNm: string,
  year: number,
  keys?: PublicDataKeys, // 회원 본인 공공데이터 키(없으면 운영자 공용 키)
): Promise<{ newCount: number }> {
  // RE-B4(2026-10-30): 서울은 서울 열린데이터, 경기·인천은 국토부 실거래 API(같은 줄 모양으로 바꿔 받음)
  const seoul = isSeoulDistrict(sggCd);
  const trades = seoul
    ? await fetchSeoulTrades({ sggCd, year, numOfRows: 200, keys })
    : await fetchMolitTrades({ sggCd, sggNm, numOfRows: 200, keys });
  // 세 유형(아파트·빌라·오피스텔)만 받는다. 상가·건물·토지는 별도 프로그램
  const validTrades = trades.filter((row) => row.CTRT_DAY && row.BLDG_NM && propertyTypeOf(row.BLDG_USG));

  // 최대 200건을 매번 한 건씩 존재 여부 조회하던 것을, 한 번의 IN 쿼리로 일괄 확인하도록 변경.
  const dedupKeys = validTrades.map((row) => buildDedupKey(row));
  const existingSet = await findExistingKeys(supabase, dedupKeys);

  let newCount = 0;
  const molitRents = new Map<PropertyType, Promise<RentComparable[]>>();
  const rentsOf = (type: PropertyType) => {
    let p = molitRents.get(type);
    if (!p) molitRents.set(type, (p = fetchMolitRents({ sggCd, type, keys })));
    return p;
  };

  for (let i = 0; i < validTrades.length; i++) {
    if (newCount >= MAX_NEW_LISTINGS_PER_DISTRICT) break;

    const row = validTrades[i];
    const dedupKey = dedupKeys[i];
    const propertyType = propertyTypeOf(row.BLDG_USG) as PropertyType;
    if (existingSet.has(dedupKey)) continue;

    // 신규 실거래 → 건축물대장/공시가격/전월세 3종을 병렬로 조회 (하나 실패해도 나머지는 반영).
    const [buildingResult, priceResult, rentResult] = await Promise.allSettled([
      fetchBuildingRegister({
        keys,
        sigunguCd: row.CGG_CD,
        bjdongCd: row.STDG_CD,
        bun: row.MNO,
        ji: row.SNO,
      }),
      // 오피스텔은 공동주택 공시가 대상이 아니다(서울 421줄 중 4줄만 값 있음, 2026-10-31)
      propertyType === "오피스텔" ? Promise.resolve([]) : fetchApartAssessedPrice({ pnu: buildPnu(row), stdrYear: year - 1, numOfRows: 1000, keys }),
      // 서울은 단지별 열린데이터, 경기·인천은 국토부 지역 자료(지역당 한 번만 받아 재사용)
      seoul ? fetchSeoulRentComparables({ sggCd, sggNm, stdgCd: row.STDG_CD, bldgNm: row.BLDG_NM, year, keys }).then(seoulRentToComparables) : rentsOf(propertyType),
    ]);

    let exclusiveArea: number | null = null;
    if (buildingResult.status === "fulfilled") {
      const area = buildingResult.value[0]?.area;
      if (area) exclusiveArea = Number(area);
    } else {
      console.error("건축물대장 조회 실패:", buildingResult.reason);
    }
    // RE-B4(2026-10-30 실물): 경기·인천은 건축물대장에서 전용면적을 못 찾는 경우가 많다 — 국토부 자료의 전용면적(ARCH_AREA ← excluUseAr)을 쓴다
    // 2026-10-31: 건축물대장 첫 줄은 다른 세대 면적일 수 있어(수정빌리지 28.53㎡, 신고 59.82㎡) 거래 신고 면적을 우선한다
    exclusiveArea = toNumberOrNull(row.ARCH_AREA) ?? exclusiveArea;

    let officialPrice: number | null = null;
    if (priceResult.status === "fulfilled") {
      officialPrice = pickAssessedPrice(priceResult.value, row.ARCH_AREA, row.FLR);
    } else {
      console.error("VWorld 공시가격 조회 실패:", priceResult.reason);
    }

    let prevDeposit: number | null = null;
    let prevRent: number | null = null;
    if (rentResult.status === "fulfilled") {
      const picked = pickRentComparable(rentResult.value, row.BLDG_NM, seoul ? "" : row.STDG_NM, row.ARCH_AREA);
      prevDeposit = picked?.deposit ?? null;
      prevRent = picked?.rent || null;
    } else {
      console.error("전월세 비교 조회 실패:", rentResult.reason);
    }

    const { error: insertError } = await supabase.from("real_estate_listings").insert({
      dedup_key: dedupKey,
      sgg_cd: sggCd,
      sgg_nm: sggNm,
      stdg_nm: row.STDG_NM,
      bldg_nm: row.BLDG_NM,
      property_type: propertyType,
      deal_type: "매매",
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

  // 전월세 거래: 서울 포함 전 지역 국토부 자료. 한 유형이 실패해도 나머지는 저장한다
  const rentBatches = await Promise.allSettled(
    PROPERTY_TYPES.map(async (type) => (await rentsOf(type)).map((x) => rentToListing(x, type, sggCd, sggNm))),
  );
  const rentRows = rentBatches
    .flatMap((b) => {
      if (b.status === "fulfilled") return b.value;
      console.error(`${sggNm} 전월세 조회 실패:`, b.reason);
      return [];
    })
    .sort((a, b) => String(b.contract_date).localeCompare(String(a.contract_date)))
    .slice(0, 300);
  const existingRents = await findExistingKeys(supabase, rentRows.map((x) => x.dedup_key));
  const seen = new Set<string>();
  const newRents = rentRows
    .filter((x) => !existingRents.has(x.dedup_key) && !seen.has(x.dedup_key) && seen.add(x.dedup_key))
    .slice(0, MAX_NEW_RENTS_PER_DISTRICT);
  if (newRents.length) {
    const { error } = await supabase.from("real_estate_listings").upsert(newRents, { onConflict: "dedup_key", ignoreDuplicates: true });
    if (error) console.error("전월세 저장 실패:", error.message);
    else newCount += newRents.length;
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
  const { data: pref } = await supabase
    .from("real_estate_user_preferences")
    .select("property_types, deal_types")
    .eq("user_id", userId)
    .maybeSingle();
  const types = normalizePropertyTypes(pref?.property_types);

  const deals = normalizeDealTypes(pref?.deal_types);

  let listingQuery = supabase.from("real_estate_listings").select("id, deal_type").eq("sgg_cd", sggCd).in("deal_type", deals);
  if (types.length < PROPERTY_TYPES.length) listingQuery = listingQuery.in("property_type", types);
  const { data: listings } = await listingQuery
    .order("collected_at", { ascending: false })
    .limit(MATCH_CANDIDATE_WINDOW);

  // 매매를 먼저: 건수가 많은 전월세가 상한을 다 채우지 않게 한다
  const candidateIds = [...(listings ?? [])].sort((a, b) => Number(a.deal_type !== "매매") - Number(b.deal_type !== "매매")).map((l) => l.id);
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

  const [{ data: telegramLink }, { data: solapiAccount }, { data: kakaoTemplate }, { data: profile }] = await Promise.all([
    supabase
      .from("user_telegram_links")
      .select("bot_token, chat_id")
      .eq("user_id", userId)
      .eq("program_slug", "real-estate-sales")
      .maybeSingle(),
    supabase
      .from("user_solapi_accounts")
      .select("api_key, api_secret, sender_phone, kakao_pf_id, rcs_brand_id")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("real_estate_kakao_templates").select("template_id").eq("user_id", userId).maybeSingle(),
    supabase.from("profiles").select("phone").eq("id", userId).maybeSingle(),
  ]);

  const hasTelegram = !!(telegramLink?.bot_token && telegramLink?.chat_id);
  const hasAlimtalk = !!(solapiAccount?.kakao_pf_id && kakaoTemplate?.template_id && profile?.phone);
  if (!hasTelegram && !hasAlimtalk) return;

  // 설정 행이 없으면 예전 동작(분석 포함)을 유지한다
  const { data: pref } = await supabase
    .from("real_estate_user_preferences")
    .select("auto_analyze_on_notify")
    .eq("user_id", userId)
    .maybeSingle();
  const autoAnalyze = pref?.auto_analyze_on_notify ?? true;

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
      const isSale = (listing.deal_type ?? "매매") === "매매";
      let message = isSale
        ? `🏠 새 실거래 발견\n\n${sggNm} ${listing.stdg_nm ?? "-"} ${listing.bldg_nm ?? "-"}\n전용 ${listing.exclusive_area ?? "-"}m² / ${listing.floor ?? "-"}층\n거래금액 ${priceEok}억`
        : `🏠 새 ${listing.deal_type} 거래 발견\n\n${sggNm} ${listing.stdg_nm ?? "-"} ${listing.bldg_nm ?? "-"}\n전용 ${listing.exclusive_area ?? "-"}m² / ${listing.floor ?? "-"}층\n${formatDealPrice(listing.deal_type, listing.price_amount, listing.monthly_rent)}`;

      // 텔레그램으로 알리기 전에, 이 사용자의 등록 키/선호 모델로 AI 투자 분석까지
      // 미리 돌려서 결과를 같이 전달한다 (이미 분석돼 있으면 재호출하지 않음).
      // 2026-10-17 v1.14: 회원이 설정에서 "알림에 AI 분석 포함"을 끄면 새로 분석하지 않고(유료 호출 없음), 이미 있는 결과만 붙인다.
      try {
        // 전월세는 AI 투자 분석 대상이 아니다(회원 키 요금 방지)
        if (autoAnalyze && isSale) await ensureListingAnalysis(supabase, userId, listingId);
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

      let sentAny = false;

      if (hasTelegram) {
        try {
          await sendTelegramMessage({
            botToken: telegramLink!.bot_token!,
            chatId: telegramLink!.chat_id!,
            text: message,
          });
          sentAny = true;
        } catch (err) {
          console.error(`텔레그램 알림 실패 (user ${userId}):`, err);
        }
      }

      if (hasAlimtalk) {
        try {
          await sendAlimtalk(solapiAccount!, profile!.phone!, {
            templateId: kakaoTemplate!.template_id!,
            variables: { 내용: message },
          });
          sentAny = true;
        } catch (err) {
          console.error(`카카오 알림톡 알림 실패 (user ${userId}):`, err);
        }
      }

      // 이미 분석까지 끝나 "analyzed"로 바뀌어 있을 수 있어, "new" 상태일 때만
      // "notified"로 올린다 (analyzed 상태를 덮어써서 되돌리지 않도록). 채널 중 하나라도
      // 성공했을 때만 notified로 표시한다(전부 실패하면 다음 회차에 다시 시도됨).
      if (sentAny) {
        await supabase
          .from("real_estate_user_matches")
          .update({ status: "notified" })
          .eq("user_id", userId)
          .eq("listing_id", listingId)
          .eq("status", "new");
      }
    } catch (err) {
      console.error(`실거래 알림 처리 실패 (user ${userId}):`, err);
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
export async function ensureLandInfo(pnu: string, keys?: PublicDataKeys): Promise<LandInfo | null> {
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
      fetchLandPrice({ pnu, stdrYear, keys }),
      fetchLandUsePlan({ pnu, keys }),
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
