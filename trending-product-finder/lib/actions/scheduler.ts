"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireProgramAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { pauseMemberScheduler, resumeMemberScheduler, setMemberSchedulerMode, type SchedulerMode } from "@/lib/schedulerMember/memberScheduler";

// 리포트·알림 실행 방식 선택·전체 일시정지/재개(v1.15, 2026-10-20 — 기준: youtube-auto-reply·threads). 지침: 루트 docs/SCHEDULER_POLICY.md
const service = () => createAdminClient() as unknown as SupabaseClient;

export async function setScheduledPublishingMode(mode: SchedulerMode): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (mode !== "vercel" && mode !== "cronjob") throw new Error("지원하지 않는 실행 방식입니다.");
    const user = await requireProgramAccess();
    await setMemberSchedulerMode(service(), user.id, mode);
    revalidatePath("/settings");
    revalidatePath("/watchlist");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "실행 방식을 바꾸지 못했습니다." };
  }
}

export async function pauseScheduledPublishing(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireProgramAccess();
    await pauseMemberScheduler(service(), user.id);
    revalidatePath("/settings");
    revalidatePath("/watchlist");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "일시정지하지 못했습니다." };
  }
}

export async function resumeScheduledPublishing(): Promise<{ ok: true; started: boolean } | { ok: false; error: string }> {
  try {
    const user = await requireProgramAccess();
    const result = await resumeMemberScheduler(service(), user.id);
    revalidatePath("/settings");
    revalidatePath("/watchlist");
    return { ok: true, started: result.started };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "재개하지 못했습니다." };
  }
}
