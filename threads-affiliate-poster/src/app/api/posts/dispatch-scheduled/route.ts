import { NextRequest, NextResponse } from "next/server";
import { dispatchAllScheduledPosts } from "@/lib/posts/dispatch";
import { createAdminClient } from "@/lib/supabase/admin";
import { membersExcludedFromPlatform, platformSchedulerEnabled } from "@/lib/posts/memberScheduler";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 예약 게시 실행 엔드포인트(운영자 Vercel 예약 호출).
// v1.63: 회원이 고른 실행 방식대로 — 「Vercel(운영 기본)」 회원 글만 여기서 발행하고, 「cron-job.org」 회원·일시정지 회원은 건너뛴다
// (그 회원들은 /api/posts/dispatch-member를 회원 토큰으로 부른다). Vercel 방식이 꺼진 사이트면 Vercel 회원 글은 안내와 함께 실패 처리.
// 지침: 루트 docs/SCHEDULER_POLICY.md
// vercel.json의 Cron Job이 GET으로 호출하고, cron-job.org / QStash 같은 외부
// 스케줄러는 보통 POST를 사용하므로 두 메서드 모두 동일 로직을 지원합니다.
async function handleDispatch(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const results = await dispatchAllScheduledPosts({
    excludeUserIds: await membersExcludedFromPlatform(createAdminClient() as unknown as SupabaseClient),
    failWithMessage: platformSchedulerEnabled() ? undefined : "이 사이트는 Vercel 예약 호출이 꺼져 있어 올리지 않았습니다. 설정 → ⏰ 예약 발행에서 「내 cron-job.org」를 선택하고 키를 등록한 뒤 다시 예약해 주세요.",
  });

  return NextResponse.json({ processed: results.length, results });
}

export async function GET(request: NextRequest) {
  return handleDispatch(request);
}

export async function POST(request: NextRequest) {
  return handleDispatch(request);
}
