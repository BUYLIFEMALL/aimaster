"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export interface SavedProductEntry {
  id: string;
  keyword: string;
  platform: "aliexpress" | "domeggook" | "elevenst";
  title: string;
  detailUrl: string;
  lastPriceKrw: number | null;
  lastStatus: "in_stock" | "out_of_stock";
  lastCheckedAt: string | null;
  alertIntervalMinutes: number;
  alertChannels: string[];
  alertEnabled: boolean;
  activeHourStart: number | null;
  activeHourEnd: number | null;
}

export interface SavedProductActionState {
  error?: string;
  entry?: SavedProductEntry;
}

const SELECT_COLUMNS =
  "id, keyword, platform, title, detail_url, last_price_krw, last_status, last_checked_at, alert_interval_minutes, alert_channels, alert_enabled, active_hour_start, active_hour_end";

function toEntry(row: {
  id: string;
  keyword: string;
  platform: string;
  title: string;
  detail_url: string;
  last_price_krw: number | null;
  last_status: string;
  last_checked_at: string | null;
  alert_interval_minutes: number;
  alert_channels: string[];
  alert_enabled: boolean;
  active_hour_start: number | null;
  active_hour_end: number | null;
}): SavedProductEntry {
  return {
    id: row.id,
    keyword: row.keyword,
    platform: row.platform as SavedProductEntry["platform"],
    title: row.title,
    detailUrl: row.detail_url,
    lastPriceKrw: row.last_price_krw,
    lastStatus: row.last_status as SavedProductEntry["lastStatus"],
    lastCheckedAt: row.last_checked_at,
    alertIntervalMinutes: row.alert_interval_minutes,
    alertChannels: row.alert_channels,
    alertEnabled: row.alert_enabled,
    activeHourStart: row.active_hour_start,
    activeHourEnd: row.active_hour_end,
  };
}

/** 검색 결과 상품 1건을 "관심 상품"으로 저장한다(이미 저장돼 있으면 그대로 반환). */
export async function saveSourcingProductAction(formData: FormData): Promise<SavedProductActionState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const keyword = String(formData.get("keyword") ?? "").trim();
  const platform = String(formData.get("platform") ?? "").trim();
  const productKey = String(formData.get("productKey") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const detailUrl = String(formData.get("detailUrl") ?? "").trim();
  const priceKrwRaw = formData.get("priceKrw");
  const priceKrw = priceKrwRaw ? Number(priceKrwRaw) : null;

  if (!keyword || !platform || !productKey || !title) {
    return { error: "저장할 상품 정보가 올바르지 않습니다." };
  }

  const { data, error } = await supabase
    .from("sourcing_saved_products")
    .upsert(
      {
        user_id: user.id,
        keyword,
        platform,
        product_key: productKey,
        title,
        detail_url: detailUrl,
        last_price_krw: priceKrw,
        last_status: "in_stock",
        last_checked_at: new Date().toISOString(),
      },
      { onConflict: "user_id,platform,product_key" },
    )
    .select(SELECT_COLUMNS)
    .single();

  if (error) return { error: error.message };

  revalidatePath("/sourcing");
  return { entry: toEntry(data) };
}

export async function deleteSavedProductAction(formData: FormData): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");

  const { error } = await supabase.from("sourcing_saved_products").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/sourcing");
  return {};
}

const VALID_INTERVALS = [60, 180, 360, 720, 1440];

/** real_estate_sales의 updateMonitoringSettingsAction과 동일한 패턴 — 켜짐 여부/주기/채널/
 * 동작 시간대를 한 번에 저장한다(호출부는 매번 현재 상태 전체를 다시 보낸다). */
export async function updateSavedProductAlertAction(formData: FormData): Promise<SavedProductActionState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const enabled = String(formData.get("enabled") ?? "true") === "true";
  const intervalMinutes = Number(formData.get("intervalMinutes"));
  const channels = formData.getAll("channels").map(String);
  const hoursRestricted = String(formData.get("hoursRestricted") ?? "false") === "true";
  const startHourRaw = formData.get("activeHourStart");
  const endHourRaw = formData.get("activeHourEnd");

  if (!id) return { error: "잘못된 요청입니다." };
  if (!VALID_INTERVALS.includes(intervalMinutes)) return { error: "잘못된 주기입니다." };

  const activeHourStart = hoursRestricted ? Number(startHourRaw) : null;
  const activeHourEnd = hoursRestricted ? Number(endHourRaw) : null;
  if (hoursRestricted && (!Number.isInteger(activeHourStart) || !Number.isInteger(activeHourEnd))) {
    return { error: "동작 시간대를 다시 선택해주세요." };
  }

  const { data, error } = await supabase
    .from("sourcing_saved_products")
    .update({
      alert_enabled: enabled,
      alert_interval_minutes: intervalMinutes,
      alert_channels: channels,
      active_hour_start: activeHourStart,
      active_hour_end: activeHourEnd,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select(SELECT_COLUMNS)
    .single();
  if (error) return { error: error.message };

  revalidatePath("/sourcing");
  return { entry: toEntry(data) };
}
