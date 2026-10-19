import { NextRequest, NextResponse } from "next/server";
import { cleanupOldPosts, dispatchDuePosts } from "@/lib/instagram/posts";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
// 여러 건을 순서대로 게시(건마다 컨테이너 처리 대기)하므로 넉넉하게
export const maxDuration = 300;

// 예약 게시 실행(v1.19). vercel.json의 자동 실행이 5분마다 GET으로 부르고,
// Vercel은 CRON_SECRET이 있으면 `Authorization: Bearer <CRON_SECRET>`를 자동으로 붙인다. 비밀값이 없거나 틀리면 401.
async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const results = await dispatchDuePosts();
  const cleaned = await cleanupOldPosts();
  return NextResponse.json({ processed: results.length, results, cleaned });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
