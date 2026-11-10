import { createAdminClient } from "@/lib/supabase/admin";
import { runCleanup } from "@/lib/cleanup";
import { syncScheduled } from "@/lib/syncScheduled";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";
export const maxDuration = 300;

// 매일 03:50(한국 시간) ① 예약 확인: 예약 시각이 지난 글을 회원 본인 연결로 읽기만 해 실제 발행이면 「발행됨」+이미지 1년 보관
// ② 정리: 미발행 30일·발행 이미지 1년 지난 원고·이미지 삭제(관리자·시험 계정 제외). 회원 글을 새로 발행하지 않는다.
// Vercel Cron이 Authorization: Bearer CRON_SECRET 으로 부른다.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "unauthorized" }, { status: 401 });
  const admin = createAdminClient() as never;
  let sync: unknown = null;
  try { sync = await syncScheduled(admin); } catch { sync = { error: "sync_failed" }; } // 확인 실패해도 정리는 진행(확인 안 된 예약은 미발행 규칙 그대로)
  try {
    return Response.json({ data: { sync, cleanup: await runCleanup(admin) } });
  } catch {
    return Response.json({ error: "cleanup_failed" }, { status: 503 });
  }
}
