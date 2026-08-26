"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { normalizeUrl } from "@/lib/normalizeUrl";
import { DEFAULT_REPLY_MODEL, REPLY_MODEL_OPTIONS } from "@/lib/ai/models";
import { DEFAULT_DISCLOSURE_MESSAGE } from "@/lib/dmDefaults";
import type { ApiKeyProvider } from "@/types/database.types";

const VALID_PROVIDERS: ApiKeyProvider[] = ["meta_app_id", "meta_app_secret", "openai", "anthropic", "gemini"];

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

/** DM 기본 링크 + AI 답장 톤 커스텀 지시문 + 고지 문구를 저장한다. */
export async function saveReplySettingsAction(formData: FormData): Promise<SaveReplySettingsState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const defaultLink = normalizeUrl(String(formData.get("defaultLink") ?? ""));
  const aiInstructions = String(formData.get("aiInstructions") ?? "").trim();
  const tonePreset = String(formData.get("tonePreset") ?? "").trim();
  const replyModelInput = String(formData.get("replyModel") ?? "").trim();
  const replyModel = REPLY_MODEL_OPTIONS.some((o) => o.value === replyModelInput) ? replyModelInput : DEFAULT_REPLY_MODEL;
  const disclosureMessageInput = String(formData.get("disclosureMessage") ?? "").trim();
  const disclosureMessage = disclosureMessageInput || DEFAULT_DISCLOSURE_MESSAGE;

  const { error } = await supabase.from("dm_settings").upsert(
    {
      user_id: user.id,
      default_link: defaultLink,
      ai_instructions: aiInstructions || null,
      tone_preset: tonePreset || null,
      reply_model: replyModel,
      disclosure_message: disclosureMessage,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: true };
}

/**
 * "봇 활성화" — 계정 연결과 별개로, 실제로 수신 DM에 응답을 시작할지를 사용자가 명시적으로
 * 켜야 한다(youtube-auto-reply/instagram-comment-reply의 "예약 모니터링 시작"과 같은 안전장치
 * 철학). bot_started_at은 "이 시점 이후 수신 메시지만 처리"하는 커트오프로 쓴다.
 */
export interface SetBotEnabledState {
  error?: string;
}

export async function setBotEnabledAction(enabled: boolean): Promise<SetBotEnabledState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { error } = await supabase.from("dm_settings").upsert(
    {
      user_id: user.id,
      bot_enabled: enabled,
      bot_started_at: enabled ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/conversations");
  return {};
}

/**
 * (선택, 고급) 자동 발송 — 켜면 새 DM에 대해 사람 검토 없이 AI 초안을 바로 발송한다.
 * Meta 정책상으로는 DM 자동 응답 자체가 허용되지만(고지 의무만 있음), 이 저장소는 기본값을
 * "검토 후 발송"으로 정했다 — 반드시 사용자가 설정 화면에서 명시적으로 켠 경우에만 동작해야
 * 한다(AGENTS.md 참고).
 */
export async function setAutoApproveAction(enabled: boolean) {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  await supabase
    .from("dm_settings")
    .upsert({ user_id: user.id, auto_approve: enabled, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

  revalidatePath("/settings");
  revalidatePath("/conversations");
}
