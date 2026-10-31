"use server";

import { createHash, randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { getWingKeys } from "@/lib/data";
import { stopDailyJob, upsertDailyJob } from "@/lib/alerts/cronJob";
import { channelProblem, deliver, loadTargets } from "@/lib/alerts/deliver";
import { normalizePrefs } from "@/lib/coupang/prefs";
import { ALERT_CHANNELS, CHANNEL_LABEL, cleanChannels, cleanHour, SITE_ORIGIN, SUMMARY_PATH, TOKEN_PREFIX, type AlertChannel } from "@/lib/coupang/summary";
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
  revalidatePath("/connect");
    return { ok: true, message: "연결했습니다. 텔레그램에 확인 메시지를 보냈습니다." };
  } catch (e) {
    return { ok: false, error: msg(e, "연결을 확인하지 못했습니다.") };
  }
}

/** 고른 곳으로 시험 메시지 1건. 카카오톡은 회원 SOLAPI 요금이 든다 */
export async function testChannelAction(channel: AlertChannel): Promise<Done> {
  const user = await requireProgramAccess();
  const [c] = cleanChannels([channel]);
  if (!c) return { ok: false, error: "받을 곳을 골라 주세요." };
  const targets = await loadTargets(user.id);
  const problem = channelProblem(c, targets);
  if (problem) return { ok: false, error: problem };
  const result = await deliver([c], targets, "[쿠팡 운영] 시험 메시지", "🛒 AI 쿠팡 운영 자동화 시험 메시지입니다.");
  return result.endsWith("보냄") ? { ok: true, message: result } : { ok: false, error: `${result}: 계정 정보를 확인해 주세요.` };
}

