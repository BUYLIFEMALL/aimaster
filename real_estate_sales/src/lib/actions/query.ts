"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { collectDistrict, findUnmatchedListingIds, notifyUserForListings } from "@/lib/realestate/collect";

// 사용자가 직접 누르는 "지금 조회하기" — 이 서비스의 기본(default) 동작 방식이다.
// 예약 조회(monitoring_enabled 켜둔 지역, api/collect/dispatch cron)와 달리 주기/시간대
// 조건 없이 즉시 실행되며, 같은 지역을 짧은 시간 안에 중복 조회하지 않도록
// real_estate_district_collect_state 재사용 로직만 그대로 따른다.
const REUSE_WINDOW_MINUTES = 5;

export interface QueryDistrictsResult {
  error?: string;
  queriedDistricts?: number;
  newListings?: number;
  notified?: number;
  telegramLinked?: boolean;
}

export async function queryDistrictsAction(): Promise<QueryDistrictsResult> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: watches } = await supabase
    .from("real_estate_watch_districts")
    .select("sgg_cd, sgg_nm")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (!watches || watches.length === 0) {
    return { error: "먼저 관심 지역을 선택해주세요." };
  }

  const { data: telegramLink } = await supabase
    .from("user_telegram_links")
    .select("bot_token, chat_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const telegramLinked = !!(telegramLink?.bot_token && telegramLink?.chat_id);

  const year = new Date().getFullYear();
  const now = new Date();
  let totalNew = 0;
  let totalNotified = 0;

  for (const w of watches) {
    const { data: state } = await admin
      .from("real_estate_district_collect_state")
      .select("last_collected_at")
      .eq("sgg_cd", w.sgg_cd)
      .maybeSingle();

    const recentlyCollected =
      !!state?.last_collected_at &&
      now.getTime() - new Date(state.last_collected_at).getTime() < REUSE_WINDOW_MINUTES * 60 * 1000;

    if (!recentlyCollected) {
      try {
        await collectDistrict(admin, w.sgg_cd, w.sgg_nm, year);
        await admin
          .from("real_estate_district_collect_state")
          .upsert({ sgg_cd: w.sgg_cd, last_collected_at: now.toISOString() }, { onConflict: "sgg_cd" });
      } catch (err) {
        console.error(`실거래 조회 실패 (${w.sgg_nm}):`, err);
        continue;
      }
    }

    // 수동 조회도 예약 조회와 같은 "확인한 시각" 취급 — 예약을 켜둔 지역이라면
    // 바로 다음 cron 틱에서 중복으로 다시 처리하지 않도록 last_run_at도 같이 갱신한다.
    await admin
      .from("real_estate_watch_districts")
      .update({ last_run_at: now.toISOString() })
      .eq("user_id", user.id)
      .eq("sgg_cd", w.sgg_cd);

    const unmatchedIds = await findUnmatchedListingIds(admin, user.id, w.sgg_cd);
    if (unmatchedIds.length === 0) continue;

    totalNew += unmatchedIds.length;
    const beforeNotifiedCount = unmatchedIds.length;
    await notifyUserForListings(admin, user.id, w.sgg_nm, unmatchedIds);
    if (telegramLinked) totalNotified += beforeNotifiedCount;
  }

  revalidatePath("/dashboard");
  revalidatePath("/listings");
  revalidatePath("/districts");

  return {
    queriedDistricts: watches.length,
    newListings: totalNew,
    notified: totalNotified,
    telegramLinked,
  };
}
