import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateReportForWatchlist } from "@/lib/reportEngine";
import { currentKstHour, isAlertDue, isWithinActiveHours } from "@/lib/schedule";
import { runSourcingAlertForWatchlist } from "@/lib/sourcingAlert";
import { checkSavedProduct, type SavedProductRow } from "@/lib/priceAlert";
import { checkProgramAccess } from "@/lib/programAccess";
import type { Json } from "@/types/database.types";

// 정기 작업 3개(매일 리포트·예약 소싱 알림·관심 상품 가격 알림) — 운영자 Vercel 호출(/api/cron/*)과
// 회원 cron-job.org 호출(/api/cron/dispatch-member)이 같이 쓴다(v1.15, 2026-10-20). 지침: 루트 docs/SCHEDULER_POLICY.md
// 공통: 핸드폰 정책 → 이용 권한(사용기간) 확인 → 「마지막 실행 시각」을 먼저 바꾼 실행만 진행(조건부 update, 실행이 겹쳐도 한 번만).

/** 핸드폰 번호 필수 정책(2026-10-12): 번호가 없는 회원(관리자 제외)의 예약·자동 작업은 실행하지 않는다. 루트 lib/utils/phone.ts 와 같은 규칙. */
async function phoneRegisteredUserIds(client: unknown, userIds: string[]): Promise<Set<string>> {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (ids.length === 0) return new Set();
  const { data } = await (client as { from: (t: string) => any }).from("profiles").select("id, is_admin, phone").in("id", ids); // eslint-disable-line @typescript-eslint/no-explicit-any
  return new Set(
    ((data ?? []) as { id: string; is_admin: boolean | null; phone: string | null }[])
      .filter((p) => p.is_admin || /^01[016789]\d{7,8}$/.test(String(p.phone ?? "").replace(/[^0-9]/g, "")))
      .map((p) => p.id)
  );
}

/** 프로그램 이용 권한 — 회원별 1회 확인(사용기간이 끝난 회원의 켜 둔 작업은 돌리지 않는다. 리포트·알림이 회원 키 요금을 쓰므로). */
function accessChecker(admin: unknown) {
  const cache = new Map<string, boolean>();
  return async (userId: string) => {
    if (!cache.has(userId)) cache.set(userId, (await checkProgramAccess(admin as Parameters<typeof checkProgramAccess>[0], userId, "trending-product-finder")).allowed);
    return cache.get(userId)!;
  };
}

export interface DispatchOptions {
  /** 이 회원의 작업만(회원 cron-job.org 실행) */
  userId?: string;
  /** 운영자(Vercel) 실행에서 제외할 회원: cron-job.org를 고른 회원·일시정지 회원 */
  excludeUserIds?: string[];
  /** Vercel 방식이 꺼진 사이트면 운영자 실행은 아무것도 하지 않는다 */
  skipAll?: boolean;
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 오늘(한국 시각) 09:00을 UTC로 — 아직 09시 전이면 어제 09:00. 매일 리포트는 이 시각 이후 1번만 만든다(운영자 호출도 UTC 00:00 = KST 09:00). */
export function reportWindowStart(now: Date = new Date()): Date {
  const kst = new Date(now.getTime() + KST_OFFSET_MS);
  let start = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()); // KST 날짜의 00:00 UTC = KST 09:00
  if (now.getTime() < start) start -= 24 * 60 * 60 * 1000;
  return new Date(start);
}

/**
 * 활성 관심 목록 전체를 순회하며 리포트를 자동 생성한다. 회원 본인의 네이버/OpenAI/Gemini
 * 키로만 호출되므로(관리자 키 폴백 없음), 키를 등록하지 않은 회원은 자동으로 건너뛴다 —
 * 실패가 아니라 "정상적으로 대상이 아님"으로 취급한다. 같은 날(09시 기준) 두 번 만들지 않는다(v1.15).
 */
