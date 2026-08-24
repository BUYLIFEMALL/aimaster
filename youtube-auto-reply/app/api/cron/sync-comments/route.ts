import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMonitoringDue } from "@/lib/schedule";
import { runCommentSync } from "@/lib/comments/sync";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 280;

// real_estate_sales/src/app/api/collect/dispatch/route.ts와 동일한 패턴: Vercel Cron이
// 5분마다 깨우기만 하고, 실제로 처리할지는 사용자별 monitoring_interval_minutes/last_run_at을
// 보고 이 라우트 안에서 다시 판단한다. 같은 이유로 CRON_SECRET Bearer 인증도 동일하게 쓴다.
//
// 예약 모니터링은 "새 댓글 수집 + AI 초안 생성"까지만 자동으로 하고, 실제 게시는 하지 않는다
// (postReplyAction은 여전히 사람이 검토 화면에서 직접 눌러야 한다 — AGENTS.md 7번 규칙).
function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

async function dispatch() {
  const admin = createAdminClient();
  const now = new Date();

  const { data: settingsRows, error } = await admin
    .from("ytreply_settings")
    .select("user_id, monitoring_interval_minutes, monitoring_started_at, last_run_at")
    .eq("monitoring_enabled", true);
  if (error) throw new Error(error.message);

  const dueRows = (settingsRows ?? []).filter((row) =>
    isMonitoringDue(row.last_run_at, row.monitoring_interval_minutes, now),
  );

  const summary: Array<{ userId: string; newCount?: number; error?: string }> = [];

  // profiles는 이 프로젝트 Database 타입에 없는 루트 공용 테이블이라(lib/access.ts와 동일 이유),
  // from()의 반환값만 느슨하게 받는다.
  const adminLike = admin as unknown as { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

  for (const row of dueRows) {
    // 정지된 계정은 자동 처리 대상에서 제외한다.
    const { data: profile } = await adminLike.from("profiles").select("is_suspended").eq("id", row.user_id).maybeSingle();
    if (profile?.is_suspended) continue;

    await admin.from("ytreply_settings").update({ last_run_at: now.toISOString() }).eq("user_id", row.user_id);

    const result = await runCommentSync(admin, row.user_id, row.monitoring_started_at);
    summary.push({ userId: row.user_id, newCount: result.newCount, error: result.error });
  }

  return { processed: dueRows.length, summary };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await dispatch();
  return NextResponse.json({ ok: true, ...result });
}
