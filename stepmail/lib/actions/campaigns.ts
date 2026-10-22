"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { dispatchCampaign } from "@/lib/dispatch";
import type { CampaignChannel, CampaignRecurrence } from "@/types/database.types";
import { buildSmsText, smsBytes, LMS_MAX_BYTES } from "@/lib/sms";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureMemberSchedulerRunning, memberCronjobKey, memberSchedulerMode, platformSchedulerEnabled, stopMemberSchedulerIfIdle } from "@/lib/schedulerMember/memberScheduler";

/**
 * 캠페인이 켜지거나 꺼진 뒤 회원 실행 작업 맞추기(v1.21, 지침 docs/SCHEDULER_POLICY.md).
 * 켰을 때: 고른 방식이 준비 안 됐거나(키 없음·Vercel 꺼짐) cron-job.org 작업을 켜지 못하면 그 캠페인을 다시 끄고 안내를 돌려준다
 * (「켜졌는데 안 나가는」 상태를 만들지 않음). 껐을 때: 보낼 차례가 남은 켜진 캠페인이 없으면 회원 작업을 끈다.
 */
async function syncMemberScheduler(userId: string, campaignId: string, enabledNow: boolean): Promise<string | null> {
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
        error = `예약 발송 작업을 켜지 못했습니다. ${err instanceof Error ? err.message : ""}`.trim();
      }
    }
  } else if (!platformSchedulerEnabled()) {
    error = "이 사이트는 Vercel 예약 호출이 꺼져 있습니다. 설정 → ⏰ 예약 발행에서 「내 cron-job.org」를 선택하고 키를 등록해 주세요.";
  }
  if (error) await service.from("stepmail_campaigns").update({ is_active: false }).eq("id", campaignId).eq("user_id", userId);
  return error;
}


export interface CreateCampaignState {
  error?: string;
  campaignId?: string;
}

