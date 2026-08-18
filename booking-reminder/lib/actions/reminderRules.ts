"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export interface ReminderRuleActionState {
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
  const offsetValue = Number(formData.get("offsetValue"));
  const offsetUnit = String(formData.get("offsetUnit") ?? "hours"); // "minutes" | "hours" | "days"
  const offsetDirection = String(formData.get("offsetDirection") ?? "before"); // "before" | "after"
  const messageText = String(formData.get("messageText") ?? "").trim();
  const messageSubject = String(formData.get("messageSubject") ?? "").trim() || null;
  const kakaoTemplateId = String(formData.get("kakaoTemplateId") ?? "").trim() || null;
  const kakaoVariables = parseKakaoVariables(String(formData.get("kakaoVariables") ?? ""));

  const unitMinutes = offsetUnit === "days" ? 1440 : offsetUnit === "hours" ? 60 : 1;
  const magnitude = Math.abs(offsetValue) * unitMinutes;
  const offsetMinutes = offsetDirection === "before" ? -magnitude : magnitude;

  return {
    name,
    offsetMinutes,
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

export async function createReminderRuleAction(formData: FormData): Promise<ReminderRuleActionState> {
  const user = await requireProgramAccess();
  const payload = readRulePayload(formData);

  if (!payload.name) return { error: "규칙 이름을 입력해주세요." };
  if (!payload.offsetMinutes) return { error: "예약일시 기준 며칠/몇 시간 전(후)인지 입력해주세요." };
  if (!payload.messageText) return { error: "발송할 메시지 내용을 입력해주세요." };

  const supabase = await createClient();
  const { error } = await supabase.from("booking_reminder_rules").insert({
    user_id: user.id,
    name: payload.name,
    offset_minutes: payload.offsetMinutes,
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

  revalidatePath("/reservations");
  return {};
}

export async function updateReminderRuleAction(
  ruleId: string,
  formData: FormData,
): Promise<ReminderRuleActionState> {
  const user = await requireProgramAccess();
  const payload = readRulePayload(formData);

  if (!payload.name) return { error: "규칙 이름을 입력해주세요." };
  if (!payload.offsetMinutes) return { error: "예약일시 기준 며칠/몇 시간 전(후)인지 입력해주세요." };
  if (!payload.messageText) return { error: "발송할 메시지 내용을 입력해주세요." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("booking_reminder_rules")
    .update({
      name: payload.name,
      offset_minutes: payload.offsetMinutes,
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

  revalidatePath("/reservations");
  return {};
}

export async function toggleReminderRuleActiveAction(ruleId: string, isActive: boolean): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { error } = await supabase
    .from("booking_reminder_rules")
    .update({ is_active: isActive })
    .eq("id", ruleId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/reservations");
  return {};
}

export async function deleteReminderRuleAction(ruleId: string): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { error } = await supabase.from("booking_reminder_rules").delete().eq("id", ruleId).eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/reservations");
  return {};
}
