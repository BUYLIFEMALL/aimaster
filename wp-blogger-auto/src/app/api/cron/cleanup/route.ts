import { createAdminClient } from "@/lib/supabase/admin";
import { runCleanup } from "@/lib/cleanup";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

// 매일 03:50(한국 시간) 30일 지난 원고·이미지 정리(관리자·시험 계정 제외). 회원 글을 발행하지 않는 운영 정리 작업이다.
// Vercel Cron이 Authorization: Bearer CRON_SECRET 으로 부른다.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "unauthorized" }, { status: 401 });
  try {
    return Response.json({ data: await runCleanup(createAdminClient() as never) });
  } catch {
    return Response.json({ error: "cleanup_failed" }, { status: 503 });
  }
}
