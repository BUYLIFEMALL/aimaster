import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CRONJOB_PROVIDER, ensureMemberSchedulerRunning, memberCronjobKey, memberSchedulerMode, memberSchedulerState,
  pauseMemberScheduler, removeMemberScheduler, resumeMemberScheduler, setMemberSchedulerMode,
} from "@/lib/instagram/memberScheduler";
import { POSTS_TABLE } from "@/lib/instagram/posting";

/** 키 가림 표시(앞 6자·뒤 4자만) */
function maskApiKey(key: string): string {
  if (!key || key.length < 8) return "••••••••";
  return key.slice(0, 6) + "••••••••" + key.slice(-4);
}

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 예약 게시 실행 방식(v1.16, 기준: ai-influencer-studio /api/instagram/scheduler v1.15).
// GET 상태(+ 등록된 cron-job.org 키 가림 표시), POST { action: "mode", mode } | "pause" | "resume" | { action: "key", apiKey }, DELETE 키 삭제.
// 로그인·이용 권한 확인 뒤 본인 행만 바꾼다(쓰기는 서비스 롤). 상태 조회는 cron-job.org를 부르지 않는다(무료 API 하루 100회). 지침: 루트 docs/SCHEDULER_POLICY.md
export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const service = createAdminClient() as unknown as SupabaseClient;
  const [state, key] = await Promise.all([memberSchedulerState(service, access.user.id), memberCronjobKey(service, access.user.id)]);
  return NextResponse.json({ ...state, maskedKey: key ? maskApiKey(key) : null });
}

export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const userId = access.user.id;
  const service = createAdminClient() as unknown as SupabaseClient;
  const body = (await request.json().catch(() => ({}))) as { action?: unknown; mode?: unknown; apiKey?: unknown };
  try {
    if (body.action === "mode" && (body.mode === "vercel" || body.mode === "cronjob")) {
      await setMemberSchedulerMode(service, userId, body.mode);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "pause") {
      // 2026-10-20 일시정지 안전 처리: 일시정지는 먼저 저장되고, cron-job.org 끄기만 실패하면 안내(다음 호출 때 다시 시도)
      const { jobStopped } = await pauseMemberScheduler(service, userId);
      return NextResponse.json(jobStopped ? { ok: true } : { ok: true, notice: "일시정지했습니다. cron-job.org 작업 끄기는 실패해 다음 호출 때 다시 시도합니다(그동안에도 실행하지 않습니다)." });
    }
    if (body.action === "resume") {
      const { started } = await resumeMemberScheduler(service, userId);
      return NextResponse.json({ ok: true, started });
    }
    if (body.action === "key") {
      const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
      if (!apiKey) return NextResponse.json({ error: "cron-job.org API 키를 입력해주세요." }, { status: 400 });
      // 키를 바꾸면 예전 계정의 회원 작업을 지운다(방식·일시정지 유지). 공용 연동 키라 다른 프로그램에서도 그대로 쓴다.
      await removeMemberScheduler(service, userId, { keepMode: true });
      const { error } = await service.from("user_api_keys").upsert({ user_id: userId, provider: CRONJOB_PROVIDER, api_key: apiKey, updated_at: new Date().toISOString() }, { onConflict: "user_id,provider" });
      if (error) return NextResponse.json({ error: "키를 저장하지 못했습니다." }, { status: 500 });
      // 「내 cron-job.org」 회원이고 남은 예약이 있으면 새 키 계정에 작업을 다시 켠다
      if ((await memberSchedulerMode(service, userId)) === "cronjob") {
        const { count } = await service.from(POSTS_TABLE).select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "scheduled");
        if ((count ?? 0) > 0) {
          try {
            await ensureMemberSchedulerRunning(service, userId, apiKey);
          } catch (err) {
            return NextResponse.json({ ok: true, maskedKey: maskApiKey(apiKey), message: `키는 저장했지만 예약 실행 작업을 켜지 못했습니다. ${err instanceof Error ? err.message : ""}`.trim() });
          }
        }
      }
      return NextResponse.json({ ok: true, maskedKey: maskApiKey(apiKey) });
    }
    return NextResponse.json({ error: "요청이 올바르지 않습니다." }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "처리하지 못했습니다." }, { status: 400 });
  }
}

/** DELETE — cron-job.org 키 삭제. 회원 작업·연결 정보를 먼저 지우고(키가 있어야 작업을 찾음) 방식을 기본(Vercel)으로 되돌린다. */
export async function DELETE() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const service = createAdminClient() as unknown as SupabaseClient;
  await removeMemberScheduler(service, access.user.id);
  const { error } = await service.from("user_api_keys").delete().eq("user_id", access.user.id).eq("provider", CRONJOB_PROVIDER);
  if (error) return NextResponse.json({ error: "키를 삭제하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
