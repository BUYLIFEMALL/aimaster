import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { retentionCutoff, RETENTION_DAYS } from "@/lib/retention";
import { resultCutoff } from "@/lib/coupangResults";
import { addCleanupCount, logCleanupUsage, type CleanupCounts } from "@/lib/cleanupUsageLog"; // 공용 기준 코드 cleanup-usage-log 사본(30일 정리 기록)
import { retentionExemptFilter } from "@/lib/retentionExempt"; // 30일 삭제 예외 회원(2026-11-03)

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// 기존 Cron과 같은 CRON_SECRET Bearer 인증. vercel.json에 매일 1회(UTC 18:50 = 한국 03:50) 등록.
function isAuthorized(request: NextRequest): boolean {
  // CRON_SECRET이 비어 있으면 「Bearer undefined」로 통과되던 빈틈을 막는다(v1.15).
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * v1.13 생성 자료 30일 자동 정리(2026-10-17 주인님 승인).
 * - 삭제: recommendation_reports(generated_at), trend_snapshots·shopping_competition(fetched_at) 중 30일 지난 행
 * - 값만 비움: trend_watchlist.sourcing_alert_last_snapshot(마지막 알림 실행이 30일 넘은 경우) — 행·알림 설정은 유지
 * - 지우지 않음: 관심 키워드·알림 설정, ⭐ 관심 상품(sourcing_saved_products), 계정·키·연동
 * 로그·응답에는 표별 처리 개수만 남긴다(회원 자료 내용 없음).
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const exemptFilter = await retentionExemptFilter(admin); // 예외 회원(관리자·시험 계정)은 지우지 않는다. 못 읽으면 오류로 멈춤
  const cutoff = retentionCutoff();
  const result: Record<string, number | string> = { cutoff, retentionDays: RETENTION_DAYS };
  const errors: string[] = [];

  const targets: { table: "recommendation_reports" | "trend_snapshots" | "shopping_competition"; column: string }[] = [
    { table: "recommendation_reports", column: "generated_at" },
    { table: "trend_snapshots", column: "fetched_at" },
    { table: "shopping_competition", column: "fetched_at" },
  ];
  const counts: CleanupCounts = new Map();
  const KEY = { recommendation_reports: "reports", trend_snapshots: "snapshots", shopping_competition: "competition" } as const;
  for (const t of targets) {
    // 지운 행의 user_id를 받아 회원별로 센다(30일 정리 기록)
    const { data, error } = await admin.from(t.table).delete().lt(t.column, cutoff).not("user_id", "in", exemptFilter).select("user_id");
    if (error) errors.push(`${t.table}: ${error.message}`);
    else {
      result[t.table] = data?.length ?? 0;
      for (const r of (data ?? []) as { user_id: string }[]) addCleanupCount(counts, r.user_id, KEY[t.table]);
    }
  }
  // 쿠팡 리뷰 거르기 기록은 주인님 지정으로 1년 보관한다(결과 행은 cascade로 함께 지워진다).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: oldRuns, error: runError } = await (admin as unknown as { from: (table: string) => any }).from("coupang_review_runs").delete().lt("created_at", resultCutoff()).not("user_id", "in", exemptFilter).select("user_id");
  if (runError) errors.push(`coupang_review_runs: ${runError.message}`);
  else {
    result.coupang_review_runs = oldRuns?.length ?? 0;
    for (const r of (oldRuns ?? []) as { user_id: string }[]) addCleanupCount(counts, r.user_id, "coupangReviewRuns");
  }
  result.loggedOwners = await logCleanupUsage(admin, "trending-product-finder", counts);

  const { count: cleared, error: snapError } = await admin
    .from("trend_watchlist")
    .update({ sourcing_alert_last_snapshot: null }, { count: "exact" })
    .lt("sourcing_alert_last_run_at", cutoff).not("user_id", "in", exemptFilter)
    .not("sourcing_alert_last_snapshot", "is", null);
  if (snapError) errors.push(`trend_watchlist.sourcing_alert_last_snapshot: ${snapError.message}`);
  else result.alertSnapshotsCleared = cleared ?? 0;

  console.log("[cleanup-generated]", JSON.stringify(result), errors.length ? `errors=${errors.length}` : "");
  if (errors.length) return NextResponse.json({ ...result, errors }, { status: 500 });
  return NextResponse.json(result);
}
