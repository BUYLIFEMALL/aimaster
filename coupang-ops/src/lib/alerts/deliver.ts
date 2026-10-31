import "server-only";
import { sendResendMail } from "@/lib/alerts/resend";
import { normalizePrefs } from "@/lib/coupang/prefs";
import { sendFriendtalk } from "@/lib/solapi/client";
import { sendTelegramMessage } from "@/lib/telegram/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { CHANNEL_LABEL, type AlertChannel } from "@/lib/coupang/summary";

// 회원 본인 계정으로만 보낸다(텔레그램 봇·Resend·SOLAPI, 운영자 계정 폴백 없음). 등록 표는 다른 프로그램과 공용이라 한 번 등록하면 재사용된다.
export async function loadTargets(userId: string) {
  const admin = createAdminClient();
  const [links, resend, prefs, solapi, profile, auth] = await Promise.all([
    admin.from("user_telegram_links").select("program_slug,bot_token,chat_id,bot_username").eq("user_id", userId),
    admin.from("user_api_keys").select("api_key").eq("user_id", userId).eq("provider", "resend_api_key").maybeSingle(),
    admin.from("coupang_ops_prefs").select("data").eq("user_id", userId).maybeSingle(),
    admin.from("user_solapi_accounts").select("api_key,api_secret,sender_phone,kakao_pf_id,rcs_brand_id").eq("user_id", userId).maybeSingle(),
    admin.from("profiles").select("phone").eq("id", userId).maybeSingle(),
    admin.auth.admin.getUserById(userId),
  ]);
  const rows = (links.data ?? []) as { program_slug: string; bot_token: string; chat_id: string; bot_username: string | null }[];
  return {
    telegram: rows.find((r) => r.program_slug === "coupang-ops") ?? rows[0] ?? null,
    resendKey: String(resend.data?.api_key ?? ""),
    solapi: solapi.data ?? null,
    phone: String(profile.data?.phone ?? ""),
    email: normalizePrefs(prefs.data?.data).alertEmailTo || (auth.data.user?.email ?? ""),
  };
}
export type Targets = Awaited<ReturnType<typeof loadTargets>>;

export function channelProblem(channel: AlertChannel, t: Targets): string {
  if (channel === "telegram") return t.telegram ? "" : "텔레그램 연결이 없습니다.";
  if (channel === "email") return t.resendKey && t.email ? "" : "Resend 키가 없습니다.";
  if (!t.solapi?.kakao_pf_id) return "SOLAPI 계정과 카카오 채널 ID가 없습니다.";
  return t.phone ? "" : "핸드폰 번호가 없습니다.";
}

/** 채널마다 따로 보내 한 곳이 실패해도 나머지는 간다. 재시도 없음(이중 발송·과금 방지). 결과에는 비밀값을 담지 않는다 */
export async function deliver(channels: AlertChannel[], t: Targets, subject: string, text: string): Promise<string> {
  const results: string[] = [];
  for (const channel of channels) {
    const problem = channelProblem(channel, t);
    if (problem) {
      results.push(`${CHANNEL_LABEL[channel]} 건너뜀(${problem})`);
      continue;
    }
    try {
      if (channel === "telegram") await sendTelegramMessage({ botToken: t.telegram!.bot_token, chatId: t.telegram!.chat_id, text });
      else if (channel === "email") {
        const r = await sendResendMail(t.resendKey, { to: t.email, subject, text });
        if (!r.ok) {
          results.push(`${CHANNEL_LABEL[channel]} 실패(${r.error})`);
          continue;
        }
      }
      else await sendFriendtalk(t.solapi!, t.phone.replace(/\D/g, ""), text);
      results.push(`${CHANNEL_LABEL[channel]} 보냄`);
    } catch (e) {
      console.error("[coupang-alert]", channel, (e as Error).name);
      results.push(`${CHANNEL_LABEL[channel]} 실패`);
    }
  }
  return results.join(" · ");
}
