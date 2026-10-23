import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
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

  // cron-job.org는 30초 안에 응답이 없으면 실패로 기록하고, 실패가 25번 넘으면 작업을 자동으로 끈다(무료 규칙).
  // 이미지·영상 발행은 30초를 넘길 수 있으므로 곧바로 「받았음」으로 응답하고, 발행은 응답 뒤 이어서 처리한다(waitUntil).
  // 다음 호출과 겹쳐도 글마다 scheduled → publishing을 먼저 가져간 실행만 발행하므로 중복 발행은 없다.
  waitUntil((async () => {
    await dispatchDueScheduledPosts(service, { onlyUserId: userId });
    // 남은 예약이 없으면 회원 cron-job.org 작업을 끈다(다음 예약 때 자동으로 다시 켜짐).
    await stopMemberSchedulerIfIdle(service, userId);
  })().catch((error) => console.error("[dispatch-member]", error instanceof Error ? error.message : error)));
  return NextResponse.json({ accepted: true });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
