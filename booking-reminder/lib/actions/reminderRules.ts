"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureMemberSchedulerRunning, memberCronjobKey, memberSchedulerMode, platformSchedulerEnabled, stopMemberSchedulerIfIdle } from "@/lib/schedulerMember/memberScheduler";

/**
 * 리마인드 규칙이 켜지거나 꺼진 뒤 회원 실행 작업 맞추기(v1.21, 지침 docs/SCHEDULER_POLICY.md).
 * 켰을 때: 고른 방식이 준비 안 됐거나(키 없음·Vercel 꺼짐) cron-job.org 작업을 켜지 못하면 그 규칙을 다시 끄고 안내를 돌려준다
 * (「켜졌는데 안 나가는」 상태를 만들지 않음). 껐을 때: 켜진 규칙이 없으면 회원 작업을 끈다.
 */
async function syncMemberScheduler(userId: string, ruleId: string, enabledNow: boolean): Promise<string | null> {
  const service = createAdminClient() as unknown as SupabaseClient;
  const mode = await memberSchedulerMode(service, userId);
  if (!enabledNow) {
    if (mode === "cronjob") await stopMemberSchedulerIfIdle(service, userId).catch(() => false);
    return null;
  }
  let error: string | null = null;
  if (mode === "cronjob") {
    const key = await memberCronjobKey(service, userId);
    if (!key) error = "「내 cron-job.org」 방식은 API 키가 필요합니다. 설정 → ⏰ 예약 발행에서 키를 등록하거나 AIMaster 기본(Vercel) 방식을 선택해 주세요.";
    else {
      try {
        await ensureMemberSchedulerRunning(service, userId, key);
      } catch (err) {
        error = `리마인드 발송 작업을 켜지 못했습니다. ${err instanceof Error ? err.message : ""}`.trim();
      }
    }
  } else if (!platformSchedulerEnabled()) {
    error = "이 사이트는 Vercel 예약 호출이 꺼져 있습니다. 설정 → ⏰ 예약 발행에서 「내 cron-job.org」를 선택하고 키를 등록해 주세요.";
  }
  if (error) await service.from("booking_reminder_rules").update({ is_active: false }).eq("id", ruleId).eq("user_id", userId);
  return error;
}


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
  const { data: created, error } = await supabase.from("booking_reminder_rules").insert({
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
  }).select("id").single();

  if (error) return { error: error.message };

  const syncError = await syncMemberScheduler(user.id, created.id, true);
  revalidatePath("/reservations");
  return syncError ? { error: `규칙은 만들었지만 꺼 두었습니다. ${syncError}` } : {};
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
  const syncError = await syncMemberScheduler(user.id, ruleId, isActive);
  revalidatePath("/reservations");
  return syncError ? { error: `규칙을 켜지 못해 다시 꺼 두었습니다. ${syncError}` } : {};
}

export async function deleteReminderRuleAction(ruleId: string): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { error } = await supabase.from("booking_reminder_rules").delete().eq("id", ruleId).eq("user_id", user.id);

  if (error) return { error: error.message };
  await syncMemberScheduler(user.id, ruleId, false);
  revalidatePath("/reservations");
  return {};
}
