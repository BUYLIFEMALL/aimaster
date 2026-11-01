import "server-only";
import { sendResendMail } from "@/lib/alerts/resend";
import { normalizePrefs } from "@/lib/coupang/prefs";
import { getKakaoState, hasKakaoKey, sendKakaoMemo } from "@/lib/kakao/memo";
import { KAKAO_LINK } from "@/lib/kakao/oauth";
import { sendTelegramMessage } from "@/lib/telegram/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { CHANNEL_LABEL, type AlertChannel } from "@/lib/coupang/summary";

// 회원 본인 계정으로만 보낸다(텔레그램 봇·Resend·카카오 앱, 운영자 계정 폴백 없음). Resend·카카오는 다른 프로그램과 공용으로 재사용한다.
// 텔레그램 봇은 쿠팡 전용이다(2026-11-01 주인님 지시): 이 프로그램 줄만 읽고 다른 프로그램의 봇을 빌려 쓰지 않는다.
export async function loadTargets(userId: string) {
  const admin = createAdminClient();
  const [link, resend, prefs, kakao, kakaoKey, auth] = await Promise.all([
    admin.from("user_telegram_links").select("bot_token,chat_id,bot_username").eq("user_id", userId).eq("program_slug", "coupang-ops").maybeSingle(),
    admin.from("user_api_keys").select("api_key").eq("user_id", userId).eq("provider", "resend_api_key").maybeSingle(),
    admin.from("coupang_ops_prefs").select("data").eq("user_id", userId).maybeSingle(),
    getKakaoState(admin, userId, false),
    hasKakaoKey(admin, userId),
    admin.auth.admin.getUserById(userId),
  ]);
  return {
    userId,
    kakao,
    kakaoKey,
    telegram: link.data as { bot_token: string; chat_id: string; bot_username: string | null } | null,
    resendKey: String(resend.data?.api_key ?? ""),
    email: normalizePrefs(prefs.data?.data).alertEmailTo || (auth.data.user?.email ?? ""),
  };
}
export type Targets = Awaited<ReturnType<typeof loadTargets>>;

export function channelProblem(channel: AlertChannel, t: Targets): string {
  if (channel === "telegram") return t.telegram ? "" : "텔레그램 연결이 없습니다.";
  if (channel === "email") return t.resendKey && t.email ? "" : "Resend 키가 없습니다.";
  return t.kakao.ok ? "" : t.kakao.message;
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
      else {
        const state = await getKakaoState(createAdminClient(), t.userId);
        const r = state.ok ? await sendKakaoMemo(state.accessToken, { text, url: KAKAO_LINK }) : ({ ok: false, error: state.message } as const);
        if (!r.ok) {
          results.push(`${CHANNEL_LABEL[channel]} 실패(${r.error})`);
          continue;
        }
      }
      results.push(`${CHANNEL_LABEL[channel]} 보냄`);
    } catch (e) {
      console.error("[coupang-alert]", channel, (e as Error).name);
      results.push(`${CHANNEL_LABEL[channel]} 실패`);
    }
  }
  return results.join(" · ");
}
