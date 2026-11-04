"use server";

// 입금 기한 자동 취소 설정 — 몰 운영자 본인 cron-job.org 키로 그 계정의 몰 자동 작업을 켜고 끈다(작업 하나를 주문 알림과 함께 씀, job-sync.ts).
// 키·토큰 해시는 DB 함수로만 다룬다(표 직접 읽기 불가). 토큰 원문은 cron-job.org 작업 머리글에만 들어간다.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStoreBySlug } from "@/lib/store";
import { expireUrl, parseDepositHours } from "@/lib/depositScheduler";
import { setJobEnabled } from "@/lib/cronJobOrg";
import { isLocalOrigin, LOCAL_SKIP_MESSAGE, siteOrigin, syncStoreJob } from "./job-sync";

export type DepositState = { error: string | null; message: string | null; hours: string };

export async function saveDepositAction(slug: string, _prev: DepositState, form: FormData): Promise<DepositState> {
  const hoursText = String(form.get("hours") ?? "");
  const keyInput = String(form.get("api_key") ?? "").trim();
  const removeKey = form.get("remove_key") === "on";
  const parsed = parseDepositHours(hoursText);
  if (!parsed.ok) return { error: parsed.error, message: null, hours: hoursText };

  const store = await getStoreBySlug(slug);
  const supabase = await createClient();

  try {
    // 키를 지우면 먼저 예전 키로 작업을 멈춘다(키를 지운 뒤에는 멈출 수 없으므로). 내 PC 주소면 작업은 건드리지 않는다
    if (removeKey && !isLocalOrigin(await siteOrigin())) {
      const { data: oldKey, error: keyError } = await supabase.rpc("mall_builder_scheduler_api_key", { p_store_id: store.id });
      if (keyError) return { error: keyError.message, message: null, hours: hoursText };
      if (oldKey) await setJobEnabled(oldKey as string, expireUrl(await siteOrigin(), slug), false);
    }

    const keyArg = removeKey ? "" : keyInput || null;
    const { error } = await supabase.rpc("mall_builder_scheduler_save", { p_store_id: store.id, p_hours: parsed.value, p_api_key: keyArg });
    if (error) return { error: error.message, message: null, hours: hoursText };

    const sync = await syncStoreJob(supabase, store.id, slug);
    revalidatePath(`/s/${slug}/admin/settings`);
    if (sync.skippedLocal) return { error: null, message: LOCAL_SKIP_MESSAGE, hours: hoursText };
    if (parsed.value !== null && sync.active) {
      return { error: null, message: `자동 취소를 켰습니다. 이제 들어오는 무통장 주문은 ${parsed.value}시간 안에 입금이 없으면 취소됩니다(${sync.everyMinute ? "1분" : "10분"}마다 확인).`, hours: hoursText };
    }
    if (parsed.value !== null) return { error: null, message: "저장했습니다. cron-job.org API 키를 등록하면 자동 취소가 시작됩니다.", hours: hoursText };
    return {
      error: null,
      message: sync.active ? "자동 취소를 껐습니다. 주문 알림은 계속 보냅니다." : "자동 취소를 껐습니다. 새 주문에는 입금 기한이 붙지 않습니다.",
      hours: hoursText,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "cron-job.org 연결에 실패했습니다.", message: null, hours: hoursText };
  }
}

export async function pauseDepositAction(slug: string, paused: boolean): Promise<{ error: string | null }> {
  if (isLocalOrigin(await siteOrigin())) return { error: "내 PC 주소에서는 자동 작업을 일시정지·재개할 수 없습니다. 실제 사이트 주소에서 눌러 주세요." };
  const store = await getStoreBySlug(slug);
  const supabase = await createClient();
  const { data: key, error } = await supabase.rpc("mall_builder_scheduler_api_key", { p_store_id: store.id });
  if (error) return { error: error.message };
  if (!key) return { error: "cron-job.org API 키가 없습니다. 먼저 키를 등록해 주세요." };
  try {
    const jobId = await setJobEnabled(key as string, expireUrl(await siteOrigin(), slug), !paused);
    if (jobId === null) return { error: "cron-job.org에 작업이 없습니다. 위에서 다시 저장하면 새로 만듭니다." };
    const { error: linkError } = await supabase.rpc("mall_builder_scheduler_link", { p_store_id: store.id, p_job_id: jobId, p_paused: paused, p_token_hash: null });
    if (linkError) return { error: linkError.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "cron-job.org 연결에 실패했습니다." };
  }
  revalidatePath(`/s/${slug}/admin/settings`);
  return { error: null };
}
