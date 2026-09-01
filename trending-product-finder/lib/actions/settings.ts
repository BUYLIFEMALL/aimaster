"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_LABELS } from "@/lib/apiKeyLabels";
import type { ApiKeyProvider } from "@/types/database.types";

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

  const { error } = await supabase
    .from("user_api_keys")
    .upsert({ user_id: user.id, provider, api_key: apiKey }, { onConflict: "user_id,provider" });
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return {};
}

export async function deleteApiKeyAction(formData: FormData) {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const provider = String(formData.get("provider") ?? "") as ApiKeyProvider;

  await supabase.from("user_api_keys").delete().eq("user_id", user.id).eq("provider", provider);
  revalidatePath("/settings");
}
