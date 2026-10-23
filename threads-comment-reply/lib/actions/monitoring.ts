"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureMemberSchedulerRunning, memberCronjobKey, memberSchedulerMode, platformSchedulerEnabled, stopMemberSchedulerIfIdle } from "@/lib/schedulerMember/memberScheduler";

export interface StartMonitoringState {
  error?: string;
}

/**
 * 예약 모니터링을 켠다. monitoring_started_at을 "이 시점 이후 댓글만 자동 처리" 기준으로
 * 저장한다 — 기본은 지금 이 순간이지만, 사용자가 폼에서 다른 시점을 고를 수도 있다.
 * last_run_at은 비워서(null) 켜자마자 첫 점검이 바로 실행되게 한다.
 */
export async function startMonitoringAction(formData: FormData): Promise<StartMonitoringState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const intervalMinutes = Number(formData.get("intervalMinutes"));
  const startFromInput = String(formData.get("startFrom") ?? "").trim();
  // v1.26: 화면의 datetime-local 값(예: 2026-10-23T04:06)은 시간대 없는 한국 시간이다. 서버(UTC)가 그대로 읽으면 9시간 늦게 저장돼
  // 켠 뒤 9시간 동안 달린 댓글을 건너뛰었다 → 시간대가 없으면 +09:00을 붙여 읽는다.
  const startFrom = startFromInput
    ? new Date(/(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(startFromInput) ? startFromInput : `${startFromInput}+09:00`)
    : new Date();
  if (Number.isNaN(startFrom.getTime())) return { error: "시작 시점이 올바르지 않습니다." };

  const { error } = await supabase.from("th_settings").upsert(
    {
      user_id: user.id,
      monitoring_enabled: true,
      monitoring_interval_minutes: intervalMinutes,
      monitoring_started_at: startFrom.toISOString(),
      last_run_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return { error: error.message };

  // 실행 방식 맞추기(v1.26, 지침 docs/SCHEDULER_POLICY.md): 「내 cron-job.org」면 작업을 켠다. 준비가 안 됐으면 모니터링을 다시 끄고 안내한다.
  const service = createAdminClient() as unknown as SupabaseClient;
  let syncError: string | null = null;
  if ((await memberSchedulerMode(service, user.id)) === "cronjob") {
    const key = await memberCronjobKey(service, user.id);
    if (!key) syncError = "「내 cron-job.org」 방식은 API 키가 필요합니다. 아래 ⏰ 예약 발행에서 키를 등록하거나 AIMaster 기본(Vercel) 방식을 선택해 주세요.";
    else {
      try { await ensureMemberSchedulerRunning(service, user.id, key); } catch (err) { syncError = `댓글 모니터링 작업을 켜지 못했습니다. ${err instanceof Error ? err.message : ""}`.trim(); }
    }
  } else if (!platformSchedulerEnabled()) {
    syncError = "이 사이트는 Vercel 예약 호출이 꺼져 있습니다. 아래 ⏰ 예약 발행에서 「내 cron-job.org」를 선택하고 키를 등록해 주세요.";
  }
  if (syncError) {
    await supabase.from("th_settings").update({ monitoring_enabled: false }).eq("user_id", user.id);
    revalidatePath("/settings");
    return { error: `모니터링을 켜지 못해 다시 꺼 두었습니다. ${syncError}` };
  }

  revalidatePath("/settings");
  return {};
}

export async function stopMonitoringAction() {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  await supabase
    .from("th_settings")
    .update({ monitoring_enabled: false })
    .eq("user_id", user.id);
  // 「내 cron-job.org」면 작업도 끈다(v1.26)
  const service = createAdminClient() as unknown as SupabaseClient;
  if ((await memberSchedulerMode(service, user.id)) === "cronjob") await stopMemberSchedulerIfIdle(service, user.id).catch(() => false);
  revalidatePath("/settings");
}
