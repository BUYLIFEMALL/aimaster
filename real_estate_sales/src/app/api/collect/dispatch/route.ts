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
// Vercel Hobby 플랜은 자체 cron을 하루 1회로 제한하기 때문에, 사용자가 대시보드에서
// 설정한 30분~24시간 단위 "실시간 모니터링" 주기를 실제로 구현하려면 외부 무료
// 스케줄러(cron-job.org 등)가 이 엔드포인트를 더 자주(예: 30분마다) 호출해줘야 한다.
// 실제 수집/분석/알림 빈도는 이 라우트 내부에서 사용자별 monitoring_enabled/
// collect_interval_minutes/active_hour_start/active_hour_end를 보고 다시 걸러낸다.

const MAX_NEW_LISTINGS_PER_DISTRICT = 20; // 함수 실행 시간 제한을 고려한 회당 처리 상한

function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

async function collectDistrict(
  supabase: ReturnType<typeof createAdminClient>,
  sggCd: string,
  sggNm: string,
  year: number,
): Promise<{ newListingIds: string[]; newCount: number; error?: string }> {
  const newListingIds: string[] = [];

  const trades = await fetchSeoulTrades({ sggCd, year, numOfRows: 200 });

  for (const row of trades) {
    if (newListingIds.length >= MAX_NEW_LISTINGS_PER_DISTRICT) break;

    const dedupKey = buildDedupKey(row);
    if (!row.CTRT_DAY || !row.BLDG_NM) continue;

    const { data: existing } = await supabase
      .from("real_estate_listings")
      .select("id")
      .eq("dedup_key", dedupKey)
      .maybeSingle();
    if (existing) continue;

    // 신규 매물 → 건축물대장/공시가격/전월세 순으로 보강 (하나 실패해도 나머지 저장은 진행)
    let exclusiveArea: number | null = null;
    let officialPrice: number | null = null;
    let prevDeposit: number | null = null;
    let prevRent: number | null = null;

    try {
      const items = await fetchBuildingRegister({
        sigunguCd: row.CGG_CD,
        bjdongCd: row.STDG_CD,
        bun: row.MNO,
        ji: row.SNO,
      });
      const area = items[0]?.area;
      if (area) exclusiveArea = Number(area);
    } catch (err) {
      console.error("건축물대장 조회 실패:", err);
    }

    try {
      const pnu = buildPnu(row);
      const priceFields = await fetchApartAssessedPrice({ pnu, stdrYear: year - 1 });
      if (priceFields[0]?.pblntfPc) officialPrice = Number(priceFields[0].pblntfPc);
    } catch (err) {
      console.error("VWorld 공시가격 조회 실패:", err);
    }

    try {
      const rents = await fetchSeoulRentComparables({
        sggCd,
        sggNm,
        stdgCd: row.STDG_CD,
        bldgNm: row.BLDG_NM,
        year,
      });
      const latest = rents[0];
      if (latest) {
        prevDeposit = Number(latest.GRFE) || null;
        prevRent = Number(latest.RTFE) || null;
      }
    } catch (err) {
      console.error("전월세 비교 조회 실패:", err);
    }

    const { data: inserted, error: insertError } = await supabase
      .from("real_estate_listings")
      .insert({
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
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      console.error("매물 저장 실패:", insertError?.message);
      continue;
    }

    newListingIds.push(inserted.id);
  }

  return { newListingIds, newCount: newListingIds.length };
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
      let message = `🏠 새 매물 발견\n\n${sggNm} ${listing.stdg_nm ?? "-"} ${listing.bldg_nm ?? "-"}\n전용 ${listing.exclusive_area ?? "-"}m² / ${listing.floor ?? "-"}층\n거래금액 ${priceEok}억`;

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

  const dueRows = (watchRows ?? []).filter(
    (w) =>
      isCollectDue(w.last_run_at, w.collect_interval_minutes, now) &&
      isWithinActiveHours(kstHour, w.active_hour_start, w.active_hour_end),
  );

  if (dueRows.length === 0) {
    return { processed: 0, summary: [] };
  }

  // 같은 지역을 여러 사용자가 서로 다른 주기로 watch할 수 있으므로,
  // 이번 틱에 실제로 수집이 필요한 지역은 한 번만 공공 API를 호출한다.
  const districtsToCollect = new Map<string, string>();
  for (const row of dueRows) {
    districtsToCollect.set(row.sgg_cd, row.sgg_nm);
  }

  const collectedByDistrict = new Map<string, { newListingIds: string[]; newCount: number }>();
  const summary: Array<{ sgg_nm: string; newListings: number; error?: string }> = [];

  for (const [sggCd, sggNm] of districtsToCollect) {
    try {
      const result = await collectDistrict(supabase, sggCd, sggNm, year);
      collectedByDistrict.set(sggCd, result);
      summary.push({ sgg_nm: sggNm, newListings: result.newCount });
    } catch (err) {
      collectedByDistrict.set(sggCd, { newListingIds: [], newCount: 0 });
      console.error("district dispatch 실패:", err);
      summary.push({
        sgg_nm: sggNm,
        newListings: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  for (const row of dueRows) {
    const collected = collectedByDistrict.get(row.sgg_cd);
    await supabase
      .from("real_estate_watch_districts")
      .update({ last_run_at: now.toISOString() })
      .eq("id", row.id);

    if (!collected || collected.newListingIds.length === 0) continue;
    await notifyUserForListings(supabase, row.user_id, row.sgg_nm, collected.newListingIds);
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
