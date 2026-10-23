import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchDueReports } from "@/lib/schedulerMember/dispatch";
import { membersExcludedFromPlatform, platformSchedulerEnabled } from "@/lib/schedulerMember/memberScheduler";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// 매일 리포트 자동 생성 — vercel.json 매일 UTC 00:00(=KST 09:00). 회원 본인 키로만 생성, 같은 날 두 번 만들지 않음.
// 실행 로직은 lib/schedulerMember/dispatch.ts(회원 cron-job.org 주소와 공용, v1.15).
// v1.15(2026-10-20): 「내 cron-job.org」를 고른 회원·일시정지한 회원은 건너뛴다. 지침: 루트 docs/SCHEDULER_POLICY.md
function isAuthorized(request: NextRequest): boolean {
  // CRON_SECRET이 비어 있으면 「Bearer undefined」로 통과되던 빈틈을 막는다(v1.15).
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const service = createAdminClient() as unknown as SupabaseClient;
    const result = await dispatchDueReports({
      excludeUserIds: await membersExcludedFromPlatform(service),
      skipAll: !platformSchedulerEnabled(),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
