import { NextRequest, NextResponse, after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchDueTopics } from "@/lib/schedulerMember/dispatch";
import { memberIdForToken, skipPausedMember, stopMemberSchedulerIfIdle } from "@/lib/schedulerMember/memberScheduler";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// 회원 전용 정기 자동 생성 주소(v1.21, 2026-10-20). 「내 cron-job.org」를 고른 회원의 cron-job.org 작업이 5분마다 부른다.
// `Authorization: Bearer <회원 전용 토큰>` → 토큰 해시로 회원을 찾아 그 회원의 정기 주제만 생성한다(다른 회원·전체 실행 불가).
// cron-job.org는 30초 안에 응답이 없으면 실패로 기록하고 25번 넘게 실패하면 작업을 끄므로, 곧바로 응답하고 실행은 응답 뒤(after) 이어서 한다.
// 켜진 정기 주제가 없으면 회원 작업을 자동으로 끈다(다시 켜면 자동으로 켜짐). 핸드폰 정책은 dispatchDueTopics 안에서 적용. 지침: 루트 docs/SCHEDULER_POLICY.md
async function handle(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  const service = createAdminClient() as unknown as SupabaseClient;
  const userId = token ? await memberIdForToken(service, token) : null;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (await skipPausedMember(service, userId)) return NextResponse.json({ accepted: true, paused: true });

  after(async () => {
    try {
      await dispatchDueTopics({ userId });
      await stopMemberSchedulerIfIdle(service, userId);
    } catch (error) {
      console.error("[dispatch-member]", error instanceof Error ? error.message : error);
    }
  });
  return NextResponse.json({ accepted: true });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
