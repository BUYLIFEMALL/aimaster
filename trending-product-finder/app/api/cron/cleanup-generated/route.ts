import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { retentionCutoff, RETENTION_DAYS } from "@/lib/retention";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// 기존 Cron과 같은 CRON_SECRET Bearer 인증. vercel.json에 매일 1회(UTC 18:50 = 한국 03:50) 등록.
function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
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
  const cutoff = retentionCutoff();
  const result: Record<string, number | string> = { cutoff, retentionDays: RETENTION_DAYS };
  const errors: string[] = [];

  const targets: { table: "recommendation_reports" | "trend_snapshots" | "shopping_competition"; column: string }[] = [
    { table: "recommendation_reports", column: "generated_at" },
    { table: "trend_snapshots", column: "fetched_at" },
    { table: "shopping_competition", column: "fetched_at" },
  ];
  for (const t of targets) {
    const { count, error } = await admin.from(t.table).delete({ count: "exact" }).lt(t.column, cutoff);
    if (error) errors.push(`${t.table}: ${error.message}`);
    else result[t.table] = count ?? 0;
  }

  const { count: cleared, error: snapError } = await admin
    .from("trend_watchlist")
    .update({ sourcing_alert_last_snapshot: null }, { count: "exact" })
    .lt("sourcing_alert_last_run_at", cutoff)
    .not("sourcing_alert_last_snapshot", "is", null);
  if (snapError) errors.push(`trend_watchlist.sourcing_alert_last_snapshot: ${snapError.message}`);
  else result.alertSnapshotsCleared = cleared ?? 0;

  console.log("[cleanup-generated]", JSON.stringify(result), errors.length ? `errors=${errors.length}` : "");
  if (errors.length) return NextResponse.json({ ...result, errors }, { status: 500 });
  return NextResponse.json(result);
}
