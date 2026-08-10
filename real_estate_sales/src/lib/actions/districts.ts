"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { SEOUL_DISTRICTS } from "@/lib/publicdata/districts";

// 로그인 여부뿐 아니라 이 프로그램(real-estate-sales) 구독/이용 권한까지 확인한다.
// 페이지 레이아웃의 requireProgramAccess() 가드는 Server Action을 직접 호출하는
// 경로(폼 우회)까지는 막아주지 않으므로, 쓰기 액션 각각에서 다시 확인해야 한다.
export async function toggleDistrictAction(formData: FormData) {
  const user = await requireProgramAccess();
  const sggCd = String(formData.get("sggCd"));
  const nextActive = formData.get("nextActive") === "true";

  const district = SEOUL_DISTRICTS.find((d) => d.sgg_cd === sggCd);
  if (!district) return;

  const supabase = await createClient();

  if (nextActive) {
    await supabase.from("real_estate_watch_districts").upsert(
      {
        user_id: user.id,
        sgg_cd: district.sgg_cd,
        sgg_nm: district.sgg_nm,
        is_active: true,
      },
      { onConflict: "user_id,sgg_cd" },
    );
  } else {
    await supabase
      .from("real_estate_watch_districts")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .eq("sgg_cd", district.sgg_cd);
  }

  revalidatePath("/districts");
}

const VALID_INTERVALS = [30, 60, 180, 360, 720, 1440];

// 관심 지역별 "실시간 모니터링" 설정 저장 (On/Off, 수집 주기, 활성 시간대).
// 이 값들은 /api/collect/dispatch가 매번 호출될 때 "이번엔 처리할 차례인가"를
// 판단하는 데 쓰인다 — AI 분석/텔레그램 비용을 사용자가 원하는 만큼만 쓰게 하기 위함.
export async function updateMonitoringSettingsAction(formData: FormData) {
  const user = await requireProgramAccess();
  const sggCd = String(formData.get("sggCd"));
  const monitoringEnabled = formData.get("monitoringEnabled") === "true";
  const intervalMinutes = Number(formData.get("intervalMinutes"));
  const hoursRestricted = formData.get("hoursRestricted") === "true";
  const activeHourStartRaw = formData.get("activeHourStart");
  const activeHourEndRaw = formData.get("activeHourEnd");

  const district = SEOUL_DISTRICTS.find((d) => d.sgg_cd === sggCd);
  if (!district) return;
  if (!VALID_INTERVALS.includes(intervalMinutes)) return;

  const activeHourStart = hoursRestricted ? Number(activeHourStartRaw) : null;
  const activeHourEnd = hoursRestricted ? Number(activeHourEndRaw) : null;
  if (hoursRestricted && (!Number.isInteger(activeHourStart) || !Number.isInteger(activeHourEnd))) {
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("real_estate_watch_districts")
    .update({
      monitoring_enabled: monitoringEnabled,
      collect_interval_minutes: intervalMinutes,
      active_hour_start: activeHourStart,
      active_hour_end: activeHourEnd,
    })
    .eq("user_id", user.id)
    .eq("sgg_cd", district.sgg_cd);

  revalidatePath("/districts");
}
