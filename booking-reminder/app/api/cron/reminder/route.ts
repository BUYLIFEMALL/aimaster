import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchDueReminders } from "@/lib/schedulerMember/dispatch";
import { membersExcludedFromPlatform, platformSchedulerEnabled } from "@/lib/schedulerMember/memberScheduler";

export const dynamic = "force-dynamic";
// dynamic="force-dynamic"만으로는 supabase-js 내부 fetch가 Next.js Data Cache에 걸려 오래된
// 결과를 계속 반환하는 문제가 crm-google-form에서 실제로 재현됨 — cron은 매번 최신 데이터를
// 읽어야 하므로 명시적으로 캐시를 완전히 끈다 (docs/PLATFORM_PATTERNS.md §10).
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// 예약 리마인드 — 운영자 Vercel 예약 호출(vercel.json, 15분마다). CRON_SECRET Bearer 인증 패턴.
// v1.21: 회원이 고른 실행 방식대로 — 「Vercel(운영 기본)」 회원 규칙만 여기서 보내고, 「내 cron-job.org」 회원·일시정지 회원은 건너뛴다
// (그 회원들은 /api/cron/dispatch-member를 회원 토큰으로 부른다). 실행 로직: lib/schedulerMember/dispatch.ts. 지침: 루트 docs/SCHEDULER_POLICY.md
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // v1.21: 비밀값이 비어 있으면 「Bearer undefined」로 통과하던 빈틈을 막는다
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await dispatchDueReminders({
      excludeUserIds: await membersExcludedFromPlatform(createAdminClient() as unknown as SupabaseClient),
      skipAll: !platformSchedulerEnabled(),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "실행하지 못했습니다." }, { status: 500 });
  }
}
