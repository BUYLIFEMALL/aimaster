import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendScheduledDelayEmail } from "@/lib/email/sender";
import { scheduledDelayEmail } from "@/lib/email/templates";
import { countDelays, summarizeDelays } from "@/lib/scheduledDelay";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * 예약 게시 지연 점검 Cron 엔드포인트 (2026-10-18)
 * GET /api/email/cron/scheduled-delay-check
 *
 * Vercel Cron이 10분마다 호출(Authorization: Bearer CRON_SECRET 자동 첨부, ?secret= 도 허용).
 * 예약 시각이 10분 넘게 지났는데 '예약' 상태인 글이 있으면 관리자에게 건수만 메일로 알린다.
 * ?preview=1 이면 메일을 보내지 않고 점검 결과와 메일 제목만 돌려준다(시험용).
 * 플랜: docs/PLAN_20261018_SCHEDULED_DISPATCH_MONITOR.md
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const bearer = req.headers.get("authorization");
  const query = req.nextUrl.searchParams.get("secret");
  if (!secret || (bearer !== `Bearer ${secret}` && query !== secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const counts = await countDelays(createServiceClient() as unknown as Parameters<typeof countDelays>[0], now);
  const summary = summarizeDelays(counts, now);
  if (summary.failed.length) {
    console.error("[Cron] 예약 지연 점검 조회 실패:", summary.failed.map((f) => `${f.slug}: ${f.error}`).join(" / "));
  }

  const data = {
    items: summary.delayed.map((d) => ({ program: d.program, count: d.count ?? 0, oldest: d.oldest })),
    thresholdMinutes: summary.thresholdMinutes,
    checkedAt: summary.checkedAt,
  };

  if (req.nextUrl.searchParams.get("preview") === "1") {
    return NextResponse.json({ preview: true, summary, subject: scheduledDelayEmail(data).subject });
  }

  if (summary.totalDelayed === 0) {
    return NextResponse.json({ sent: false, totalDelayed: 0, failed: summary.failed.length });
  }

  const adminEmail = process.env.SUPPORT_ADMIN_EMAIL || process.env.SMTP_USER || "";
  if (!adminEmail) {
    console.error("[Cron] 예약 지연 감지했지만 관리자 메일(SUPPORT_ADMIN_EMAIL) 미설정");
    return NextResponse.json({ sent: false, totalDelayed: summary.totalDelayed, error: "admin email not set" });
  }

  const sent = await sendScheduledDelayEmail(adminEmail, data);
  console.warn(`[Cron] 예약 지연 ${summary.totalDelayed}건 감지 — 관리자 알림 ${sent ? "발송" : "건너뜀/실패"}`);
  return NextResponse.json({ sent, totalDelayed: summary.totalDelayed, failed: summary.failed.length });
}
