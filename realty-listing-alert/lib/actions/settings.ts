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
