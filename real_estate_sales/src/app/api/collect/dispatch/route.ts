import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentKstHour, isCollectDue, isWithinActiveHours } from "@/lib/publicdata/schedule";
import { collectDistrict, findUnmatchedListingIds, notifyUserForListings } from "@/lib/realestate/collect";

// 관심 지역(자치구)에 새 실거래가 신고되면 수집해서 real_estate_listings에 저장하고,
// 그 지역을 watch 중인 사용자마다 real_estate_user_matches를 만드는 "예약 조회" 배치 잡.
// threads/vercel.json의 CRON_SECRET Bearer 인증 패턴을 그대로 재사용.
// 이 프로젝트 전체가 vercel.json의 regions: ["icn1"]로 고정되어 있어 별도 프록시 없이
// 공공 API를 직접 호출한다 (Phase 0 스파이크로 검증됨).
//
// 기본 조회 방식은 사용자가 직접 누르는 수동 "지금 조회하기"(lib/actions/query.ts)이고,
// 이 cron은 그와 별개로 사용자가 "예약 조회"를 켜둔 지역만 대상으로 하는 선택적 기능이다.
//
// Vercel Pro 플랜이라 vercel.json에 5분 간격(*/5 * * * *) 자체 cron을 등록해뒀다
// (Hobby 플랜은 cron이 하루 1회로 제한되어 이 주기를 못 씀). 사용자가 지역마다 고른
// 5분~24시간 단위 "예약 조회" 주기와 시간대가 서로 다를 수 있으므로, cron은 5분마다
// 깨우기만 하고 실제 수집/분석/알림 처리 여부는 이 라우트 내부에서 사용자별
// monitoring_enabled/collect_interval_minutes/active_hour_start/active_hour_end/
// last_run_at을 보고 다시 판단한다.
//
// 같은 지역을 여러 사용자가 서로 다른 주기로 watch할 수 있으므로, 외부 공공 API 호출은
// "이 지역을 원하는 가장 빠른 주기"(real_estate_district_collect_state.last_collected_at
// 기준)로만 실행하고, 그보다 느린 주기의 사용자는 이미 DB에 쌓인 데이터 중 본인에게
// 아직 안 보낸 것만 골라 알림을 받는다 (외부 API 재호출/재분석 없이 재사용). 수동
// "지금 조회하기"로 이미 최근에 수집된 지역도 이 재사용 로직 덕분에 중복 호출되지 않는다.

function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
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
  // 각 사용자에게는 본인이 아직 못 받은 "본인이 선택한 지역"의 실거래만 골라서 보낸다.
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
