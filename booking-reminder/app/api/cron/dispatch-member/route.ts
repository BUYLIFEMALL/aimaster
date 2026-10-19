import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchDueReminders } from "@/lib/schedulerMember/dispatch";
import { memberIdForToken, stopMemberSchedulerIfIdle } from "@/lib/schedulerMember/memberScheduler";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// 회원 전용 예약 리마인드 발송 주소(v1.21, 2026-10-20). 「내 cron-job.org」를 고른 회원의 cron-job.org 작업이 15분마다 부른다.
// `Authorization: Bearer <회원 전용 토큰>` → 토큰 해시로 회원을 찾아 그 회원의 리마인드 규칙만 보낸다(다른 회원·전체 실행 불가).
// cron-job.org는 30초 안에 응답이 없으면 실패로 기록하고 25번 넘게 실패하면 작업을 끄므로, 곧바로 응답하고 실행은 응답 뒤(waitUntil — Next 14라 after 없음) 이어서 한다.
// 켜진 리마인드 규칙이 없으면 회원 작업을 자동으로 끈다(다시 켜면 자동으로 켜짐). 핸드폰 정책은 dispatchDueReminders 안에서 적용. 지침: 루트 docs/SCHEDULER_POLICY.md
async function handle(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  const service = createAdminClient() as unknown as SupabaseClient;
  const userId = token ? await memberIdForToken(service, token) : null;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  waitUntil((async () => {
    try {
      await dispatchDueReminders({ userId });
      await stopMemberSchedulerIfIdle(service, userId);
    } catch (error) {
      console.error("[dispatch-member]", error instanceof Error ? error.message : error);
    }
  })());
  return NextResponse.json({ accepted: true });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
