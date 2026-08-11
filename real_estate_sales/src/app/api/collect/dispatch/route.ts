import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildDedupKey,
  buildPnu,
  fetchApartAssessedPrice,
  fetchBuildingRegister,
  fetchSeoulRentComparables,
  fetchSeoulTrades,
} from "@/lib/publicdata/client";
import { sendTelegramMessage } from "@/lib/telegram/client";
import { ensureListingAnalysis } from "@/lib/actions/analysis";
import { currentKstHour, isCollectDue, isWithinActiveHours } from "@/lib/publicdata/schedule";

// 관심 지역(자치구)에 새 실거래가 매물이 올라오면 수집해서 real_estate_listings에 저장하고,
// 그 지역을 watch 중인 사용자마다 real_estate_user_matches를 만드는 배치 잡.
// threads/vercel.json의 CRON_SECRET Bearer 인증 패턴을 그대로 재사용.
// 이 프로젝트 전체가 vercel.json의 regions: ["icn1"]로 고정되어 있어 별도 프록시 없이
// 공공 API를 직접 호출한다 (Phase 0 스파이크로 검증됨).
//
// Vercel Pro 플랜이라 vercel.json에 5분 간격(*/5 * * * *) 자체 cron을 등록해뒀다
// (Hobby 플랜은 cron이 하루 1회로 제한되어 이 주기를 못 씀). 사용자가 대시보드에서
// 지역마다 고른 5분~24시간 단위 "실시간 모니터링" 주기와 시간대가 서로 다를 수 있으므로,
// cron은 5분마다 깨우기만 하고 실제 수집/분석/알림 처리 여부는 이 라우트 내부에서
// 사용자별 monitoring_enabled/collect_interval_minutes/active_hour_start/
// active_hour_end/last_run_at을 보고 다시 판단한다.
//
// 같은 지역을 여러 사용자가 서로 다른 주기로 watch할 수 있으므로, 외부 공공 API 호출은
// "이 지역을 원하는 가장 빠른 주기"(real_estate_district_collect_state.last_collected_at
// 기준)로만 실행하고, 그보다 느린 주기의 사용자는 이미 DB에 쌓인 데이터 중 본인에게
// 아직 안 보낸 것만 골라 알림을 받는다 (외부 API 재호출/재분석 없이 재사용).

const MAX_NEW_LISTINGS_PER_DISTRICT = 20; // 함수 실행 시간 제한을 고려한 회당 수집 상한
const MAX_MATCHES_PER_TICK = 20; // 사용자 한 명에게 한 틱에 몰아서 알림/분석하는 상한
const MATCH_CANDIDATE_WINDOW = 100; // "아직 못 받은 매물" 확인 시 뒤져볼 최근 매물 후보 수

function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

async function collectDistrict(
  supabase: ReturnType<typeof createAdminClient>,
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

    // 신규 매물 → 건축물대장/공시가격/전월세 3종을 병렬로 조회 (하나 실패해도 나머지는 반영).
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
      console.error("매물 저장 실패:", insertError.message);
      continue;
    }

    newCount += 1;
  }

  return { newCount };
}

// 이 사용자가 이 지역 매물 중 아직 매칭(real_estate_user_matches)되지 않은 것을 찾는다.
// 사용자의 전체 매칭 이력을 훑는 대신, 이 지역 최근 매물 후보만 먼저 좁혀서 그 안에서만
// 매칭 여부를 확인 — 매칭 이력이 아무리 쌓여도 쿼리 비용이 늘어나지 않도록 함.
async function findUnmatchedListingIds(
  supabase: ReturnType<typeof createAdminClient>,
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

  return candidateIds.filter((id) => !matchedSet.has(id)).slice(0, MAX_MATCHES_PER_TICK);
}

