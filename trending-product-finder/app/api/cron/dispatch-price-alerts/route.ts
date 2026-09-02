import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentKstHour, isAlertDue, isWithinActiveHours } from "@/lib/schedule";
import { checkSavedProduct, type SavedProductRow } from "@/lib/priceAlert";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// Phase 14 — 관심 상품(찜) 가격/품절 변화 감지 dispatch. Phase 18의 dispatch-sourcing-alerts와
// 동일하게 5분마다 깨어나고, 저장된 상품마다 정해둔 주기(alert_interval_minutes)를 기준으로
// 재조회할 차례인지 다시 판단한다(real_estate_sales의 예약 조회 패턴 재사용).
function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

async function dispatch() {
  const admin = createAdminClient();
  const now = new Date();
  const kstHour = currentKstHour(now);

  const { data: rows, error } = await admin
    .from("sourcing_saved_products")
    .select(
      "id, user_id, keyword, platform, product_key, title, detail_url, last_price_krw, last_status, last_checked_at, alert_interval_minutes, alert_channels, alert_enabled, active_hour_start, active_hour_end",
    )
    .eq("alert_enabled", true);

  if (error) throw new Error(error.message);

  const dueRows = (rows ?? []).filter(
    (r) =>
      isAlertDue(r.last_checked_at, r.alert_interval_minutes, now) &&
      isWithinActiveHours(kstHour, r.active_hour_start, r.active_hour_end),
  );

  let changed = 0;
  let unchanged = 0;
  let failed = 0;
  const details: { id: string; result: string }[] = [];

  for (const row of dueRows) {
    try {
      const result = await checkSavedProduct(admin, row as SavedProductRow);
      if (!result.ok) {
        failed++;
        details.push({ id: row.id, result: `failed: ${result.error}` });
        await admin.from("sourcing_saved_products").update({ last_checked_at: now.toISOString() }).eq("id", row.id);
        continue;
      }

      if (result.current) {
        await admin
          .from("sourcing_saved_products")
          .update({
            last_price_krw: result.current.priceKrw,
            last_status: result.current.status,
            title: result.current.title,
            detail_url: result.current.detailUrl,
            last_checked_at: now.toISOString(),
          })
          .eq("id", row.id);
      }

      if (result.changed) {
        changed++;
        details.push({ id: row.id, result: "changed: notified" });
      } else {
        unchanged++;
        details.push({ id: row.id, result: "unchanged" });
      }
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : "unknown error";
      details.push({ id: row.id, result: `failed: ${message}` });
      console.error(`[trending-product-finder cron] price alert ${row.id} 실패:`, err);
    }
  }

  return { total: rows?.length ?? 0, due: dueRows.length, changed, unchanged, failed, details };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await dispatch();
  return NextResponse.json({ ok: true, ...result });
}
