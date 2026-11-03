import { NextRequest, NextResponse, after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchDueEvents } from "@/lib/schedulerMember/dispatch";
import { memberIdForToken, skipPausedMember, stopMemberSchedulerIfIdle } from "@/lib/schedulerMember/memberScheduler";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// 회원 전용 일정 알림 주소(v1.04). 「내 cron-job.org」를 고른 회원의 작업이 매일 08:00 KST에 부른다.
// `Authorization: Bearer <회원 전용 토큰>` → 토큰 해시로 회원을 찾아 그 회원 일정만 알린다. cron-job.org가 30초 안에 응답을 기다리므로 곧바로 응답하고 실행은 after()로.
// 남은 일정이 없으면 회원 작업을 자동으로 끈다(일정을 넣으면 다시 켜짐). 지침: 루트 docs/SCHEDULER_POLICY.md
async function handle(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  const service = createAdminClient() as unknown as SupabaseClient;
  const userId = token ? await memberIdForToken(service, token) : null;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (await skipPausedMember(service, userId)) return NextResponse.json({ accepted: true, paused: true });
  after(async () => {
    try {
      await dispatchDueEvents({ userId });
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
