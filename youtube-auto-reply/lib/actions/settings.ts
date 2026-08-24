"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { normalizeUrl } from "@/lib/normalizeUrl";
import type { ApiKeyProvider } from "@/types/database.types";

const VALID_PROVIDERS: ApiKeyProvider[] = ["google_client_id", "google_client_secret", "openai"];

export interface SaveApiKeyState {
  error?: string;
}

export async function saveApiKeyAction(formData: FormData): Promise<SaveApiKeyState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const provider = String(formData.get("provider") ?? "") as ApiKeyProvider;
  const apiKey = String(formData.get("apiKey") ?? "").trim();

  if (!VALID_PROVIDERS.includes(provider)) return { error: "잘못된 provider입니다." };
  if (!apiKey) return { error: "API 키를 입력해주세요." };

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

export interface SaveReplySettingsState {
  error?: string;
  success?: boolean;
}

/** 채널 기본 링크 + AI 답글 톤 커스텀 지시문을 저장한다. */
export async function saveReplySettingsAction(formData: FormData): Promise<SaveReplySettingsState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const defaultLink = normalizeUrl(String(formData.get("defaultLink") ?? ""));
  const aiInstructions = String(formData.get("aiInstructions") ?? "").trim();
  const tonePreset = String(formData.get("tonePreset") ?? "").trim();

  const { error } = await supabase.from("ytreply_settings").upsert(
    {
      user_id: user.id,
      default_link: defaultLink,
      ai_instructions: aiInstructions || null,
      tone_preset: tonePreset || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: true };
}
