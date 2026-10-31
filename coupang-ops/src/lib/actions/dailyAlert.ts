"use server";

import { createHash, randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { getWingKeys } from "@/lib/data";
import { stopDailyJob, upsertDailyJob } from "@/lib/alerts/cronJob";
import { cleanHour, SITE_ORIGIN, SUMMARY_PATH, TOKEN_PREFIX } from "@/lib/coupang/summary";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { findChatIdFromUpdates, sendTelegramMessage } from "@/lib/telegram/client";

const SLUG = "coupang-ops";
const CRON_PROVIDER = "cronjob_org_api_key";
const JOB_URL = `${SITE_ORIGIN}${SUMMARY_PATH}`;
type Done = { ok: true; message: string } | { ok: false; error: string };
const msg = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

async function cronKey(userId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.from("user_api_keys").select("api_key").eq("user_id", userId).eq("provider", CRON_PROVIDER).maybeSingle();
  return String(data?.api_key ?? "").trim();
}

/** 회원의 텔레그램 연결. 이 프로그램 연결을 먼저 쓰고, 없으면 회원이 다른 프로그램에서 연결한 본인 봇을 재사용한다 */
async function telegramLink(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("user_telegram_links").select("program_slug,bot_token,chat_id,bot_username").eq("user_id", userId);
  const rows = (data ?? []) as { program_slug: string; bot_token: string; chat_id: string; bot_username: string | null }[];
  return rows.find((r) => r.program_slug === SLUG) ?? rows[0] ?? null;
}

export async function connectTelegramAction(botToken: string): Promise<Done> {
  const user = await requireProgramAccess();
  const token = String(botToken ?? "").trim();
  if (!token) return { ok: false, error: "봇 토큰을 넣어 주세요." };
  try {
    const info = await findChatIdFromUpdates(token);
    if (!info) return { ok: false, error: "봇에게 보낸 메시지를 찾지 못했습니다. 텔레그램에서 본인 봇을 열고 아무 메시지나 보낸 뒤 다시 눌러 주세요." };
    const supabase = await createClient();
    const { error } = await supabase.from("user_telegram_links").upsert({ user_id: user.id, program_slug: SLUG, bot_token: token, chat_id: info.chatId, bot_username: info.botUsername ?? null, linked_at: new Date().toISOString() }, { onConflict: "user_id,program_slug" });
    if (error) return { ok: false, error: "저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
    await sendTelegramMessage({ botToken: token, chatId: info.chatId, text: "✅ AI 쿠팡 운영 자동화와 연결됐습니다." });
    revalidatePath("/alerts");
    return { ok: true, message: "연결했습니다. 텔레그램에 확인 메시지를 보냈습니다." };
  } catch (e) {
    return { ok: false, error: msg(e, "연결을 확인하지 못했습니다.") };
  }
}

export async function testTelegramAction(): Promise<Done> {
  const user = await requireProgramAccess();
  const link = await telegramLink(user.id);
  if (!link) return { ok: false, error: "먼저 텔레그램을 연결해 주세요." };
  try {
    await sendTelegramMessage({ botToken: link.bot_token, chatId: link.chat_id, text: "🛒 AI 쿠팡 운영 자동화 시험 메시지입니다." });
    return { ok: true, message: "시험 메시지를 보냈습니다." };
  } catch (e) {
    return { ok: false, error: msg(e, "보내지 못했습니다.") };
  }
}

export async function saveCronKeyAction(apiKey: string): Promise<Done> {
  const user = await requireProgramAccess();
  const key = String(apiKey ?? "").trim();
  if (!key) return { ok: false, error: "cron-job.org API 키를 넣어 주세요." };
  const supabase = await createClient();
  const { error } = await supabase.from("user_api_keys").upsert({ user_id: user.id, provider: CRON_PROVIDER, api_key: key }, { onConflict: "user_id,provider" });
  if (error) return { ok: false, error: "저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  revalidatePath("/alerts");
  return { ok: true, message: "저장했습니다. 다른 프로그램의 예약에서도 같은 키를 씁니다." };
}

/** 켜기: 회원 전용 토큰을 새로 만들어 회원 cron-job.org 작업에 넣는다. 작업을 못 만들면 켜지 않는다 */
export async function enableDailyAlertAction(hourInput: number): Promise<Done> {
  const user = await requireProgramAccess();
  const hour = cleanHour(hourInput);
  const [keys, key, link] = await Promise.all([getWingKeys(user.id), cronKey(user.id), telegramLink(user.id)]);
  if (!keys) return { ok: false, error: "먼저 「쿠팡 연결」에서 키를 등록해 주세요." };
  if (!link) return { ok: false, error: "먼저 텔레그램을 연결해 주세요." };
  if (!key) return { ok: false, error: "먼저 cron-job.org API 키를 저장해 주세요." };
  const token = `${TOKEN_PREFIX}_${randomBytes(32).toString("hex")}`;
  const token_hash = createHash("sha256").update(token).digest("hex");
  try {
    await upsertDailyJob(key, JOB_URL, token, hour);
  } catch (e) {
    return { ok: false, error: msg(e, "cron-job.org 작업을 만들지 못했습니다.") };
  }
  const { error } = await createAdminClient().from("coupang_ops_alerts").upsert({ user_id: user.id, enabled: true, hour, token_hash, updated_at: new Date().toISOString() });
  if (error) return { ok: false, error: "설정을 저장하지 못했습니다. 다시 눌러 주세요." };
  revalidatePath("/alerts");
  return { ok: true, message: `매일 ${hour}시에 요약을 보냅니다.` };
}

export async function disableDailyAlertAction(): Promise<Done> {
  const user = await requireProgramAccess();
  const key = await cronKey(user.id);
  // 작업을 못 꺼도 서버가 요청을 거절하도록 먼저 끈다
  await createAdminClient().from("coupang_ops_alerts").update({ enabled: false, updated_at: new Date().toISOString() }).eq("user_id", user.id);
  revalidatePath("/alerts");
  try {
    if (key) await stopDailyJob(key, JOB_URL);
    return { ok: true, message: "껐습니다." };
  } catch (e) {
    return { ok: true, message: `껐습니다. 다만 cron-job.org 작업은 직접 꺼 주세요(${msg(e, "연결 오류")}).` };
  }
}

export type AlertStatus = { enabled: boolean; hour: number; lastRunDate: string; lastResult: string; telegram: string; cronKeySaved: boolean; wingKeysSaved: boolean };

export async function alertStatus(userId: string): Promise<AlertStatus> {
  const [row, link, key, keys] = await Promise.all([
    createAdminClient().from("coupang_ops_alerts").select("enabled,hour,last_run_date,last_result").eq("user_id", userId).maybeSingle().then((r) => r.data),
    telegramLink(userId),
    cronKey(userId),
    getWingKeys(userId),
  ]);
  return { enabled: !!row?.enabled, hour: row?.hour ?? 8, lastRunDate: row?.last_run_date ?? "", lastResult: row?.last_result ?? "", telegram: link ? link.bot_username || "연결됨" : "", cronKeySaved: !!key, wingKeysSaved: !!keys };
}
