import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchDueTopics } from "@/lib/schedulerMember/dispatch";
import { membersExcludedFromPlatform, platformSchedulerEnabled } from "@/lib/schedulerMember/memberScheduler";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// Phase 3 — 예약(정기 자동 생성) dispatch. 주제마다 회원이 정한 주기(1시간~매주)가 다를 수
// 있어, Vercel Cron은 5분마다 깨우기만 하고(vercel.json) 실제로 생성할 차례인지는
// last_run_at 기준으로 다시 판단한다(trending-product-finder의 dispatch-sourcing-alerts와 동일 패턴).
// 카카오 발송은 이 크론이 직접 하지 않는다 — 발행 여부는 항상 사람이 텔레그램 버튼(또는 웹 화면)으로 결정한다.
// v1.21: 회원이 고른 실행 방식대로 — 「Vercel(운영 기본)」 회원 주제만 여기서 생성하고, 「내 cron-job.org」 회원·일시정지 회원은 건너뛴다
// (그 회원들은 /api/cron/dispatch-member를 회원 토큰으로 부른다). 실행 로직: src/lib/schedulerMember/dispatch.ts. 지침: 루트 docs/SCHEDULER_POLICY.md
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // v1.21: 비밀값이 비어 있으면 「Bearer undefined」로 통과하던 빈틈을 막는다
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await dispatchDueTopics({
    excludeUserIds: await membersExcludedFromPlatform(createAdminClient() as unknown as SupabaseClient),
    failWithMessage: platformSchedulerEnabled() ? undefined : "이 사이트는 Vercel 예약 호출이 꺼져 있습니다.",
  });
  return NextResponse.json({ ok: true, ...result });
}
