"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export interface WatchlistEntry {
  id: string;
  categoryName: string;
  naverCategoryCode: string | null;
  keywords: string[];
  isActive: boolean;
  sourcingAlertEnabled: boolean;
  sourcingAlertIntervalMinutes: number | null;
  sourcingAlertChannels: string[];
}

export interface WatchlistActionState {
  error?: string;
  entry?: WatchlistEntry;
}

const WATCHLIST_SELECT =
  "id, category_name, naver_category_code, keywords, is_active, sourcing_alert_enabled, sourcing_alert_interval_minutes, sourcing_alert_channels";

function toEntry(row: {
  id: string;
  category_name: string;
  naver_category_code: string | null;
  keywords: string[];
  is_active: boolean;
  sourcing_alert_enabled: boolean;
  sourcing_alert_interval_minutes: number | null;
  sourcing_alert_channels: string[];
}): WatchlistEntry {
  return {
    id: row.id,
    categoryName: row.category_name,
    naverCategoryCode: row.naver_category_code,
    keywords: row.keywords,
    isActive: row.is_active,
    sourcingAlertEnabled: row.sourcing_alert_enabled,
    sourcingAlertIntervalMinutes: row.sourcing_alert_interval_minutes,
    sourcingAlertChannels: row.sourcing_alert_channels,
  };
}

export async function createWatchlistAction(formData: FormData): Promise<WatchlistActionState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const categoryName = String(formData.get("categoryName") ?? "").trim();
  const naverCategoryCode = String(formData.get("naverCategoryCode") ?? "").trim();
  const keywordsRaw = String(formData.get("keywords") ?? "").trim();

  if (!categoryName || !naverCategoryCode) {
    return { error: "카테고리를 선택해주세요." };
  }
  const keywords = keywordsRaw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  if (keywords.length === 0) {
    return { error: "추적할 키워드를 1개 이상 입력해주세요 (쉼표로 구분)." };
  }
  if (keywords.length > 10) {
    return { error: "키워드는 한 번에 최대 10개까지 등록할 수 있어요 (데이터랩 API 일일 호출 한도 보호)." };
  }

  const { data, error } = await supabase
    .from("trend_watchlist")
    .insert({
      user_id: user.id,
      category_name: categoryName,
      naver_category_code: naverCategoryCode,
      keywords,
    })
    .select(WATCHLIST_SELECT)
    .single();
  if (error) return { error: error.message };

  revalidatePath("/watchlist");
  return { entry: toEntry(data) };
}

export async function toggleWatchlistActiveAction(formData: FormData): Promise<WatchlistActionState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const nextActive = String(formData.get("nextActive") ?? "true") === "true";

  const { data, error } = await supabase
    .from("trend_watchlist")
    .update({ is_active: nextActive })
    .eq("id", id)
    .eq("user_id", user.id)
    .select(WATCHLIST_SELECT)
    .single();
  if (error) return { error: error.message };

  revalidatePath("/watchlist");
  return { entry: toEntry(data) };
}

export async function updateSourcingAlertAction(formData: FormData): Promise<WatchlistActionState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const enabled = String(formData.get("enabled") ?? "false") === "true";
  const intervalMinutes = Number(formData.get("intervalMinutes")) || null;
  const channels = formData.getAll("channels").map(String);

  const { data, error } = await supabase
    .from("trend_watchlist")
    .update({
      sourcing_alert_enabled: enabled,
      sourcing_alert_interval_minutes: intervalMinutes,
      sourcing_alert_channels: channels,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select(WATCHLIST_SELECT)
    .single();
  if (error) return { error: error.message };

  revalidatePath("/watchlist");
  return { entry: toEntry(data) };
}

export async function deleteWatchlistAction(formData: FormData): Promise<WatchlistActionState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");

  const { error } = await supabase.from("trend_watchlist").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/watchlist");
  return {};
}
