import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { dispatchDueScheduledPosts } from "@/threads-content-ops/lib/scheduledDispatch";
import { membersExcludedFromPlatform, platformSchedulerEnabled } from "@/threads-content-ops/lib/memberScheduler";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

/**
 * Threads 콘텐츠 운영 자동화 — 예약 발행 실행기 (v1.84). Vercel 크론이 1분마다 호출한다(vercel.json).
 * 회원이 예약해 둔 글(status='scheduled')만 시각이 되면 올린다. CRON_SECRET이 없으면 아무도 호출할 수 없게 막는다
 * (Vercel은 CRON_SECRET 환경변수가 있으면 `Authorization: Bearer <CRON_SECRET>`를 붙여 호출한다).
 * v2.08: 회원이 고른 실행 방식대로 — 「Vercel(기본)」 회원 글만 여기서 발행하고, 「cron-job.org」 회원·일시정지 회원은 건너뛴다.
 * Vercel 방식이 꺼진 사이트(TCO_PLATFORM_SCHEDULER=off, 키트 기본)면 Vercel 회원 글은 안내와 함께 실패 처리한다.
 * 설치 키트도 같은 코드(Vercel 방식은 KIT/enable-vercel-cron이 TCO_PLATFORM_SCHEDULER=on을 넣었을 때만). 지침: 루트 docs/SCHEDULER_POLICY.md
 */
async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const service = createServiceClient();
    const summary = await dispatchDueScheduledPosts(service, {
      excludeUserIds: await membersExcludedFromPlatform(service),
      failWithMessage: platformSchedulerEnabled() ? undefined : "이 사이트는 Vercel 예약 호출이 꺼져 있어 올리지 않았습니다. API키등록·플랫폼연동 → ⏰ 예약 발행에서 「내 cron-job.org」를 선택하고 키를 등록한 뒤 다시 예약해 주세요.",
    });
    return NextResponse.json(summary);
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
