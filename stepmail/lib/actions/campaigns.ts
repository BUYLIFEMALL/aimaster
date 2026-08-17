"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { dispatchCampaign } from "@/lib/dispatch";
import type { CampaignRecurrence } from "@/types/database.types";

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

  if (!draftId) return { error: "발송할 이메일 초안을 선택해주세요." };
  if (!name) return { error: "캠페인 이름을 입력해주세요." };
  if (smtpAccountIds.length === 0) return { error: "발송에 사용할 이메일 계정을 하나 이상 선택해주세요." };

  const supabase = await createClient();

  const { data: draft } = await supabase
    .from("stepmail_email_drafts")
    .select("id")
    .eq("id", draftId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!draft) return { error: "이메일 초안을 찾을 수 없습니다." };

  const { data: campaign, error } = await supabase
    .from("stepmail_campaigns")
    .insert({
      user_id: user.id,
      draft_id: draftId,
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

  const links = smtpAccountIds.map((smtpAccountId, idx) => ({
    campaign_id: campaign.id,
    smtp_account_id: smtpAccountId,
    sort_order: idx,
  }));
  const { error: linkError } = await supabase.from("stepmail_campaign_smtp_accounts").insert(links);
  if (linkError) return { error: linkError.message };

  revalidatePath("/campaigns");
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
  revalidatePath("/campaigns");
  return {};
}

export async function deleteCampaignAction(campaignId: string): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { error } = await supabase.from("stepmail_campaigns").delete().eq("id", campaignId).eq("user_id", user.id);
  if (error) return { error: error.message };
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
    return { sentCount: result.sentCount, failedCount: result.failedCount };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "캠페인 실행 중 오류가 발생했습니다." };
  }
}
