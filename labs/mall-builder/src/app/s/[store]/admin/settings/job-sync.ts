// 몰 자동 작업(입금 기한 자동 취소 D8 + 주문 알림 0025)이 함께 쓰는 운영자 cron-job.org 작업 하나를 맞춘다.
// 입금 기한이나 알림이 하나라도 켜져 있고 cron-job.org 키가 있으면 작업을 켜고(새 토큰), 아니면 끈다.
// 알림이 켜져 있으면 1분, 아니면 10분마다. 저장 버튼에서만 부른다(cron-job.org 하루 호출 한도).
import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CHECK_MINUTES, expireUrl, hashRunToken, newRunToken } from "@/lib/depositScheduler";
import { EVERY_MINUTE } from "@/lib/notify";
import { setJobEnabled, upsertJob } from "@/lib/cronJobOrg";

export async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * 내 PC 주소(localhost 등)에서 저장하면 cron-job.org 작업 주소가 내 PC로 잡히고 토큰이 바뀌어
 * 실제 사이트의 작업이 401로 멈춘다(2026-11-04 실제 사고, docs/mall/LESSONS_LEARNED.md). 그런 주소에서는 작업을 건드리지 않는다.
 */
export function isLocalOrigin(origin: string): boolean {
  try {
    const h = new URL(origin).hostname;
    return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "::1" || h.endsWith(".localhost") || /^(10|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(h);
  } catch {
    return true;
  }
}

export const LOCAL_SKIP_MESSAGE = "내 PC 주소에서 저장해 설정만 저장했고, cron-job.org 자동 작업은 바꾸지 않았습니다. 작업을 바꾸려면 실제 사이트 주소에서 저장해 주세요.";

export type JobSync = { active: boolean; everyMinute: boolean; depositOn: boolean; notifyOn: boolean; hasKey: boolean; skippedLocal?: boolean };

/** 저장 직후 호출. 실패하면 cron-job.org 오류 문구를 그대로 던진다 */
export async function syncStoreJob(supabase: SupabaseClient, storeId: string, slug: string): Promise<JobSync> {
  const origin = await siteOrigin();
  if (isLocalOrigin(origin)) return { active: false, everyMinute: false, depositOn: false, notifyOn: false, hasKey: false, skippedLocal: true };
  const [{ data: key, error: keyError }, { data: sched }, { data: notify }] = await Promise.all([
    supabase.rpc("mall_builder_scheduler_api_key", { p_store_id: storeId }),
    supabase.from("mall_builder_store_schedulers").select("deposit_hours").eq("store_id", storeId).maybeSingle(),
    supabase.from("mall_builder_store_notify_settings").select("kinds, email_kinds").eq("store_id", storeId).maybeSingle(),
  ]);
  if (keyError) throw new Error(keyError.message);
  const depositOn = sched?.deposit_hours != null;
  // 문자·메일 알림 중 하나라도 켜져 있으면 1분 주기
  const notifyOn = ((notify?.kinds as string[] | undefined) ?? []).length > 0 || ((notify?.email_kinds as string[] | undefined) ?? []).length > 0;
  const hasKey = Boolean(key);
  const url = expireUrl(origin, slug);

  if ((depositOn || notifyOn) && hasKey) {
    const token = newRunToken();
    const jobId = await upsertJob(key as string, url, token, fetch, notifyOn ? EVERY_MINUTE : CHECK_MINUTES);
    const { error } = await supabase.rpc("mall_builder_scheduler_link", { p_store_id: storeId, p_job_id: jobId, p_paused: false, p_token_hash: hashRunToken(token) });
    if (error) throw new Error(error.message);
    return { active: true, everyMinute: notifyOn, depositOn, notifyOn, hasKey };
  }

  // 할 일이 없거나 키가 없음 → 작업을 끄고 연결을 끊는다(새 주문에 기한·알림이 생기지 않음)
  if (hasKey) await setJobEnabled(key as string, url, false);
  const { error } = await supabase.rpc("mall_builder_scheduler_link", { p_store_id: storeId, p_job_id: null, p_paused: false, p_token_hash: null });
  if (error) throw new Error(error.message);
  return { active: false, everyMinute: false, depositOn, notifyOn, hasKey };
}
