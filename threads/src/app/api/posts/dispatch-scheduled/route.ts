import { NextRequest, NextResponse } from "next/server";
import { dispatchAllScheduledPosts } from "@/lib/posts/dispatch";

// 예약 게시 실행 엔드포인트.
// vercel.json의 Cron Job이 GET으로 호출하고, cron-job.org / QStash 같은 외부
// 스케줄러는 보통 POST를 사용하므로 두 메서드 모두 동일 로직을 지원합니다.
// Vercel Cron은 CRON_SECRET 환경변수가 설정되어 있으면 자동으로
// `Authorization: Bearer <CRON_SECRET>` 헤더를 붙여 호출합니다.
async function handleDispatch(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const results = await dispatchAllScheduledPosts();

  return NextResponse.json({ processed: results.length, results });
}

export async function GET(request: NextRequest) {
  return handleDispatch(request);
}

export async function POST(request: NextRequest) {
  return handleDispatch(request);
}
