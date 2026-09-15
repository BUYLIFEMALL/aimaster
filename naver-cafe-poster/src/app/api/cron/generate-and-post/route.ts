import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isScheduleDue } from "@/lib/schedule";
import { runScheduledSource } from "@/lib/scheduledSource/engine";
import type { ScheduledSource } from "@/types/post";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// 예약(정기 자동 생성+포스팅) dispatch. Vercel Cron은 5분마다 깨우기만 하고, 실제로 실행할
// 차례인지는 이 라우트에서 last_run_at 기준으로 다시 판단한다(kakao_auto_poster의
// generate-reports 크론과 동일 패턴).
function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

async function dispatch() {
  const admin = createAdminClient();
  const now = new Date();

  const { data: rows, error } = await admin
    .from("ncafe_scheduled_sources")
    .select("*")
    .eq("is_active", true)
    .eq("schedule_enabled", true);

  if (error) throw new Error(error.message);

  const dueRows = ((rows ?? []) as ScheduledSource[]).filter(
    (r) => r.interval_minutes != null && isScheduleDue(r.last_run_at, r.interval_minutes, now),
  );

  let succeeded = 0;
  let failed = 0;
  const details: { sourceId: string; result: string }[] = [];

  for (const source of dueRows) {
    const result = await runScheduledSource(admin, source.user_id, source);
    if (result.success) {
      succeeded += 1;
      details.push({ sourceId: source.id, result: `post ${result.postId} created` });
    } else {
      failed += 1;
      details.push({ sourceId: source.id, result: `failed: ${result.error}` });
      console.error(`[naver-cafe-poster cron] source ${source.id} 실행 실패:`, result.error);
    }
  }

  return { total: rows?.length ?? 0, due: dueRows.length, succeeded, failed, details };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await dispatch();
  return NextResponse.json({ ok: true, ...result });
}
