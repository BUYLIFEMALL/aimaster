import { NextResponse } from "next/server";
import { verifyExtensionToken } from "@/lib/extensionAuth";
import { createServiceClient } from "@/lib/supabase/service";
import { COLLECT_RULES } from "@/lib/collectRules";
import { DEFAULT_INTERVAL_MINUTES } from "@/lib/schedule";
import { APP_VERSION } from "@/lib/version";
import { aiProviderInfo, toAiProvider } from "@/lib/aiProviders";
import { getAiKey, getKakaoState, getResendKey } from "@/lib/notifyChannels";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 확장이 수집 전에 받는 회원 설정. 이 회원 본인 행만(서비스 키 + userId 조건, 멀티테넌시 원칙 2).
// 텔레그램 봇 토큰은 회원 본인 것 — 확장이 회원 PC에서 회원 봇으로 바로 보내기 위해 내려준다(매물은 서버를 거치지 않음).
export async function GET(request: Request) {
  const user = await verifyExtensionToken(request);
  if (!user) return NextResponse.json({ error: "유효하지 않은 연동 토큰이거나 이용 권한이 없습니다." }, { status: 401 });
  const supabase = createServiceClient();
  const [{ data: targets }, { data: s }, { data: tg }] = await Promise.all([
    supabase
      .from("realty_alert_targets")
      .select("complex_no, complex_name, target_type, cortar_no, region_name, region_max_complexes, trade_types, price_min, price_max, area_min, area_max")
      .eq("user_id", user.userId)
      .eq("enabled", true)
      .order("created_at", { ascending: true }),
    supabase.from("realty_alert_settings").select("*").eq("user_id", user.userId).maybeSingle(),
    supabase
      .from("user_telegram_links")
      .select("bot_token, chat_id")
      .eq("user_id", user.userId)
      .eq("program_slug", "realty-listing-alert")
      .maybeSingle(),
  ]);
  // 카톡·이메일(2026-10-25): 켠 채널만 회원 본인 토큰·키를 내려준다 — 확장이 회원 PC에서 직접 보낸다(매물은 서버를 거치지 않음)
  const kakaoState = s?.notify_kakao ? await getKakaoState(supabase, user.userId) : null;
  const resendKey = s?.notify_email ? await getResendKey(supabase, user.userId) : null;
  // 🤖 AI 시세 요약(v1.22): 켠 회원에게만 회원 본인 AI 키를 건넨다 — 확장이 회원 PC에서 숫자 통계만 보내 하루 1번 요약
  const aiProvider = toAiProvider(s?.ai_provider);
  const aiKey = s?.notify_ai_summary ? await getAiKey(supabase, user.userId, aiProvider) : null;
  return NextResponse.json({
    latestVersion: APP_VERSION,
    rulesVersion: COLLECT_RULES.version,
    targets: targets ?? [],
    schedule: {
      enabled: s?.schedule_enabled ?? false,
      intervalMinutes: s?.interval_minutes ?? DEFAULT_INTERVAL_MINUTES,
      startHour: s?.active_hour_start ?? null,
      endHour: s?.active_hour_end ?? null,
    },
    delivery: {
      notifyNew: s?.notify_new ?? true,
      notifyPriceDrop: s?.notify_price_drop ?? true,
      notifyPriceChange: s?.notify_price_change ?? false,
      notifyGone: s?.notify_gone ?? false,
      deliverTelegram: s?.deliver_telegram ?? true,
      deliverFile: s?.deliver_file ?? true,
      fileFormat: s?.file_format === "csv" ? "csv" : "xlsx",
    },
    telegram: tg?.bot_token && tg.chat_id ? { botToken: tg.bot_token, chatId: tg.chat_id } : null,
    kakao: kakaoState ? (kakaoState.status === "ok" ? { accessToken: kakaoState.accessToken } : { error: kakaoState.message }) : null,
    ai: s?.notify_ai_summary ? (aiKey ? { provider: aiProvider, apiKey: aiKey } : { error: `AI 시세 요약을 켰지만 ${aiProviderInfo(aiProvider).name} 키가 없어요. 다른 AIMaster 프로그램이나 「API키등록·플랫폼연동」에서 등록해 주세요.` }) : null,
    email: s?.notify_email ? (resendKey && s?.email_to ? { apiKey: resendKey, to: s.email_to } : { error: "이메일 받기를 켰지만 Resend 키나 받는 주소(Resend 가입 메일)가 없어요. 「받는 방법」 화면에서 확인해 주세요." }) : null,
  });
}
