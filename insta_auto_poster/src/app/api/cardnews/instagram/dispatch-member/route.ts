import { NextRequest, NextResponse, after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/cardnews/supabase/admin";
import { dispatchDuePosts } from "@/lib/cardnews/instagram/posts";
import { memberIdForToken, skipPausedMember, stopMemberSchedulerIfIdle } from "@/lib/posts/memberScheduler";
import { dispatchMemberScheduledPosts } from "@/lib/posts/dispatch";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// 회원 전용 인스타 예약 게시 실행 주소(v1.24, 2026-10-20). 「내 cron-job.org」를 고른 회원의 cron-job.org 작업이 1분마다 부른다.
// `Authorization: Bearer <회원 전용 토큰>` → 토큰 해시로 회원을 찾아 그 회원의 예약글만 게시한다(다른 회원 글·전체 실행 불가).
// cron-job.org는 30초 안에 응답이 없으면 실패로 기록하고 25번 넘게 실패하면 작업을 끄므로, 곧바로 응답하고 게시는 응답 뒤(after) 이어서 처리한다.
// 남은 예약이 없으면 회원 작업을 자동으로 끈다(다음 예약 때 다시 켜짐). 예약 시각 이용 권한·핸드폰 확인은 dispatchDuePosts 안에서 한다. 지침: 루트 docs/SCHEDULER_POLICY.md
async function handle(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  const service = createAdminClient() as unknown as SupabaseClient;
  const userId = token ? await memberIdForToken(service, token) : null;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (await skipPausedMember(service, userId)) return NextResponse.json({ accepted: true, paused: true });

  after(async () => {
    try {
      // v1.39: 예약 실행 설정을 INSTA 하나로 합침 — INSTA 회원 토큰으로 피드 글·카드뉴스 예약을 함께 실행(옛 주소 호환)
      await dispatchMemberScheduledPosts(userId);
      await dispatchDuePosts(10, { userId });
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
