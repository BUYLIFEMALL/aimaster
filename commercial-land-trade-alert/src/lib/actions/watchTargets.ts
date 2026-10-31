"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { dongOf } from "@/lib/regions";
import { buildRegionUrl, kindsText, MAX_TARGETS, parseWatchUrl } from "@/lib/watchTargets";

export interface WatchState {
  error?: string;
  success?: string;
}

const numOrNull = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").replace(/,/g, "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};

export async function addTargetAction(_: WatchState, formData: FormData): Promise<WatchState> {
  const user = await requireProgramAccess();
  const parsed = parseWatchUrl(String(formData.get("url") ?? ""));
  if (!parsed) return { error: "네이버 부동산 「상가·업무·공장·토지」 지도 주소를 붙여 넣어 주세요. 필터는 상가·건물·토지만 고를 수 있어요." };
  const supabase = await createClient();
  const { count } = await supabase.from("commercial_land_listing_targets").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if ((count ?? 0) >= MAX_TARGETS) return { error: `감시 화면은 ${MAX_TARGETS}곳까지예요.` };
  const name = String(formData.get("name") ?? "").trim().slice(0, 60) || `${kindsText(parsed.kinds)} ${(count ?? 0) + 1}`;
  const { error } = await supabase.from("commercial_land_listing_targets").insert({ user_id: user.id, url: parsed.url, kinds: parsed.kinds, name });
  if (error) return { error: error.code === "23505" ? "이미 넣은 화면이에요." : `저장에 실패했습니다: ${error.message}` };
  revalidatePath("/watch");
  return { success: "감시 화면을 추가했어요." };
}

// 지역 고르기로 추가. 시세 비교 자료가 필요해 그 시·군·구의 실거래 수집도 함께 켠다(회원이 꺼 둔 지역은 다시 켜지 않음).
export async function addRegionTargetAction(_: WatchState, formData: FormData): Promise<WatchState> {
  const user = await requireProgramAccess();
  const found = dongOf(String(formData.get("cortarNo") ?? ""));
  const kinds = String(formData.get("kinds") ?? "");
  const url = buildRegionUrl(Number(formData.get("lat")), Number(formData.get("lon")), kinds);
  if (!found || !url) return { error: "지역 정보를 확인하지 못했습니다. 다시 골라 주세요." };
  const supabase = await createClient();
  const { count } = await supabase.from("commercial_land_listing_targets").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if ((count ?? 0) >= MAX_TARGETS) return { error: `감시 화면은 ${MAX_TARGETS}곳까지예요.` };
  const name = `${found.sggNm} ${found.dong} ${kindsText(kinds)}`.slice(0, 60);
  const { error } = await supabase.from("commercial_land_listing_targets").insert({ user_id: user.id, url, kinds, name });
  if (error) return { error: error.code === "23505" ? "이미 넣은 지역이에요." : `저장에 실패했습니다: ${error.message}` };
  await supabase.from("commercial_land_watch").upsert({ user_id: user.id, sgg_cd: found.sggCd, sgg_nm: found.sggNm, is_active: true }, { onConflict: "user_id,sgg_cd", ignoreDuplicates: true });
  revalidatePath("/watch");
  return { success: `${name}을(를) 추가했어요. 확장에서 「지금 수집」을 누르면 바로 읽습니다.` };
}

export async function updateTargetAction(_: WatchState, formData: FormData): Promise<WatchState> {
  const user = await requireProgramAccess();
  const id = String(formData.get("id"));
  const [pMin, pMax, aMin, aMax] = ["priceMin", "priceMax", "areaMin", "areaMax"].map((k) => numOrNull(formData.get(k)));
  if ([pMin, pMax, aMin, aMax].some((v) => Number.isNaN(v))) return { error: "금액과 면적은 숫자로 적어 주세요." };
  const trades = formData.getAll("trades").map(String).filter((t) => t === "A1" || t === "B2");
  const supabase = await createClient();
  const { error } = await supabase
    .from("commercial_land_listing_targets")
    .update({
      name: String(formData.get("name") ?? "").trim().slice(0, 60),
      enabled: formData.get("enabled") === "on",
      trade_types: trades.length ? trades : ["A1", "B2"],
      price_min: pMin === null ? null : Math.round((pMin as number) * 10000),
      price_max: pMax === null ? null : Math.round((pMax as number) * 10000),
      area_min: aMin,
      area_max: aMax,
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: `저장에 실패했습니다: ${error.message}` };
  revalidatePath("/watch");
  return { success: "저장했어요." };
}

export async function deleteTargetAction(formData: FormData) {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  await supabase.from("commercial_land_listing_targets").delete().eq("id", String(formData.get("id"))).eq("user_id", user.id);
  revalidatePath("/watch");
}

export async function saveScheduleAction(_: WatchState, formData: FormData): Promise<WatchState> {
  const user = await requireProgramAccess();
  const interval = Number(formData.get("interval"));
  if (![60, 180, 360, 720, 1440].includes(interval)) return { error: "간격을 골라 주세요." };
  const hour = (k: string) => {
    const s = String(formData.get(k) ?? "");
    return s === "" ? null : Number(s);
  };
  const supabase = await createClient();
  const { error } = await supabase.from("commercial_land_preferences").upsert(
    {
      user_id: user.id,
      schedule_enabled: formData.get("enabled") === "on",
      interval_minutes: interval,
      active_hour_start: hour("start"),
      active_hour_end: hour("end"),
      listing_notify_new: formData.get("new") === "on",
      listing_notify_drop: formData.get("drop") === "on",
      listing_notify_rise: formData.get("rise") === "on",
      listing_notify_gone: formData.get("gone") === "on",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return { error: `저장에 실패했습니다: ${error.message}` };
  revalidatePath("/watch");
  return { success: "저장했어요." };
}