async function notifyUserForListings(
  supabase: ReturnType<typeof createAdminClient>,
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

async function dispatch() {
  const supabase = createAdminClient();
  const year = new Date().getFullYear();
  const now = new Date();
  const kstHour = currentKstHour(now);

  const { data: watchRows, error: watchError } = await supabase
    .from("real_estate_watch_districts")
    .select(
      "id, user_id, sgg_cd, sgg_nm, collect_interval_minutes, active_hour_start, active_hour_end, last_run_at",
    )
    .eq("is_active", true)
    .eq("monitoring_enabled", true);

  if (watchError) throw new Error(watchError.message);

  // 정지된 계정은 결제 여부와 무관하게 자동 수집/분석/텔레그램 발송 대상에서 제외한다.
  const candidateUserIds = Array.from(new Set((watchRows ?? []).map((w) => w.user_id)));
  const { data: suspendedProfiles } = await supabase
    .from("profiles")
    .select("id")
    .in("id", candidateUserIds.length > 0 ? candidateUserIds : [""])
    .eq("is_suspended", true);
  const suspendedUserIds = new Set((suspendedProfiles ?? []).map((p) => p.id));

  const allRows = (watchRows ?? []).filter((w) => !suspendedUserIds.has(w.user_id));

  const dueRows = allRows.filter(
    (w) =>
      isCollectDue(w.last_run_at, w.collect_interval_minutes, now) &&
      isWithinActiveHours(kstHour, w.active_hour_start, w.active_hour_end),
  );

  if (dueRows.length === 0) {
    return { processed: 0, summary: [] };
  }

  // 지역별 "이 지역을 원하는 사용자 중 가장 빠른 주기" — 그보다 최근에 이미 수집됐으면
  // 외부 API를 다시 부르지 않고 기존 DB 데이터를 그대로 재사용한다.
  const minIntervalByDistrict = new Map<string, number>();
  const sggNmByDistrict = new Map<string, string>();
  for (const row of allRows) {
    sggNmByDistrict.set(row.sgg_cd, row.sgg_nm);
    const cur = minIntervalByDistrict.get(row.sgg_cd);
    if (cur === undefined || row.collect_interval_minutes < cur) {
      minIntervalByDistrict.set(row.sgg_cd, row.collect_interval_minutes);
    }
  }

  const districtsNeeded = Array.from(new Set(dueRows.map((r) => r.sgg_cd)));

  const { data: collectStates } = await supabase
    .from("real_estate_district_collect_state")
    .select("sgg_cd, last_collected_at")
    .in("sgg_cd", districtsNeeded);
  const lastCollectedByDistrict = new Map(
    (collectStates ?? []).map((s) => [s.sgg_cd, s.last_collected_at]),
  );

  const summary: Array<{ sgg_nm: string; newListings: number; reused: boolean; error?: string }> =
    [];

  for (const sggCd of districtsNeeded) {
    const sggNm = sggNmByDistrict.get(sggCd) ?? sggCd;
    const minInterval = minIntervalByDistrict.get(sggCd) ?? 1440;
    const districtDue = isCollectDue(lastCollectedByDistrict.get(sggCd) ?? null, minInterval, now);

    if (!districtDue) {
      summary.push({ sgg_nm: sggNm, newListings: 0, reused: true });
      continue;
    }

    try {
      const result = await collectDistrict(supabase, sggCd, sggNm, year);
      summary.push({ sgg_nm: sggNm, newListings: result.newCount, reused: false });
      await supabase
        .from("real_estate_district_collect_state")
        .upsert({ sgg_cd: sggCd, last_collected_at: now.toISOString() }, { onConflict: "sgg_cd" });
    } catch (err) {
      console.error("district dispatch 실패:", err);
      summary.push({
        sgg_nm: sggNm,
        newListings: 0,
        reused: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 이번 틱에 새로 수집했든, 다른 사용자 덕분에 이미 쌓여있던 데이터를 재사용했든 상관없이,
  // 각 사용자에게는 본인이 아직 못 받은 "본인이 선택한 지역"의 매물만 골라서 보낸다.
  for (const row of dueRows) {
    await supabase
      .from("real_estate_watch_districts")
      .update({ last_run_at: now.toISOString() })
      .eq("id", row.id);

    const unmatchedIds = await findUnmatchedListingIds(supabase, row.user_id, row.sgg_cd);
    if (unmatchedIds.length === 0) continue;
    await notifyUserForListings(supabase, row.user_id, row.sgg_nm, unmatchedIds);
  }

  return { processed: dueRows.length, summary };
}

// 서울 열린데이터광장 응답은 필드가 문자열/숫자 어느 쪽으로도 올 수 있어 항상 String()으로 보정한다.
function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

// CTRT_DAY는 보통 "MMDD" 또는 "YYYYMMDD" 형태 — 서울 API 응답 형식에 맞춰 연도를 보정한다.
function normalizeDate(ctrtDay: unknown, year: number): string | null {
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

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await dispatch();
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await dispatch();
  return NextResponse.json({ ok: true, ...result });
}
