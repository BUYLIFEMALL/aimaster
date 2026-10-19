import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchDueCampaigns } from "@/lib/schedulerMember/dispatch";
import { membersExcludedFromPlatform, platformSchedulerEnabled } from "@/lib/schedulerMember/memberScheduler";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// 캠페인 정기 발송 — 운영자 Vercel 예약 호출(vercel.json, 매시 정각). real_estate_sales/threads의 CRON_SECRET Bearer 인증 패턴.
// v1.21: 회원이 고른 실행 방식대로 — 「Vercel(운영 기본)」 회원 캠페인만 여기서 보내고, 「내 cron-job.org」 회원·일시정지 회원은 건너뛴다
// (그 회원들은 /api/cron/dispatch-member를 회원 토큰으로 부른다). 실행 로직: lib/schedulerMember/dispatch.ts. 지침: 루트 docs/SCHEDULER_POLICY.md
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // v1.21: 비밀값이 비어 있으면 「Bearer undefined」로 통과하던 빈틈을 막는다
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

async function handle(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await dispatchDueCampaigns({
    excludeUserIds: await membersExcludedFromPlatform(createAdminClient() as unknown as SupabaseClient),
    skipAll: !platformSchedulerEnabled(),
  });
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
