"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { normalizeUrl } from "@/lib/normalizeUrl";
import { DEFAULT_REPLY_MODEL, REPLY_MODEL_OPTIONS } from "@/lib/ai/models";
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
  const replyModelInput = String(formData.get("replyModel") ?? "").trim();
  const replyModel = REPLY_MODEL_OPTIONS.some((o) => o.value === replyModelInput) ? replyModelInput : DEFAULT_REPLY_MODEL;

  const { error } = await supabase.from("ytreply_settings").upsert(
    {
      user_id: user.id,
      default_link: defaultLink,
      ai_instructions: aiInstructions || null,
      tone_preset: tonePreset || null,
      reply_model: replyModel,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: true };
}

/**
 * (선택) 자동 게시 — 켜면 새 댓글에 대해 사람 검토 없이 AI 초안을 바로 게시한다.
 * 반드시 사용자가 설정 화면에서 명시적으로 켠 경우에만 동작해야 한다(AGENTS.md 7번 규칙).
 */
export async function setAutoApproveAction(enabled: boolean) {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  await supabase
    .from("ytreply_settings")
    .upsert({ user_id: user.id, auto_approve: enabled, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

  revalidatePath("/settings");
  revalidatePath("/comments");
}
