"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireProgramAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { CRONJOB_PROVIDER, ensureMemberSchedulerRunning, memberSchedulerMode, remainingScheduled, removeMemberScheduler } from "@/lib/schedulerMember/memberScheduler";

// cron-job.org API 키(공용 연동 키 `cronjob_org_api_key`) 저장·삭제(v1.21). 이 프로그램은 다른 API 키를 쓰지 않아 이 키만 다룬다.
// 키는 공용 user_api_keys에 회원별로 저장 — 다른 프로그램에서 넣었으면 그대로 「등록됨」(회원 연동 정보 공용 저장 규칙). 지침: 루트 docs/SCHEDULER_POLICY.md
export interface SaveApiKeyState {
  error?: string;
  success?: boolean;
}

const service = () => createAdminClient() as unknown as SupabaseClient;

export async function saveCronjobKeyAction(formData: FormData): Promise<SaveApiKeyState> {
  const user = await requireProgramAccess();
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  if (!apiKey) return { error: "API 키를 입력해주세요." };
  const svc = service();
  // 키를 바꾸면 예전 계정의 회원 작업을 지운다(방식·일시정지 유지)
  await removeMemberScheduler(svc, user.id, { keepMode: true });
  const { error } = await svc.from("user_api_keys").upsert({ user_id: user.id, provider: CRONJOB_PROVIDER, api_key: apiKey }, { onConflict: "user_id,provider" });
  if (error) return { error: error.message };
  // 「내 cron-job.org」 회원이고 켜진 규칙이 있으면 새 키 계정에 작업을 다시 켠다
  if ((await memberSchedulerMode(svc, user.id)) === "cronjob" && (await remainingScheduled(svc, user.id)) > 0) {
    try { await ensureMemberSchedulerRunning(svc, user.id, apiKey); } catch (err) { return { error: `키는 저장했지만 리마인드 발송 작업을 켜지 못했습니다. ${err instanceof Error ? err.message : ""}`.trim() }; }
  }
  revalidatePath("/settings");
  return { success: true };
}

export async function deleteCronjobKeyAction(): Promise<void> {
  const user = await requireProgramAccess();
  const svc = service();
  // 회원 작업·연결도 정리하고 실행 방식을 기본(Vercel)으로 되돌린다. 키를 지우기 전에 해야 작업을 찾을 수 있다.
  await removeMemberScheduler(svc, user.id);
  await svc.from("user_api_keys").delete().eq("user_id", user.id).eq("provider", CRONJOB_PROVIDER);
  revalidatePath("/settings");
}
