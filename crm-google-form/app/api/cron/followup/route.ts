import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchDueFollowups } from "@/lib/schedulerMember/dispatch";
import { membersExcludedFromPlatform, platformSchedulerEnabled } from "@/lib/schedulerMember/memberScheduler";

export const dynamic = "force-dynamic";
// dynamic = "force-dynamic"만으로는 supabase-js 내부 fetch가 Next.js Data Cache에 걸려
// 오래된(첫 호출 시점) 결과를 계속 반환하는 문제가 실제로 재현됨(2026-08-18, 로컬 개발 서버에서
// 확인) — cron은 매번 최신 데이터를 읽어야 하므로 명시적으로 캐시를 완전히 끈다.
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// 운영자(AIMaster) Vercel 예약 호출 — vercel.json에 매일 09:00(KST, UTC 00:00) 스케줄로 등록.
// v1.10(2026-10-20): 「내 cron-job.org」를 고른 회원·일시정지한 회원은 건너뛴다(회원 본인 호출이 /api/cron/dispatch-member로 처리).
// 실행 로직(핸드폰·이용 권한 확인, 발송 전 선점)은 lib/schedulerMember/dispatch.ts. 지침: 루트 docs/SCHEDULER_POLICY.md
function isAuthorized(request: NextRequest): boolean {
  // CRON_SECRET이 비어 있으면 「Bearer undefined」로 통과되던 빈틈을 막는다(v1.10).
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
    const result = await dispatchDueFollowups({
      excludeUserIds: await membersExcludedFromPlatform(service),
      skipAll: !platformSchedulerEnabled(),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