export async function createCampaignAction(formData: FormData): Promise<CreateCampaignState> {
  const user = await requireProgramAccess();

  const draftId = String(formData.get("draftId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const targetSendCount = Math.min(Math.max(Number(formData.get("targetSendCount")) || 0, 0), 4);
  const quantityPerRun = Math.min(Math.max(Number(formData.get("quantityPerRun")) || 50, 1), 500);
  const sendHour = Math.min(Math.max(Number(formData.get("sendHour")) || 9, 0), 23);
  const sendMinute = Math.min(Math.max(Number(formData.get("sendMinute")) || 0, 0), 59);
  const recurrence = String(formData.get("recurrence") ?? "once") as CampaignRecurrence;
  const weeklyDayRaw = formData.get("weeklyDay");
  const weeklyDay = recurrence === "weekly" && weeklyDayRaw != null ? Number(weeklyDayRaw) : null;
  const smtpAccountIds = formData.getAll("smtpAccountIds").map(String).filter(Boolean);
  // v1.27 문자(SMS·LMS) 차수 발송
  const channelInput = String(formData.get("channel") ?? "email");
  const channel: CampaignChannel = channelInput === "sms" || channelInput === "both" ? channelInput : "email";
  const wantsEmail = channel !== "sms";
  const wantsSms = channel !== "email";
  const smsText = String(formData.get("smsText") ?? "").trim();
  const smsOptout = String(formData.get("smsOptout") ?? "").trim();

  if (!name) return { error: "캠페인 이름을 입력해주세요." };
  if (wantsEmail && !draftId) return { error: "발송할 이메일 초안을 선택해주세요." };
  if (wantsEmail && smtpAccountIds.length === 0) return { error: "발송에 사용할 이메일 계정을 하나 이상 선택해주세요." };
  if (wantsSms && !smsText) return { error: "문자 본문을 입력해주세요." };
  if (wantsSms && !smsOptout) return { error: "광고 문자에는 무료 수신거부 안내가 꼭 필요합니다(예: 무료수신거부 080-000-0000)." };
  if (wantsSms && smsBytes(buildSmsText(smsText, smsOptout, "")) > LMS_MAX_BYTES) return { error: "문자가 너무 깁니다(2000바이트 이하)." };

  const supabase = await createClient();

  if (wantsEmail) {
    const { data: draft } = await supabase
      .from("stepmail_email_drafts")
      .select("id")
      .eq("id", draftId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!draft) return { error: "이메일 초안을 찾을 수 없습니다." };
  }
  if (wantsSms) {
    const { data: solapi } = await supabase.from("user_solapi_accounts").select("user_id").eq("user_id", user.id).maybeSingle();
    if (!solapi) return { error: "설정에서 본인 SOLAPI 문자 계정을 먼저 연결해 주세요." };
  }

  const { data: campaign, error } = await supabase
    .from("stepmail_campaigns")
    .insert({
      user_id: user.id,
      draft_id: wantsEmail ? draftId : null,
      channel,
      sms_text: wantsSms ? smsText : null,
      sms_optout: wantsSms ? smsOptout : null,
      name,
      target_send_count: targetSendCount,
      quantity_per_run: quantityPerRun,
      send_hour: sendHour,
      send_minute: sendMinute,
      recurrence,
      weekly_day: weeklyDay,
    })
    .select("id")
    .single();

  if (error || !campaign) return { error: error?.message ?? "캠페인 저장에 실패했습니다." };

  if (wantsEmail) {
    const links = smtpAccountIds.map((smtpAccountId, idx) => ({
      campaign_id: campaign.id,
      smtp_account_id: smtpAccountId,
      sort_order: idx,
    }));
    const { error: linkError } = await supabase.from("stepmail_campaign_smtp_accounts").insert(links);
    if (linkError) return { error: linkError.message };
  }

  const syncError = await syncMemberScheduler(user.id, campaign.id, true);
  revalidatePath("/campaigns");
  if (syncError) return { campaignId: campaign.id, error: `캠페인은 만들었지만 꺼 두었습니다. ${syncError}` };
  return { campaignId: campaign.id };
}

export async function toggleCampaignActiveAction(campaignId: string, isActive: boolean): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { error } = await supabase
    .from("stepmail_campaigns")
    .update({ is_active: isActive })
    .eq("id", campaignId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  const syncError = await syncMemberScheduler(user.id, campaignId, isActive);
  revalidatePath("/campaigns");
  return syncError ? { error: `캠페인을 켜지 못해 다시 꺼 두었습니다. ${syncError}` } : {};
}

export async function deleteCampaignAction(campaignId: string): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { error } = await supabase.from("stepmail_campaigns").delete().eq("id", campaignId).eq("user_id", user.id);
  if (error) return { error: error.message };
  await syncMemberScheduler(user.id, campaignId, false);
  revalidatePath("/campaigns");
  return {};
}

export interface RunCampaignNowState {
  error?: string;
  sentCount?: number;
  failedCount?: number;
}

/** "지금 실행" — 예약 시간을 기다리지 않고 캠페인을 즉시 1회 실행한다(테스트/긴급 발송용). */
export async function runCampaignNowAction(campaignId: string): Promise<RunCampaignNowState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: campaign, error: fetchError } = await supabase
    .from("stepmail_campaigns")
    .select("id, user_id, draft_id, target_send_count, quantity_per_run")
    .eq("id", campaignId)
    .eq("user_id", user.id)
    .single();
  if (fetchError || !campaign) return { error: "캠페인을 찾을 수 없습니다." };

  try {
    const result = await dispatchCampaign(supabase, campaign);
    await supabase.from("stepmail_campaigns").update({ last_run_at: new Date().toISOString() }).eq("id", campaignId);
    await logProgramUsage({
      userId: user.id,
      action: "run_campaign_manual",
      quantity: result.sentCount,
      metadata: { campaignId },
    });
    revalidatePath("/campaigns");
    revalidatePath("/leads");
    if (result.notice) return { error: result.notice };
    return { sentCount: result.sentCount, failedCount: result.failedCount };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "캠페인 실행 중 오류가 발생했습니다." };
  }
}