export async function saveResendKeyAction(input: { apiKey: string; emailTo: string }): Promise<Done> {
  const user = await requireProgramAccess();
  const key = String(input.apiKey ?? "").trim();
  const emailTo = String(input.emailTo ?? "").trim();
  if (key && !/^re_[A-Za-z0-9_]{10,}$/.test(key)) return { ok: false, error: "Resend 키는 re_로 시작합니다. Resend의 API Keys 화면에서 다시 복사해 주세요." };
  if (emailTo && (emailTo.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailTo))) return { ok: false, error: "받는 메일 주소를 확인해 주세요." };
  const supabase = await createClient();
  if (key) {
    const { error } = await supabase.from("user_api_keys").upsert({ user_id: user.id, provider: "resend_api_key", api_key: key }, { onConflict: "user_id,provider" });
    if (error) return { ok: false, error: "저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  }
  const { data } = await supabase.from("coupang_ops_prefs").select("data").eq("user_id", user.id).maybeSingle();
  const { error } = await supabase.from("coupang_ops_prefs").upsert({ user_id: user.id, data: { ...normalizePrefs(data?.data), alertEmailTo: emailTo }, updated_at: new Date().toISOString() });
  if (error) return { ok: false, error: "받는 주소를 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  revalidatePath("/alerts");
  revalidatePath("/connect");
  return { ok: true, message: "저장했습니다. 시험 메일로 확인해 주세요." };
}

export async function saveSolapiAction(input: { apiKey: string; apiSecret: string; senderPhone: string; pfId: string }): Promise<Done> {
  const user = await requireProgramAccess();
  const row = { api_key: String(input.apiKey ?? "").trim(), api_secret: String(input.apiSecret ?? "").trim(), sender_phone: String(input.senderPhone ?? "").replace(/\D/g, ""), kakao_pf_id: String(input.pfId ?? "").trim() };
  if (!row.api_key || !row.api_secret || !row.sender_phone || !row.kakao_pf_id) return { ok: false, error: "API Key·Secret·발신번호·카카오 채널 ID를 모두 넣어 주세요." };
  const supabase = await createClient();
  const { error } = await supabase.from("user_solapi_accounts").upsert({ user_id: user.id, ...row }, { onConflict: "user_id" });
  if (error) return { ok: false, error: "저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  revalidatePath("/alerts");
  revalidatePath("/connect");
  return { ok: true, message: "저장했습니다. 다른 프로그램에서도 같은 계정을 씁니다." };
}

export async function saveCronKeyAction(apiKey: string): Promise<Done> {
  const user = await requireProgramAccess();
  const key = String(apiKey ?? "").trim();
  if (!key) return { ok: false, error: "cron-job.org API 키를 넣어 주세요." };
  const supabase = await createClient();
  const { error } = await supabase.from("user_api_keys").upsert({ user_id: user.id, provider: CRON_PROVIDER, api_key: key }, { onConflict: "user_id,provider" });
  if (error) return { ok: false, error: "저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  revalidatePath("/alerts");
  revalidatePath("/connect");
  return { ok: true, message: "저장했습니다. 다른 프로그램의 예약에서도 같은 키를 씁니다." };
}

/** 켜기: 회원 전용 토큰을 새로 만들어 회원 cron-job.org 작업에 넣는다. 작업을 못 만들면 켜지 않는다 */
export async function enableDailyAlertAction(hourInput: number, channelsInput: AlertChannel[]): Promise<Done> {
  const user = await requireProgramAccess();
  const hour = cleanHour(hourInput);
  const channels = cleanChannels(channelsInput);
  if (!channels.length) return { ok: false, error: "받을 곳을 하나 이상 골라 주세요." };
  const [keys, key, targets] = await Promise.all([getWingKeys(user.id), cronKey(user.id), loadTargets(user.id)]);
  if (!keys) return { ok: false, error: "먼저 「API키등록·플랫폼연동」에서 키를 등록해 주세요." };
  for (const c of channels) {
    const problem = channelProblem(c, targets);
    if (problem) return { ok: false, error: `${CHANNEL_LABEL[c]}: ${problem}` };
  }
  if (!key) return { ok: false, error: "먼저 cron-job.org API 키를 저장해 주세요." };
  const token = `${TOKEN_PREFIX}_${randomBytes(32).toString("hex")}`;
  const token_hash = createHash("sha256").update(token).digest("hex");
  try {
    await upsertDailyJob(key, JOB_URL, token, hour);
  } catch (e) {
    return { ok: false, error: msg(e, "cron-job.org 작업을 만들지 못했습니다.") };
  }
  const { error } = await createAdminClient().from("coupang_ops_alerts").upsert({ user_id: user.id, enabled: true, hour, channels, token_hash, updated_at: new Date().toISOString() });
  if (error) return { ok: false, error: "설정을 저장하지 못했습니다. 다시 눌러 주세요." };
  revalidatePath("/alerts");
  revalidatePath("/connect");
  return { ok: true, message: `매일 ${hour}시에 요약을 보냅니다.` };
}

export async function disableDailyAlertAction(): Promise<Done> {
  const user = await requireProgramAccess();
  const key = await cronKey(user.id);
  // 작업을 못 꺼도 서버가 요청을 거절하도록 먼저 끈다
  await createAdminClient().from("coupang_ops_alerts").update({ enabled: false, updated_at: new Date().toISOString() }).eq("user_id", user.id);
  revalidatePath("/alerts");
  revalidatePath("/connect");
  try {
    if (key) await stopDailyJob(key, JOB_URL);
    return { ok: true, message: "껐습니다." };
  } catch (e) {
    return { ok: true, message: `껐습니다. 다만 cron-job.org 작업은 직접 꺼 주세요(${msg(e, "연결 오류")}).` };
  }
}

export type AlertStatus = { resendKeySaved: boolean; emailTo: string; enabled: boolean; hour: number; channels: AlertChannel[]; ready: Record<AlertChannel, boolean>; lastRunDate: string; lastResult: string; telegram: string; phoneMasked: string; cronKeySaved: boolean; wingKeysSaved: boolean };

export async function alertStatus(userId: string): Promise<AlertStatus> {
  const [row, t, key, keys] = await Promise.all([
    createAdminClient().from("coupang_ops_alerts").select("enabled,hour,channels,last_run_date,last_result").eq("user_id", userId).maybeSingle().then((r) => r.data),
    loadTargets(userId),
    cronKey(userId),
    getWingKeys(userId),
  ]);
  const ready = Object.fromEntries(ALERT_CHANNELS.map((c) => [c, !channelProblem(c, t)])) as Record<AlertChannel, boolean>;
  return { resendKeySaved: !!t.resendKey, emailTo: t.email, enabled: !!row?.enabled, hour: row?.hour ?? 8, channels: row ? cleanChannels(row.channels) : ["telegram"], ready, lastRunDate: row?.last_run_date ?? "", lastResult: row?.last_result ?? "", telegram: t.telegram ? t.telegram.bot_username || "연결됨" : "", phoneMasked: t.phone ? `끝자리 ${t.phone.replace(/\D/g, "").slice(-4)}` : "", cronKeySaved: !!key, wingKeysSaved: !!keys };
}