export async function dispatchDueReports(options: DispatchOptions = {}) {
  const admin = createAdminClient();
  const now = new Date();
  const windowStart = reportWindowStart(now);

  let query = admin
    .from("trend_watchlist")
    .select("id, user_id, category_name, naver_category_code, keywords, report_last_run_at")
    .eq("is_active", true);
  if (options.userId) query = query.eq("user_id", options.userId);
  if (options.excludeUserIds?.length) query = query.not("user_id", "in", `(${options.excludeUserIds.join(",")})`);
  const { data: watchlists, error } = await query;
  if (error) throw new Error(error.message);
  if (options.skipAll) return { total: 0, generated: 0, skipped: 0, failed: 0, details: [] };

  const dueRows = (watchlists ?? []).filter((w) => !w.report_last_run_at || new Date(w.report_last_run_at) < windowStart);

  let generated = 0;
  let skipped = 0;
  let failed = 0;
  const details: { watchlistId: string; result: string }[] = [];

  const phoneOkUsers = await phoneRegisteredUserIds(admin, dueRows.map((r) => r.user_id));
  const hasAccess = accessChecker(admin);
  for (const watchlist of dueRows.filter((r) => phoneOkUsers.has(r.user_id))) {
    if (!(await hasAccess(watchlist.user_id))) continue;
    // 중복 생성 방지: report_last_run_at을 먼저 바꾼 실행만 만든다(실패해도 그날은 다시 만들지 않음 — 예전처럼 하루 1번)
    let claim = admin.from("trend_watchlist").update({ report_last_run_at: now.toISOString() }).eq("id", watchlist.id);
    claim = watchlist.report_last_run_at ? claim.eq("report_last_run_at", watchlist.report_last_run_at) : claim.is("report_last_run_at", null);
    const { data: claimed } = await claim.select("id").maybeSingle();
    if (!claimed) continue;
    try {
      const result = await generateReportForWatchlist(admin, watchlist, { notify: true });
      if (result.ok) {
        generated++;
        details.push({ watchlistId: watchlist.id, result: "generated" });
      } else if (result.error === "네이버 API 키 미등록") {
        skipped++;
        details.push({ watchlistId: watchlist.id, result: "skipped: no naver key" });
      } else {
        failed++;
        details.push({ watchlistId: watchlist.id, result: `failed: ${result.error}` });
      }
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : "unknown error";
      details.push({ watchlistId: watchlist.id, result: `failed: ${message}` });
      console.error(`[trending-product-finder cron] watchlist ${watchlist.id} 실패:`, err);
    }
  }

  return { total: (watchlists ?? []).length, generated, skipped, failed, details };
}

/**
 * Phase 12 — 예약 소싱 알림. 관심 키워드마다 회원이 정한 주기(1/3/6/12/24시간)와 동작 시간대를 보고
 * 보낼 차례인지 판단한다(real_estate_sales의 예약 조회 패턴). v1.15: 보내기 전에 마지막 실행 시각을 먼저 차지한다.
 */
