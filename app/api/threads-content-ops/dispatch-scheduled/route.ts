import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { dispatchDueScheduledPosts } from "@/threads-content-ops/lib/scheduledDispatch";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

/**
 * Threads 콘텐츠 운영 자동화 — 예약 발행 실행기 (v1.84). Vercel 크론이 1분마다 호출한다(vercel.json).
 * 회원이 예약해 둔 글(status='scheduled')만 시각이 되면 올린다. CRON_SECRET이 없으면 아무도 호출할 수 없게 막는다
 * (Vercel은 CRON_SECRET 환경변수가 있으면 `Authorization: Bearer <CRON_SECRET>`를 붙여 호출한다).
 */
async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await dispatchDueScheduledPosts(createServiceClient());
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
