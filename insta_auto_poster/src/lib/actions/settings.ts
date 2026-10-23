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
  "anthropic",
  "gemini",
  "perplexity",
  "meta_app_id",
  "meta_app_secret",
  "facebook_app_id",
  "facebook_app_secret",
  "cronjob_org_api_key",
  "apify",
  "pixabay",
  "pexels",
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
  // 2026-10-17: 앱 ID 끝자리가 빠진 채 저장돼 Instagram "Invalid platform app"이 난 사례 — Meta 앱 ID(숫자 15~16자리)·시크릿(영문·숫자 32자) 형식 확인
  if (/_app_id$/.test(provider) && !/^\d{15,16}$/.test(apiKey)) {
    return { error: `앱 ID는 숫자 15~16자리입니다(입력 ${apiKey.length}자). 빠진 자리나 공백이 없는지 확인해주세요.` };
  }
  if (/_app_secret$/.test(provider) && !/^[0-9a-f]{32}$/i.test(apiKey)) {
    return { error: `앱 시크릿 코드는 영문·숫자 32자입니다(입력 ${apiKey.length}자). Meta 화면의 [표시]를 눌러 전체를 복사해주세요.` };
  }

  const supabase = await createClient();
  // cron-job.org 키를 바꾸면 예전 계정의 회원 작업을 지우고(방식·일시정지 유지), 「내 cron-job.org」 회원이면 남은 예약이 있을 때 새 계정에 다시 켠다(v1.25).
  const service = createAdminClient() as unknown as SupabaseClient;
  if (provider === CRONJOB_PROVIDER) await removeMemberScheduler(service, user.id, { keepMode: true });
  const { error } = await supabase
    .from("user_api_keys")
    .upsert({ user_id: user.id, provider, api_key: apiKey }, { onConflict: "user_id,provider" });

  if (error) {
    return { error: error.message };
  }
  if (provider === CRONJOB_PROVIDER && (await memberSchedulerMode(service, user.id)) === "cronjob") {
    const { count } = await service.from("insta_posts").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "scheduled");
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
  // cron-job.org 키를 지우면 회원 작업·연결도 정리하고, 운영에선 실행 방식을 기본(Vercel)으로 되돌린다(v1.25).
  if (provider === CRONJOB_PROVIDER) await removeMemberScheduler(createAdminClient() as unknown as SupabaseClient, user.id);

  await supabase
    .from("user_api_keys")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", provider);

  revalidatePath("/settings");
}
