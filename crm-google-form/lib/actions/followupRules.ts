"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export interface FollowupRuleActionState {
  error?: string;
}

function parseKakaoVariables(raw: string): Record<string, string> {
  const variables: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const [key, ...rest] = line.split("=");
    const trimmedKey = key?.trim();
    const value = rest.join("=").trim();
    if (trimmedKey && value) variables[trimmedKey] = value;
  }
  return variables;
}

function readRulePayload(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const daysAfter = Number(formData.get("daysAfter"));
  const messageText = String(formData.get("messageText") ?? "").trim();
  const messageSubject = String(formData.get("messageSubject") ?? "").trim() || null;
  const kakaoTemplateId = String(formData.get("kakaoTemplateId") ?? "").trim() || null;
  const kakaoVariables = parseKakaoVariables(String(formData.get("kakaoVariables") ?? ""));

  return {
    name,
    daysAfter,
    messageText,
    messageSubject,
    kakaoTemplateId,
    kakaoVariables,
    channelEmail: formData.get("channelEmail") === "on",
    channelSms: formData.get("channelSms") === "on",
    channelAlimtalk: formData.get("channelAlimtalk") === "on",
    channelFriendtalk: formData.get("channelFriendtalk") === "on",
  };
}

export async function createFollowupRuleAction(
  formSourceId: string,
  formData: FormData,
): Promise<FollowupRuleActionState> {
  const user = await requireProgramAccess();
  const payload = readRulePayload(formData);

  if (!payload.name) return { error: "규칙 이름을 입력해주세요." };
  if (!payload.daysAfter || payload.daysAfter <= 0) return { error: "며칠 후 발송할지 입력해주세요." };
  if (!payload.messageText) return { error: "발송할 메시지 내용을 입력해주세요." };

  const supabase = await createClient();
  const { error } = await supabase.from("crm_followup_rules").insert({
    user_id: user.id,
    form_source_id: formSourceId,
    name: payload.name,
    days_after: payload.daysAfter,
    channel_email: payload.channelEmail,
    channel_sms: payload.channelSms,
    channel_alimtalk: payload.channelAlimtalk,
    channel_friendtalk: payload.channelFriendtalk,
    message_subject: payload.messageSubject,
    message_text: payload.messageText,
    kakao_template_id: payload.kakaoTemplateId,
    kakao_variables: payload.kakaoVariables,
  });

  if (error) return { error: error.message };

  revalidatePath("/sources");
  return {};
}

export async function updateFollowupRuleAction(
  ruleId: string,
  formData: FormData,
): Promise<FollowupRuleActionState> {
  const user = await requireProgramAccess();
  const payload = readRulePayload(formData);

  if (!payload.name) return { error: "규칙 이름을 입력해주세요." };
  if (!payload.daysAfter || payload.daysAfter <= 0) return { error: "며칠 후 발송할지 입력해주세요." };
  if (!payload.messageText) return { error: "발송할 메시지 내용을 입력해주세요." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_followup_rules")
    .update({
      name: payload.name,
      days_after: payload.daysAfter,
      channel_email: payload.channelEmail,
      channel_sms: payload.channelSms,
      channel_alimtalk: payload.channelAlimtalk,
      channel_friendtalk: payload.channelFriendtalk,
      message_subject: payload.messageSubject,
      message_text: payload.messageText,
      kakao_template_id: payload.kakaoTemplateId,
      kakao_variables: payload.kakaoVariables,
    })
    .eq("id", ruleId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/sources");
  return {};
}

export async function toggleFollowupRuleActiveAction(ruleId: string, isActive: boolean): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { error } = await supabase
    .from("crm_followup_rules")
    .update({ is_active: isActive })
    .eq("id", ruleId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/sources");
  return {};
}

export async function deleteFollowupRuleAction(ruleId: string): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { error } = await supabase.from("crm_followup_rules").delete().eq("id", ruleId).eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/sources");
  return {};
}