export async function dispatchDueSourcingAlerts(options: DispatchOptions = {}) {
  const admin = createAdminClient();
  const now = new Date();
  const kstHour = currentKstHour(now);

  let query = admin
    .from("trend_watchlist")
    .select(
      "id, user_id, category_name, keywords, sourcing_alert_channels, sourcing_alert_interval_minutes, sourcing_alert_last_run_at, sourcing_alert_active_hour_start, sourcing_alert_active_hour_end, sourcing_alert_notify_mode, sourcing_alert_last_snapshot",
    )
    .eq("is_active", true)
    .eq("sourcing_alert_enabled", true);
  if (options.userId) query = query.eq("user_id", options.userId);
  if (options.excludeUserIds?.length) query = query.not("user_id", "in", `(${options.excludeUserIds.join(",")})`);
  const { data: rows, error } = await query;
  if (error) throw new Error(error.message);
  if (options.skipAll) return { total: 0, due: 0, sent: 0, failed: 0, details: [] };

  const dueRows = (rows ?? []).filter(
    (r) =>
      r.sourcing_alert_interval_minutes != null &&
      isAlertDue(r.sourcing_alert_last_run_at, r.sourcing_alert_interval_minutes, now) &&
      isWithinActiveHours(kstHour, r.sourcing_alert_active_hour_start, r.sourcing_alert_active_hour_end),
  );

  let sent = 0;
  let failed = 0;
  const details: { watchlistId: string; result: string }[] = [];

  const phoneOkUsers = await phoneRegisteredUserIds(admin, dueRows.map((r) => r.user_id));
  const hasAccess = accessChecker(admin);
  for (const row of dueRows.filter((r) => phoneOkUsers.has(r.user_id))) {
    if (!(await hasAccess(row.user_id))) continue;
    let claim = admin.from("trend_watchlist").update({ sourcing_alert_last_run_at: now.toISOString() }).eq("id", row.id);
    claim = row.sourcing_alert_last_run_at ? claim.eq("sourcing_alert_last_run_at", row.sourcing_alert_last_run_at) : claim.is("sourcing_alert_last_run_at", null);
    const { data: claimed } = await claim.select("id").maybeSingle();
    if (!claimed) continue;
    try {
      const result = await runSourcingAlertForWatchlist(admin, row);
      if (result.snapshot !== undefined) {
        await admin.from("trend_watchlist").update({ sourcing_alert_last_snapshot: result.snapshot as unknown as Json }).eq("id", row.id);
      }
      if (result.ok) {
        sent++;
        details.push({ watchlistId: row.id, result: result.notified ? "sent" : "no change" });
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

/**
 * Phase 14 — 관심 상품(찜) 가격/품절 변화 감지. 상품마다 정해둔 주기(alert_interval_minutes)와 동작 시간대로
 * 재조회할 차례인지 판단한다. v1.15: 재조회 전에 last_checked_at을 먼저 차지한다.
 */
export async function dispatchDuePriceAlerts(options: DispatchOptions = {}) {
  const admin = createAdminClient();
  const now = new Date();
  const kstHour = currentKstHour(now);

  let query = admin
    .from("sourcing_saved_products")
    .select(
      "id, user_id, keyword, platform, product_key, title, detail_url, last_price_krw, last_status, last_checked_at, alert_interval_minutes, alert_channels, alert_enabled, active_hour_start, active_hour_end",
    )
    .eq("alert_enabled", true);
  if (options.userId) query = query.eq("user_id", options.userId);
  if (options.excludeUserIds?.length) query = query.not("user_id", "in", `(${options.excludeUserIds.join(",")})`);
  const { data: rows, error } = await query;
  if (error) throw new Error(error.message);
  if (options.skipAll) return { total: 0, due: 0, changed: 0, unchanged: 0, failed: 0, details: [] };

  const dueRows = (rows ?? []).filter(
    (r) =>
      isAlertDue(r.last_checked_at, r.alert_interval_minutes, now) &&
      isWithinActiveHours(kstHour, r.active_hour_start, r.active_hour_end),
  );

  let changed = 0;
  let unchanged = 0;
  let failed = 0;
  const details: { id: string; result: string }[] = [];

  const phoneOkUsers = await phoneRegisteredUserIds(admin, dueRows.map((r) => r.user_id));
  const hasAccess = accessChecker(admin);
  for (const row of dueRows.filter((r) => phoneOkUsers.has(r.user_id))) {
    if (!(await hasAccess(row.user_id))) continue;
    let claim = admin.from("sourcing_saved_products").update({ last_checked_at: now.toISOString() }).eq("id", row.id);
    claim = row.last_checked_at ? claim.eq("last_checked_at", row.last_checked_at) : claim.is("last_checked_at", null);
    const { data: claimed } = await claim.select("id").maybeSingle();
    if (!claimed) continue;
    try {
      const result = await checkSavedProduct(admin, row as SavedProductRow);
      if (!result.ok) {
        failed++;
        details.push({ id: row.id, result: `failed: ${result.error}` });
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
