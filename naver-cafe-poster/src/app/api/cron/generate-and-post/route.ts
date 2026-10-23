import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchDueSources } from "@/lib/scheduledSource/dispatch";
import { membersExcludedFromPlatform, platformSchedulerEnabled } from "@/lib/scheduledSource/memberScheduler";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// 정기 자동 실행(생성+포스팅) — 운영자 Vercel 예약 호출. Vercel Cron은 5분마다 깨우기만 하고, 실제로 실행할
// 차례인지는 last_run_at 기준으로 다시 판단한다(kakao_auto_poster의 generate-reports 크론과 동일 패턴).
// v1.21: 회원이 고른 실행 방식대로 — 「Vercel(운영 기본)」 회원 소스만 여기서 실행하고, 「내 cron-job.org」 회원·일시정지 회원은 건너뛴다
// (그 회원들은 /api/cron/dispatch-member를 회원 토큰으로 부른다). 실행 로직: src/lib/scheduledSource/dispatch.ts. 지침: 루트 docs/SCHEDULER_POLICY.md
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // v1.21: 비밀값이 비어 있으면 「Bearer undefined」로 통과하던 빈틈을 막는다
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await dispatchDueSources({
    excludeUserIds: await membersExcludedFromPlatform(createAdminClient() as unknown as SupabaseClient),
    failWithMessage: platformSchedulerEnabled() ? undefined : "이 사이트는 Vercel 예약 호출이 꺼져 있어 실행하지 않았습니다. 설정 → ⏰ 예약 발행에서 「내 cron-job.org」를 선택하고 키를 등록해 주세요.",
  });
  return NextResponse.json({ ok: true, ...result });
}
