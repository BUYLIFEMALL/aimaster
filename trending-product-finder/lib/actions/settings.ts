"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_LABELS } from "@/lib/apiKeyLabels";
import type { ApiKeyProvider } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { CRONJOB_PROVIDER, ensureMemberSchedulerRunning, memberSchedulerMode, remainingScheduled, removeMemberScheduler } from "@/lib/schedulerMember/memberScheduler";

// PROVIDER_LABELS(=ApiKeyProvider 전체 union)에서 직접 뽑아 쓴다 — 예전에 이 배열을
// 별도로 하드코딩해뒀다가 naver_ads_*/aliexpress_*/domeggook_api_key가 추가된 뒤에도
// 갱신이 안 돼서, 설정 페이지에 그 항목들이 노출되는데도 저장 버튼을 누르면 전부
// "잘못된 provider입니다" 에러로 막히는 버그가 있었다(2026-09-01, 도매매 키 저장
// 시도 중 발견). 다시는 이렇게 벌어지지 않도록 라벨 목록에서 자동으로 유도한다.
const VALID_PROVIDERS: ApiKeyProvider[] = Object.keys(PROVIDER_LABELS) as ApiKeyProvider[];

export interface SaveApiKeyState {
  error?: string;
}

export async function saveApiKeyAction(formData: FormData): Promise<SaveApiKeyState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const provider = String(formData.get("provider") ?? "") as ApiKeyProvider;
  const apiKey = String(formData.get("apiKey") ?? "").trim();

  if (!VALID_PROVIDERS.includes(provider)) {
    return { error: "잘못된 provider입니다." };
  }
  if (!apiKey) {
    return { error: "API 키를 입력해주세요." };
  }

  // cron-job.org 키를 바꾸면 예전 계정의 회원 작업을 지운다(방식·일시정지 유지, v1.15)
  const service = createAdminClient() as unknown as SupabaseClient;
  if (provider === CRONJOB_PROVIDER) await removeMemberScheduler(service, user.id, { keepMode: true });
  const { error } = await supabase
    .from("user_api_keys")
    .upsert({ user_id: user.id, provider, api_key: apiKey }, { onConflict: "user_id,provider" });
  if (error) return { error: error.message };
  // 「내 cron-job.org」 회원이고 켜진 정기 작업이 있으면 새 키 계정에 작업을 다시 켠다
  if (provider === CRONJOB_PROVIDER && (await memberSchedulerMode(service, user.id)) === "cronjob" && (await remainingScheduled(service, user.id)) > 0) {
    try { await ensureMemberSchedulerRunning(service, user.id, apiKey); } catch (err) { return { error: `키는 저장했지만 리포트·알림 작업을 켜지 못했습니다. ${err instanceof Error ? err.message : ""}`.trim() }; }
  }

  revalidatePath("/settings");
  return {};
}

export async function deleteApiKeyAction(formData: FormData) {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const provider = String(formData.get("provider") ?? "") as ApiKeyProvider;
  // cron-job.org 키를 지우면 회원 작업·연결도 정리하고 실행 방식을 기본(Vercel)으로 되돌린다(v1.15). 키를 지우기 전에 해야 작업을 찾을 수 있다.
  if (provider === CRONJOB_PROVIDER) await removeMemberScheduler(createAdminClient() as unknown as SupabaseClient, user.id);

  await supabase.from("user_api_keys").delete().eq("user_id", user.id).eq("provider", provider);
  revalidatePath("/settings");
}
