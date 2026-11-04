"use server";

// 입금 기한 자동 취소 설정 — 몰 운영자 본인 cron-job.org 키로 그 계정에 10분 확인 작업을 만들고 켜고 끈다.
// 키·토큰 해시는 DB 함수로만 다룬다(표 직접 읽기 불가). 토큰 원문은 cron-job.org 작업 머리글에만 들어간다.
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStoreBySlug } from "@/lib/store";
import { expireUrl, hashRunToken, newRunToken, parseDepositHours } from "@/lib/depositScheduler";
import { setJobEnabled, upsertJob } from "@/lib/cronJobOrg";

export type DepositState = { error: string | null; message: string | null; hours: string };

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function saveDepositAction(slug: string, _prev: DepositState, form: FormData): Promise<DepositState> {
  const hoursText = String(form.get("hours") ?? "");
  const keyInput = String(form.get("api_key") ?? "").trim();
  const removeKey = form.get("remove_key") === "on";
  const parsed = parseDepositHours(hoursText);
  if (!parsed.ok) return { error: parsed.error, message: null, hours: hoursText };

  const store = await getStoreBySlug(slug);
  const supabase = await createClient();
  const url = expireUrl(await siteOrigin(), slug);

  const { data: oldKey, error: keyError } = await supabase.rpc("mall_builder_scheduler_api_key", { p_store_id: store.id });
  if (keyError) return { error: keyError.message, message: null, hours: hoursText };

  try {
    // 끄거나 키를 지우면 먼저 예전 키로 작업을 멈춘다(키를 지운 뒤에는 멈출 수 없으므로)
    if ((parsed.value === null || removeKey) && oldKey) await setJobEnabled(oldKey as string, url, false);

    const keyArg = removeKey ? "" : keyInput || null;
    const { error } = await supabase.rpc("mall_builder_scheduler_save", { p_store_id: store.id, p_hours: parsed.value, p_api_key: keyArg });
    if (error) return { error: error.message, message: null, hours: hoursText };
    const key = removeKey ? "" : keyInput || (oldKey as string);

    if (parsed.value !== null && key) {
      const token = newRunToken();
      const jobId = await upsertJob(key, url, token);
      const { error: linkError } = await supabase.rpc("mall_builder_scheduler_link", { p_store_id: store.id, p_job_id: jobId, p_paused: false, p_token_hash: hashRunToken(token) });
      if (linkError) return { error: linkError.message, message: null, hours: hoursText };
      revalidatePath(`/s/${slug}/admin/settings`);
      return { error: null, message: `자동 취소를 켰습니다. 이제 들어오는 무통장 주문은 ${parsed.value}시간 안에 입금이 없으면 취소됩니다(10분마다 확인).`, hours: hoursText };
    }

    // 꺼짐(기한 없음) 또는 키 없음 → 작업 연결을 끊어 새 주문에 기한을 적지 않게 한다
    const { error: linkError } = await supabase.rpc("mall_builder_scheduler_link", { p_store_id: store.id, p_job_id: null, p_paused: false, p_token_hash: null });
    if (linkError) return { error: linkError.message, message: null, hours: hoursText };
    revalidatePath(`/s/${slug}/admin/settings`);
    return {
      error: null,
      message: parsed.value === null ? "자동 취소를 껐습니다. 새 주문에는 입금 기한이 붙지 않습니다." : "저장했습니다. cron-job.org API 키를 등록하면 자동 취소가 시작됩니다.",
      hours: hoursText,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "cron-job.org 연결에 실패했습니다.", message: null, hours: hoursText };
  }
}

export async function pauseDepositAction(slug: string, paused: boolean): Promise<{ error: string | null }> {
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
