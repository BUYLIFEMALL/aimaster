import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAlertDue } from "@/lib/schedule";
import { runSourcingAlertForWatchlist } from "@/lib/sourcingAlert";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// Phase 12 — 예약 소싱 알림 dispatch. 관심 키워드마다 회원이 정한 주기(1/3/6/12/24시간)와
// 채널이 다를 수 있어, Vercel Cron은 5분마다 깨우기만 하고(vercel.json) 실제로 보낼
// 차례인지는 이 라우트에서 sourcing_alert_last_run_at 기준으로 다시 판단한다
// (real_estate_sales/src/app/api/collect/dispatch/route.ts와 동일 패턴).
function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

async function dispatch() {
  const admin = createAdminClient();
  const now = new Date();

  const { data: rows, error } = await admin
    .from("trend_watchlist")
    .select("id, user_id, category_name, keywords, sourcing_alert_channels, sourcing_alert_interval_minutes, sourcing_alert_last_run_at")
    .eq("is_active", true)
    .eq("sourcing_alert_enabled", true);

  if (error) throw new Error(error.message);

  const dueRows = (rows ?? []).filter(
    (r) => r.sourcing_alert_interval_minutes != null && isAlertDue(r.sourcing_alert_last_run_at, r.sourcing_alert_interval_minutes, now),
  );

  let sent = 0;
  let failed = 0;
  const details: { watchlistId: string; result: string }[] = [];

  for (const row of dueRows) {
    try {
      const result = await runSourcingAlertForWatchlist(admin, row);
      await admin.from("trend_watchlist").update({ sourcing_alert_last_run_at: now.toISOString() }).eq("id", row.id);
      if (result.ok) {
        sent++;
        details.push({ watchlistId: row.id, result: "sent" });
      } else {
        failed++;
        details.push({ watchlistId: row.id, result: `skipped: ${result.error}` });
      }
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : "unknown error";
      details.push({ watchlistId: row.id, result: `failed: ${message}` });
      console.error(`[trending-product-finder cron] sourcing alert ${row.id} 실패:`, err);
    }
  }

  return { total: rows?.length ?? 0, due: dueRows.length, sent, failed, details };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await dispatch();
  return NextResponse.json({ ok: true, ...result });
}
