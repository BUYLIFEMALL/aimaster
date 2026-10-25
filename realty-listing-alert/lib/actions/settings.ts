"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { isValidInterval } from "@/lib/schedule";

// 예약 설정 저장 — 기준: real_estate_sales updateMonitoringSettingsAction(바꾸면 바로 저장).
// 서버는 값만 보관하고, 판정·수집은 회원 PC 확장이 한다(인수인계 §5-3 차이).
export async function saveScheduleAction(input: {
  enabled: boolean;
  intervalMinutes: number;
  hoursRestricted: boolean;
  startHour: number;
  endHour: number;
}): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  if (!isValidInterval(input.intervalMinutes)) return { error: "수집 간격 값이 올바르지 않습니다." };
  const hourOk = (h: number) => Number.isInteger(h) && h >= 0 && h <= 23;
  if (input.hoursRestricted && (!hourOk(input.startHour) || !hourOk(input.endHour))) return { error: "동작 시간대 값이 올바르지 않습니다." };

  const supabase = await createClient();
  const { error } = await supabase.from("realty_alert_settings").upsert(
    {
      user_id: user.id,
      schedule_enabled: input.enabled,
      interval_minutes: input.intervalMinutes,
      active_hour_start: input.hoursRestricted ? input.startHour : null,
      active_hour_end: input.hoursRestricted ? input.endHour : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return { error: `저장에 실패했습니다: ${error.message}` };
  revalidatePath("/schedule");
  revalidatePath("/dashboard");
  return {};
}

type DeliveryInput = {
  notifyNew: boolean;
  notifyPriceDrop: boolean;
  notifyPriceChange: boolean;
  notifyGone: boolean;
  deliverTelegram: boolean;
  deliverFile: boolean;
  fileFormat: "xlsx" | "csv";
};

export async function saveDeliveryAction(input: DeliveryInput): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  if (input.fileFormat !== "xlsx" && input.fileFormat !== "csv") return { error: "파일 형식 값이 올바르지 않습니다." };
  if (!input.notifyNew && !input.notifyPriceDrop && !input.notifyPriceChange && !input.notifyGone) return { error: "알림 기준을 하나 이상 골라 주세요." };
  const supabase = await createClient();
  const { error } = await supabase.from("realty_alert_settings").upsert(
    {
      user_id: user.id,
      notify_new: input.notifyNew,
      notify_price_drop: input.notifyPriceDrop,
      notify_price_change: input.notifyPriceChange,
      notify_gone: input.notifyGone,
      deliver_telegram: input.deliverTelegram,
      deliver_file: input.deliverFile,
      file_format: input.fileFormat,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return { error: `저장에 실패했습니다: ${error.message}` };
  revalidatePath("/delivery");
  return {};
}

// 카톡·이메일 받기 켜기와 받는 주소(2026-10-25) — 「받는 방법」·「API키등록·플랫폼연동」 두 화면이 같이 쓴다. 바꾼 칸만 저장.
export async function saveChannelAction(input: { notifyKakao?: boolean; notifyEmail?: boolean; emailTo?: string; aiSummary?: boolean; aiProvider?: "gemini" | "openai" | "claude" }): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  const patch: Record<string, unknown> = { user_id: user.id, updated_at: new Date().toISOString() };
  if (typeof input.notifyKakao === "boolean") patch.notify_kakao = input.notifyKakao;
  if (typeof input.notifyEmail === "boolean") patch.notify_email = input.notifyEmail;
  if (typeof input.aiSummary === "boolean") patch.notify_ai_summary = input.aiSummary; // 🤖 AI 시세 요약(v1.22)
  if (input.aiProvider === "gemini" || input.aiProvider === "openai" || input.aiProvider === "claude") patch.ai_provider = input.aiProvider;
  if (typeof input.emailTo === "string") {
    const emailTo = input.emailTo.trim();
    if (emailTo && (emailTo.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailTo))) return { error: "받는 메일 주소 모양이 올바르지 않아요." };
    patch.email_to = emailTo || null;
  }
  const supabase = await createClient();
  const { error } = await supabase.from("realty_alert_settings").upsert(patch, { onConflict: "user_id" });
  if (error) return { error: `저장에 실패했습니다: ${error.message}` };
  revalidatePath("/delivery");
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return {};
}
