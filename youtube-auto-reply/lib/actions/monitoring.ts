"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

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
  const startFrom = startFromInput ? new Date(startFromInput) : new Date();
  if (Number.isNaN(startFrom.getTime())) return { error: "시작 시점이 올바르지 않습니다." };

  const { error } = await supabase.from("ytreply_settings").upsert(
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

  revalidatePath("/settings");
  return {};
}

export async function stopMonitoringAction() {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  await supabase
    .from("ytreply_settings")
    .update({ monitoring_enabled: false })
    .eq("user_id", user.id);
  revalidatePath("/settings");
}
