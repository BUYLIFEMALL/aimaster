import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchDueMonitoring } from "@/lib/schedulerMember/dispatch";
import { membersExcludedFromPlatform, platformSchedulerEnabled } from "@/lib/schedulerMember/memberScheduler";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 280;

// real_estate_sales/src/app/api/collect/dispatch/route.ts, youtube-auto-reply와 동일한 패턴: Vercel Cron이
// 5분마다 깨우기만 하고, 실제로 처리할지는 사용자별 monitoring_interval_minutes/last_run_at을 보고 다시 판단한다
// (실행 로직은 lib/schedulerMember/dispatch.ts — 회원 cron-job.org 주소와 공용, v1.26).
// v1.26(2026-10-23): 「내 cron-job.org」를 고른 회원·일시정지한 회원은 건너뛴다. 지침: 루트 docs/SCHEDULER_POLICY.md
//
// 예약 모니터링은 "새 댓글 수집 + AI 초안 생성"까지만 자동으로 하고, 실제 게시는 회원이 켠 「자동 게시」 또는
// 검토 화면/텔레그램 승인으로만 한다(AGENTS.md 사전 승인 5번).
function isAuthorized(request: NextRequest): boolean {
  // v1.12: 비밀값이 비어 있으면 「Bearer undefined」로 통과하던 빈틈을 막는다
  const secret = process.env.CRON_SECRET?.trim();
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const service = createAdminClient() as unknown as SupabaseClient;
  const result = await dispatchDueMonitoring({
    excludeUserIds: await membersExcludedFromPlatform(service),
    skipAll: !platformSchedulerEnabled(),
  });
  return NextResponse.json({ ok: true, ...result });
}
