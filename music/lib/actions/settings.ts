"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { checkSunoCredits } from "@/lib/ai/suno";
import type { ApiKeyProvider } from "@/types/database.types";

export interface SaveApiKeyState {
  error?: string;
  success?: boolean;
}

const VALID_PROVIDERS: ApiKeyProvider[] = ["openai", "suno", "gemini"];

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
  const { error } = await supabase
    .from("user_api_keys")
    .upsert({ user_id: user.id, provider, api_key: apiKey }, { onConflict: "user_id,provider" });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function deleteApiKeyAction(formData: FormData) {
  const user = await requireProgramAccess();
  const provider = String(formData.get("provider")) as ApiKeyProvider;
  const supabase = await createClient();

  await supabase
    .from("user_api_keys")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", provider);

  revalidatePath("/settings");
}

export interface CheckSunoCreditsState {
  error?: string;
  credits?: number;
}

/** Suno 크레딧(잔여 생성 가능 횟수) 조회 — Phase 3 예정 항목. 곡 생성과 무관한 단순 조회다. */
export async function checkSunoCreditsAction(): Promise<CheckSunoCreditsState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const sunoKey = await resolveApiKey(supabase, user.id, "suno");
  if (!sunoKey) {
    return { error: "Suno API 키가 없습니다. 위에서 본인의 Suno API 키를 먼저 등록해주세요." };
  }

  try {
    const credits = await checkSunoCredits(sunoKey);
    return { credits };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "크레딧 조회 중 오류가 발생했습니다." };
  }
}
