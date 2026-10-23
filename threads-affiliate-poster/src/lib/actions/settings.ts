"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import type { ApiKeyProvider } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { CRONJOB_PROVIDER, ensureMemberSchedulerRunning, memberCronjobKey, memberSchedulerMode, removeMemberScheduler } from "@/lib/posts/memberScheduler";

export interface SaveApiKeyState {
  error?: string;
  success?: boolean;
}

const VALID_PROVIDERS: ApiKeyProvider[] = [
  "openai",
  "gemini",
  "anthropic", // v1.64: 설정 화면에 칸이 있는데 목록에 없어 저장이 막혀 있었음
  "replicate",
  "threads_app_id",
  "threads_app_secret",
  "naver_client_id",
  "naver_client_secret",
  "coupang_access_key",
  "coupang_secret_key",
  "aliexpress_app_key",
  "aliexpress_app_secret",
  "aliexpress_tracking_id",
  "toss_access_key",
  "toss_secret_key",
  "toss_publisher_id",
  "cronjob_org_api_key",
];

export async function saveApiKeyAction(
  _prevState: SaveApiKeyState,
  formData: FormData,
): Promise<SaveApiKeyState> {
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
  // cron-job.org 키를 바꾸면 예전 계정의 회원 작업을 지우고(방식·일시정지 유지), 「내 cron-job.org」 회원이면 남은 예약이 있을 때 새 계정에 다시 켠다(v1.63).
  const service = createAdminClient() as unknown as SupabaseClient;
  if (provider === CRONJOB_PROVIDER) await removeMemberScheduler(service, user.id, { keepMode: true });
  const { error } = await supabase
    .from("user_api_keys")
    .upsert({ user_id: user.id, provider, api_key: apiKey }, { onConflict: "user_id,provider" });

  if (error) {
    return { error: error.message };
  }
  if (provider === CRONJOB_PROVIDER && (await memberSchedulerMode(service, user.id)) === "cronjob") {
    const { count } = await service.from("tap_posts").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "scheduled");
    const key = await memberCronjobKey(service, user.id);
    if ((count ?? 0) > 0 && key) {
      try { await ensureMemberSchedulerRunning(service, user.id, key); } catch (err) { return { error: `키는 저장했지만 예약 실행 작업을 켜지 못했습니다. ${err instanceof Error ? err.message : ""}`.trim() }; }
    }
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function deleteApiKeyAction(formData: FormData) {
  const user = await requireProgramAccess();
  const provider = String(formData.get("provider")) as ApiKeyProvider;
  const supabase = await createClient();
  // cron-job.org 키를 지우면 회원 작업·연결도 정리하고, 운영에선 실행 방식을 기본(Vercel)으로 되돌린다(v1.63).
  if (provider === CRONJOB_PROVIDER) await removeMemberScheduler(createAdminClient() as unknown as SupabaseClient, user.id);

  await supabase
    .from("user_api_keys")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", provider);

  revalidatePath("/settings");
}
