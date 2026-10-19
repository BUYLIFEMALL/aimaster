"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import type { ApiKeyProvider } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { CRONJOB_PROVIDER, ensureMemberSchedulerRunning, memberSchedulerMode, remainingScheduled, removeMemberScheduler } from "@/lib/schedulerMember/memberScheduler";

export interface SaveApiKeyState {
  error?: string;
  success?: boolean;
}

const VALID_PROVIDERS: ApiKeyProvider[] = ["openai", "gemini", "cronjob_org_api_key"]; // v1.21: cron-job.org 공용 연동 키

// React 18(useFormState/useActionState 미탑재 버전)이라 prevState 없이 클라이언트에서
// 직접 호출하는 형태로 둔다 (components/settings/ApiKeyRow.tsx 참고).
export async function saveApiKeyAction(formData: FormData): Promise<SaveApiKeyState> {
  const user = await requireProgramAccess();
  const provider = String(formData.get("provider")) as ApiKeyProvider;
  const apiKey = String(formData.get("apiKey") ?? "").trim();

  if (!VALID_PROVIDERS.includes(provider)) {
    return { error: "알 수 없는 provider입니다." };
  }
  if (!apiKey) {
    return { error: "API 키를 입력해주세요." };
  }

  const supabase = await createClient();
  // cron-job.org 키를 바꾸면 예전 계정의 회원 작업을 지운다(방식·일시정지 유지, v1.21)
  const service = createAdminClient() as unknown as SupabaseClient;
  if (provider === CRONJOB_PROVIDER) await removeMemberScheduler(service, user.id, { keepMode: true });
  const { error } = await supabase
    .from("user_api_keys")
    .upsert({ user_id: user.id, provider, api_key: apiKey }, { onConflict: "user_id,provider" });

  if (error) {
    return { error: error.message };
  }
  // 「내 cron-job.org」 회원이고 보낼 캠페인이 남아 있으면 새 키 계정에 작업을 다시 켠다
  if (provider === CRONJOB_PROVIDER && (await memberSchedulerMode(service, user.id)) === "cronjob" && (await remainingScheduled(service, user.id)) > 0) {
    try { await ensureMemberSchedulerRunning(service, user.id, apiKey); } catch (err) { return { error: `키는 저장했지만 예약 발송 작업을 켜지 못했습니다. ${err instanceof Error ? err.message : ""}`.trim() }; }
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function deleteApiKeyAction(formData: FormData) {
  const user = await requireProgramAccess();
  const provider = String(formData.get("provider")) as ApiKeyProvider;
  const supabase = await createClient();
  // cron-job.org 키를 지우면 회원 작업·연결도 정리하고 실행 방식을 기본(Vercel)으로 되돌린다(v1.21). 키를 지우기 전에 해야 작업을 찾을 수 있다.
  if (provider === CRONJOB_PROVIDER) await removeMemberScheduler(createAdminClient() as unknown as SupabaseClient, user.id);

  await supabase
    .from("user_api_keys")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", provider);

  revalidatePath("/settings");
}
