import { NextRequest, NextResponse, after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchMemberScheduledPosts } from "@/lib/posts/dispatch";
import { memberIdForToken, stopMemberSchedulerIfIdle } from "@/lib/posts/memberScheduler";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// 회원 전용 예약 발행 실행 주소(v1.19, 2026-10-19). 「내 cron-job.org」를 고른 회원의 cron-job.org 작업이 1분마다 부른다.
// `Authorization: Bearer <회원 전용 토큰>` → 토큰 해시로 회원을 찾아 그 회원의 예약글만 발행한다(다른 회원 글·전체 실행 불가).
// cron-job.org는 30초 안에 응답이 없으면 실패로 기록하고 25번 넘게 실패하면 작업을 끄므로, 곧바로 응답하고 발행은 응답 뒤(after) 이어서 처리한다.
// 남은 예약이 없으면 회원 작업을 자동으로 끈다(다음 예약 때 다시 켜짐). 지침: 루트 docs/SCHEDULER_POLICY.md
async function handle(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  const service = createAdminClient() as unknown as SupabaseClient;
  const userId = token ? await memberIdForToken(service, token) : null;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  after(async () => {
    try {
      await dispatchMemberScheduledPosts(userId);
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
