import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { cleanupExpired, dispatchDueEvents } from "@/lib/schedulerMember/dispatch";
import { membersExcludedFromPlatform, platformSchedulerEnabled } from "@/lib/schedulerMember/memberScheduler";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// 운영자 Vercel 예약 호출(vercel.json, 매일 08:00 KST). CRON_SECRET Bearer 인증(비어 있으면 막음).
// ① 일정 알림: 「AIMaster 기본(Vercel)」 회원만(「내 cron-job.org」·일시정지 회원은 건너뜀) ② 1년 보관 정리(운영 정리 작업 — 관리자·시험 계정 제외).
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const events = await dispatchDueEvents({
      excludeUserIds: await membersExcludedFromPlatform(createAdminClient() as unknown as SupabaseClient),
      skipAll: !platformSchedulerEnabled(),
    });
    const cleanup = await cleanupExpired();
    return NextResponse.json({ ok: true, events, cleanup });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "실행하지 못했습니다." }, { status: 500 });
  }
}
