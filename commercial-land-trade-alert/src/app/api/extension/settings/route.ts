import { NextResponse } from "next/server";
import { verifyExtensionToken } from "@/lib/extensionAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getKakaoState, getResendKey } from "@/lib/notifyChannels";
import { telegramLinkFor } from "@/lib/trades/collect";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 확장이 수집 전에 받는 회원 설정. 켠 채널만 회원 본인 토큰·키를 내려준다. 확장이 회원 PC에서 바로 보낸다.
export async function GET(request: Request) {
  const user = await verifyExtensionToken(request);
  if (!user) return NextResponse.json({ error: "유효하지 않은 연결 코드이거나 이용 권한이 없습니다." }, { status: 401 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const [{ data: targets }, { data: s }] = await Promise.all([
    db.from("commercial_land_listing_targets").select("id, name, url, kinds, trade_types, price_min, price_max, area_min, area_max").eq("user_id", user.userId).eq("enabled", true).order("created_at"),
    db.from("commercial_land_preferences").select("*").eq("user_id", user.userId).maybeSingle(),
  ]);
  const tg = s?.notify_telegram === false ? null : await telegramLinkFor(db, user.userId);
  const resendKey = s?.notify_email ? await getResendKey(db, user.userId) : null;
  const kakaoState = s?.notify_kakao ? await getKakaoState(db, user.userId) : null;
  return NextResponse.json({
    latestVersion: APP_VERSION,
    targets: targets ?? [],
    schedule: { enabled: s?.schedule_enabled ?? false, intervalMinutes: s?.interval_minutes ?? 360, startHour: s?.active_hour_start ?? null, endHour: s?.active_hour_end ?? null },
    delivery: { notifyNew: s?.listing_notify_new ?? true, notifyDrop: s?.listing_notify_drop ?? true, notifyRise: s?.listing_notify_rise ?? false, notifyGone: s?.listing_notify_gone ?? false, deliverFile: true },
    telegram: tg?.bot_token ? { botToken: tg.bot_token, chatId: tg.chat_id } : null,
    email: s?.notify_email ? (resendKey && s?.email_to ? { apiKey: resendKey, to: s.email_to } : { error: "이메일 받기를 켰지만 Resend 키나 받는 주소가 없어요." }) : null,
    kakao: kakaoState ? (kakaoState.status === "ok" ? { accessToken: kakaoState.accessToken } : { error: kakaoState.message }) : null,
  });
}
