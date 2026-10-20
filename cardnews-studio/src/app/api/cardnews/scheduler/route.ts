import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { authorize } from "@/lib/cardnews/apiGuard";
import { createAdminClient } from "@/lib/supabase/admin";
import { memberSchedulerState, pauseMemberScheduler, resumeMemberScheduler, setMemberSchedulerMode } from "@/lib/instagram/memberScheduler";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 예약 게시 실행 방식(v1.24, 2026-10-20) — 화면용. GET 상태, POST { action: "mode", mode } | { action: "pause" } | { action: "resume" }.
// 로그인·이용 권한 확인 뒤 본인 행만 바꾼다(쓰기는 서비스 롤). 상태 조회는 cron-job.org를 부르지 않는다(무료 API 하루 100회). 지침: 루트 docs/SCHEDULER_POLICY.md
export async function GET() {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const state = await memberSchedulerState(createAdminClient() as unknown as SupabaseClient, gate.auth.user.id);
  return NextResponse.json(state);
}

export async function POST(request: Request) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const userId = gate.auth.user.id;
  const service = createAdminClient() as unknown as SupabaseClient;
  const body = (await request.json().catch(() => ({}))) as { action?: unknown; mode?: unknown };
  try {
    if (body.action === "mode" && (body.mode === "vercel" || body.mode === "cronjob")) {
      await setMemberSchedulerMode(service, userId, body.mode);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "pause") {
      const { jobStopped } = await pauseMemberScheduler(service, userId);
      return NextResponse.json(jobStopped ? { ok: true } : { ok: true, notice: "일시정지했습니다. cron-job.org 작업 끄기는 실패해 다음 호출 때 다시 시도합니다(그동안에도 실행하지 않습니다)." });
    }
    if (body.action === "resume") {
      const { started } = await resumeMemberScheduler(service, userId);
      return NextResponse.json({ ok: true, started });
    }
    return NextResponse.json({ error: "요청이 올바르지 않습니다." }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "처리하지 못했습니다." }, { status: 400 });
  }
}
