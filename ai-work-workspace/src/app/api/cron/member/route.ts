// U11 자동화(2026-11-10) — 회원 전용 정시 실행 주소. 회원 본인 cron-job.org 작업이 1분마다 부른다.
// `Authorization: Bearer <회원 전용 토큰>` → 토큰 해시로 회원을 찾아 **그 회원의 정시 작업(반복 자동화·반복 템플릿·리마인더)만** 실행한다
// (다른 회원·운영 정리 작업은 실행하지 않음). cron-job.org는 30초 안에 응답이 없으면 실패로 기록하므로 곧바로 응답하고 실행은 응답 뒤(after).
// 남은 작업이 없으면 회원 cron-job.org 작업을 끈다(새로 예약하면 자동으로 다시 켜짐). 지침: 루트 docs/SCHEDULER_POLICY.md
// 플랜: docs/PLAN_20261110_U11_AUTOMATION.md §3-3
import { after, NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import "@/server/runtime";
import { runDueJobs } from "@/litpage/server/scheduler.ts";
import { withRequestCache } from "@/litpage/server/db.ts";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkProgramAccess } from "@/lib/programAccess";
import { THIS_PROGRAM_SLUG } from "@/lib/access";
import { memberIdForToken, skipPausedMember, stopMemberSchedulerIfIdle } from "@/lib/schedulerMember/memberScheduler";
import { memberJobFilter } from "@/server/memberJobs";
import { runMemberAgentWork } from "@/server/agentRuns";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";
export const maxDuration = 300;

async function handle(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  const service = createAdminClient() as unknown as SupabaseClient;
  const userId = token ? await memberIdForToken(service, token) : null;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (await skipPausedMember(service, userId)) return NextResponse.json({ accepted: true, paused: true });

  after(async () => {
    try {
      // 이용 권한(사용기간·정지·핸드폰)이 끝난 회원의 작업은 실행하지 않는다(작업은 남겨 두어 권한이 돌아오면 이어서 돈다)
      const access = await checkProgramAccess(service as unknown as Parameters<typeof checkProgramAccess>[0], userId, THIS_PROGRAM_SLUG);
      if (access.allowed) {
        await withRequestCache(() => runDueJobs(Date.now(), 200, memberJobFilter(userId)));
        // U12: 정시 에이전트 실행·남은 대기 실행을 이 회원 것만, 회원 본인 키로 끝까지 처리
        await withRequestCache(() => runMemberAgentWork(userId));
      }
      await withRequestCache(() => stopMemberSchedulerIfIdle(service, userId));
    } catch (error) {
      console.error(`[cron/member] user=${userId}`, error instanceof Error ? error.message.slice(0, 200) : error);
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
