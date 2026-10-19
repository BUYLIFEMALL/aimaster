import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cleanupOldPosts, dispatchDuePosts } from "@/lib/instagram/posts";
import { createAdminClient } from "@/lib/supabase/admin";
import { membersExcludedFromPlatform, platformSchedulerEnabled } from "@/lib/instagram/memberScheduler";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
// 여러 건을 순서대로 게시(건마다 컨테이너 처리 대기)하므로 넉넉하게
export const maxDuration = 300;

// 예약 게시 실행(v1.19). vercel.json의 자동 실행이 5분마다 GET으로 부르고,
// Vercel은 CRON_SECRET이 있으면 `Authorization: Bearer <CRON_SECRET>`를 자동으로 붙인다. 비밀값이 없거나 틀리면 401.
// v1.24: 회원이 고른 실행 방식대로 — 「Vercel(운영 기본)」 회원 글만 여기서 게시하고, 「내 cron-job.org」 회원·일시정지 회원은 건너뛴다
// (그 회원들은 /api/cardnews/instagram/dispatch-member를 회원 토큰으로 부른다). 30일 정리는 모든 회원 대상 그대로. 지침: 루트 docs/SCHEDULER_POLICY.md
async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const results = await dispatchDuePosts(10, {
    excludeUserIds: await membersExcludedFromPlatform(createAdminClient() as unknown as SupabaseClient),
    failWithMessage: platformSchedulerEnabled() ? undefined : "이 사이트는 Vercel 예약 호출이 꺼져 있어 올리지 않았습니다. 설정 → ⏰ 예약 발행에서 「내 cron-job.org」를 선택하고 키를 등록한 뒤 다시 예약해 주세요.",
  });
  const cleaned = await cleanupOldPosts();
  return NextResponse.json({ processed: results.length, results, cleaned });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
