import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { dispatchDueScheduledPosts } from "@/threads-content-ops/lib/scheduledDispatch";
import { IS_STANDALONE } from "@/threads-content-ops/lib/deployment";
import { membersWithOwnScheduler, platformSchedulerEnabled } from "@/threads-content-ops/lib/memberScheduler";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

/**
 * Threads 콘텐츠 운영 자동화 — 예약 발행 실행기 (v1.84). Vercel 크론이 1분마다 호출한다(vercel.json).
 * 회원이 예약해 둔 글(status='scheduled')만 시각이 되면 올린다. CRON_SECRET이 없으면 아무도 호출할 수 없게 막는다
 * (Vercel은 CRON_SECRET 환경변수가 있으면 `Authorization: Bearer <CRON_SECRET>`를 붙여 호출한다).
 * v2.07: AIMaster 운영에서는 본인 cron-job.org 키를 등록한 회원 글은 건드리지 않고(회원 전용 주소가 처리),
 * 연결 안 한 회원 글은 관리자 지정(TCO_PLATFORM_SCHEDULER=on)일 때만 발행, 아니면 "연결 필요"로 실패 처리한다.
 * 설치 키트(IS_STANDALONE)는 사이트 하나가 설치자 몫이라 예전처럼 전부 처리한다. 지침: 루트 docs/SCHEDULER_POLICY.md
 */
async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const service = createServiceClient();
    const summary = IS_STANDALONE
      ? await dispatchDueScheduledPosts(service)
      : await dispatchDueScheduledPosts(service, {
        excludeUserIds: await membersWithOwnScheduler(service),
        failWithMessage: platformSchedulerEnabled() ? undefined : "예약 발행에 필요한 cron-job.org API 키가 없어 올리지 않았습니다. API키등록·플랫폼연동에서 본인 cron-job.org API 키를 등록한 뒤 다시 예약해 주세요.",
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
