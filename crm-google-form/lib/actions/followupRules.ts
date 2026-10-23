"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureMemberSchedulerRunning, memberCronjobKey, memberSchedulerMode, platformSchedulerEnabled, stopMemberSchedulerIfIdle } from "@/lib/schedulerMember/memberScheduler";

/**
 * 규칙을 켜거나(만들기 포함) 끄거나 지운 뒤 회원 cron-job.org 작업을 맞춘다(v1.10, 기준 booking-reminder v1.21). 지침: 루트 docs/SCHEDULER_POLICY.md
 * 켤 때 준비가 안 됐으면(키 없음·작업 켜기 실패·Vercel 꺼짐) 규칙을 다시 끄고 안내 문구를 돌려준다. 끌 때는 켜진 규칙이 0개면 작업을 끈다.
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
        error = `팔로우업 발송 작업을 켜지 못했습니다. ${err instanceof Error ? err.message : ""}`.trim();
      }
    }
  } else if (!platformSchedulerEnabled()) {
    error = "이 사이트는 Vercel 예약 호출이 꺼져 있습니다. 설정 → ⏰ 예약 발행에서 「내 cron-job.org」를 선택하고 키를 등록해 주세요.";
  }
  if (error) await service.from("crm_followup_rules").update({ is_active: false }).eq("id", ruleId).eq("user_id", userId);
  return error;
}

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
  const { data: created, error } = await supabase.from("crm_followup_rules").insert({
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
  }).select("id").single();

  if (error) return { error: error.message };

  const syncError = await syncMemberScheduler(user.id, created.id, true);
  revalidatePath("/sources");
  return syncError ? { error: `규칙은 만들었지만 꺼 두었습니다. ${syncError}` } : {};
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
  const syncError = await syncMemberScheduler(user.id, ruleId, isActive);
  revalidatePath("/sources");
  return syncError ? { error: `규칙을 켜지 못해 다시 꺼 두었습니다. ${syncError}` } : {};
}

export async function deleteFollowupRuleAction(ruleId: string): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { error } = await supabase.from("crm_followup_rules").delete().eq("id", ruleId).eq("user_id", user.id);

  if (error) return { error: error.message };
  await syncMemberScheduler(user.id, ruleId, false);
  revalidatePath("/sources");
  return {};
}
