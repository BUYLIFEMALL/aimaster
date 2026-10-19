import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { dispatchDueScheduledPosts } from "@/threads-content-ops/lib/scheduledDispatch";
import { memberIdForToken, stopMemberSchedulerIfIdle } from "@/threads-content-ops/lib/memberScheduler";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

/**
 * 회원 전용 예약 발행 실행 주소(v2.07, 2026-10-19). 회원 본인 cron-job.org 작업이 1분마다 부른다.
 * `Authorization: Bearer <회원 전용 토큰>` → 토큰 해시로 회원을 찾아 **그 회원의 예약 글만** 발행한다.
 * 다른 회원 글·전체 실행은 불가. 남은 예약이 없으면 작업을 자동으로 끈다(다음 예약 때 다시 켜짐). 지침: 루트 docs/SCHEDULER_POLICY.md
 */
async function handle(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  const service = createServiceClient();
  const userId = token ? await memberIdForToken(service, token) : null;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const summary = await dispatchDueScheduledPosts(service, { onlyUserId: userId });
    // 남은 예약이 없으면 회원 cron-job.org 작업을 끈다(다음 예약 때 자동으로 다시 켜짐). 실패해도 발행 결과는 그대로 돌려준다.
    const stopped = await stopMemberSchedulerIfIdle(service, userId).catch(() => false);
    return NextResponse.json({ ...summary, stopped });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "dispatch failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
