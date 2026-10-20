"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireProgramAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { pauseMemberScheduler, resumeMemberScheduler, setMemberSchedulerMode, type SchedulerMode } from "@/lib/posts/memberScheduler";

// 예약 발행 실행 방식 선택·전체 일시정지/재개(v1.25, 2026-10-19). 지침: 루트 docs/SCHEDULER_POLICY.md
const service = () => createAdminClient() as unknown as SupabaseClient;

export async function setScheduledPublishingMode(mode: SchedulerMode): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (mode !== "vercel" && mode !== "cronjob") throw new Error("지원하지 않는 실행 방식입니다.");
    const user = await requireProgramAccess();
    await setMemberSchedulerMode(service(), user.id, mode);
    revalidatePath("/settings");
    revalidatePath("/posts");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "실행 방식을 바꾸지 못했습니다." };
  }
}

export async function pauseScheduledPublishing(): Promise<{ ok: true; notice?: string } | { ok: false; error: string }> {
  try {
    const user = await requireProgramAccess();
    const { jobStopped } = await pauseMemberScheduler(service(), user.id);
    revalidatePath("/posts");
    return jobStopped ? { ok: true } : { ok: true, notice: "일시정지했습니다. cron-job.org 작업 끄기는 실패해 다음 호출 때 다시 시도합니다(그동안에도 실행하지 않습니다)." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "일시정지하지 못했습니다." };
  }
}

export async function resumeScheduledPublishing(): Promise<{ ok: true; started: boolean } | { ok: false; error: string }> {
  try {
    const user = await requireProgramAccess();
    const result = await resumeMemberScheduler(service(), user.id);
    revalidatePath("/posts");
    return { ok: true, started: result.started };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "재개하지 못했습니다." };
  }
}
