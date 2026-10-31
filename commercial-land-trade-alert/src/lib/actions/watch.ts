"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { findDistrict } from "@/lib/publicdata/districts";
import { BUILDING_USES, JIMOKS } from "@/lib/trades/prefs";

export async function toggleDistrictAction(formData: FormData) {
  const user = await requireProgramAccess();
  const district = findDistrict(String(formData.get("sggCd")));
  if (!district) return;
  const nextActive = formData.get("nextActive") === "true";
  const supabase = await createClient();
  if (nextActive) {
    await supabase
      .from("commercial_land_watch")
      .upsert({ user_id: user.id, sgg_cd: district.sgg_cd, sgg_nm: district.sgg_nm, is_active: true, created_at: new Date().toISOString() }, { onConflict: "user_id,sgg_cd" });
  } else {
    await supabase.from("commercial_land_watch").update({ is_active: false }).eq("user_id", user.id).eq("sgg_cd", district.sgg_cd);
  }
  revalidatePath("/districts");
  revalidatePath("/dashboard");
}

export interface PrefsState {
  error?: string;
  success?: string;
}

const numOrNull = (v: FormDataEntryValue | null): number | null => {
  const s = String(v ?? "").replace(/,/g, "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};

// 화면은 금액을 억 단위로 받아 만 원으로 저장한다
export async function savePrefsAction(_prev: PrefsState, formData: FormData): Promise<PrefsState> {
  const user = await requireProgramAccess();
  const minEok = numOrNull(formData.get("minAmount"));
  const maxEok = numOrNull(formData.get("maxAmount"));
  const minArea = numOrNull(formData.get("minArea"));
  const maxArea = numOrNull(formData.get("maxArea"));
  if ([minEok, maxEok, minArea, maxArea].some((v) => Number.isNaN(v))) return { error: "금액과 면적은 숫자로 적어 주세요." };
  if (minEok !== null && maxEok !== null && minEok > maxEok) return { error: "최소 금액이 최대 금액보다 큽니다." };
  if (minArea !== null && maxArea !== null && minArea > maxArea) return { error: "최소 면적이 최대 면적보다 큽니다." };
  const kinds = formData.getAll("kinds").map(String).filter((k) => k === "building" || k === "land");
  if (!kinds.length) return { error: "상가·건물과 토지 중 하나는 골라 주세요." };
  const pickedUses = formData.getAll("uses").map(String);
  const pickedJimoks = formData.getAll("jimoks").map(String);

  const supabase = await createClient();
  const { error } = await supabase.from("commercial_land_preferences").upsert(
    {
      user_id: user.id,
      kinds,
      excluded_uses: BUILDING_USES.filter((u) => !pickedUses.includes(u)),
      excluded_jimoks: JIMOKS.filter((j) => !pickedJimoks.includes(j)),
      min_amount: minEok === null ? null : Math.round(minEok * 10000),
      max_amount: maxEok === null ? null : Math.round(maxEok * 10000),
      min_area: minArea,
      max_area: maxArea,
      include_share: formData.get("includeShare") === "on",
      notify_enabled: formData.get("notifyEnabled") === "on",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return { error: `저장에 실패했습니다: ${error.message}` };
  revalidatePath("/conditions");
  revalidatePath("/trades");
  return { success: "저장했습니다." };
}
