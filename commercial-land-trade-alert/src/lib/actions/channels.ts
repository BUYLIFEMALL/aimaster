"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { getKakaoState, getResendKey } from "@/lib/notifyChannels";
import { sendKakaoMemo, sendResendMail } from "@/lib/notifySend";
import { isClientSecret, isRestApiKey, kakaoAuthorizeUrl, makeState, STATE_COOKIE } from "@/lib/kakaoOAuth";

// 받는 곳 설정(텔레그램 → 이메일 → 카카오톡). 회원 본인 행만, 공용 user_api_keys를 재사용한다.
export interface ChannelResult {
  error?: string;
  success?: string;
  suggestEmail?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => createAdminClient() as any;
const SITE = "https://commercial-land-trade-alert.buylife.xyz";

export async function saveChannelSwitchesAction(_: ChannelResult, formData: FormData): Promise<ChannelResult> {
  const user = await requireProgramAccess();
  const email = String(formData.get("emailTo") ?? "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "받는 메일 주소 형식을 확인해 주세요." };
  const { error } = await db().from("commercial_land_preferences").upsert(
    { user_id: user.id, notify_telegram: formData.get("telegram") === "on", notify_email: formData.get("email") === "on", email_to: email || null, notify_kakao: formData.get("kakao") === "on", updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error) return { error: `저장에 실패했습니다: ${error.message}` };
  revalidatePath("/settings");
  return { success: "저장했어요." };
}

export async function saveResendKeyAction(_: ChannelResult, formData: FormData): Promise<ChannelResult> {
  const user = await requireProgramAccess();
  const key = String(formData.get("resendKey") ?? "").trim();
  if (!/^re_[A-Za-z0-9_]{10,}$/.test(key)) return { error: "Resend API 키는 re_로 시작해요. Resend의 API Keys 화면에서 다시 복사해 주세요." };
  const { error } = await db().from("user_api_keys").upsert({ user_id: user.id, provider: "resend_api_key", api_key: key }, { onConflict: "user_id,provider" });
  if (error) return { error: `저장에 실패했습니다: ${error.message}` };
  revalidatePath("/settings");
  return { success: "Resend 키를 저장했어요." };
}

export async function sendTestEmailAction(): Promise<ChannelResult> {
  const user = await requireProgramAccess();
  const key = await getResendKey(db(), user.id);
  if (!key) return { error: "먼저 Resend API 키를 저장해 주세요." };
  const { data: s } = await db().from("commercial_land_preferences").select("email_to").eq("user_id", user.id).maybeSingle();
  if (!s?.email_to) return { error: "받는 메일 주소를 넣고 저장해 주세요(무료 Resend는 가입한 메일로만 보낼 수 있어요)." };
  const r = await sendResendMail(key, { to: s.email_to, subject: "🏢 [상가·건물·토지 매물] 시험 메일이에요", text: "이메일 받기가 연결됐어요. 새 매물과 가격 변동, 새 실거래가 있으면 이 주소로 알려 드려요." });
  if (!r.ok) return { error: r.error, suggestEmail: r.ownerEmail };
  return { success: `${s.email_to} 로 시험 메일을 보냈어요.` };
}

export async function saveKakaoKeysAction(_: ChannelResult, formData: FormData): Promise<ChannelResult> {
  const user = await requireProgramAccess();
  const rest = String(formData.get("kakaoRestKey") ?? "").trim();
  const secret = String(formData.get("kakaoSecret") ?? "").trim();
  if (!isRestApiKey(rest)) return { error: "REST API 키는 영문·숫자 32자예요. 카카오 개발자 내 앱의 플랫폼 키에서 복사해 주세요." };
  if (secret && !isClientSecret(secret)) return { error: "클라이언트 시크릿 모양을 확인해 주세요." };
  const rows = [{ user_id: user.id, provider: "kakao_rest_api_key", api_key: rest }];
  if (secret) rows.push({ user_id: user.id, provider: "kakao_client_secret", api_key: secret });
  const { error } = await db().from("user_api_keys").upsert(rows, { onConflict: "user_id,provider" });
  if (error) return { error: `저장에 실패했습니다: ${error.message}` };
  revalidatePath("/settings");
  return { success: "카카오 앱 키를 저장했어요. 이제 「카카오 연결하기」를 눌러 주세요." };
}

export async function startKakaoConnectAction(): Promise<ChannelResult & { url?: string }> {
  const user = await requireProgramAccess();
  const { data } = await db().from("user_api_keys").select("api_key").eq("user_id", user.id).eq("provider", "kakao_rest_api_key").maybeSingle();
  const rest = typeof data?.api_key === "string" ? data.api_key.trim() : "";
  if (!rest) return { error: "먼저 카카오 REST API 키를 저장해 주세요." };
  const state = makeState(user.id, crypto.randomUUID().replace(/-/g, ""));
  (await cookies()).set(STATE_COOKIE, state, { httpOnly: true, secure: true, sameSite: "lax", path: "/api/kakao", maxAge: 600 });
  return { url: kakaoAuthorizeUrl(rest, state) };
}

export async function sendTestKakaoAction(): Promise<ChannelResult> {
  const user = await requireProgramAccess();
  const state = await getKakaoState(db(), user.id);
  if (state.status !== "ok") return { error: state.message };
  const r = await sendKakaoMemo(state.accessToken, { text: "[상가·건물·토지 매물] 카톡 받기가 연결됐어요. 새 매물과 가격 변동, 새 실거래가 있으면 요약을 보내 드려요.", url: `${SITE}/dashboard` });
  if (!r.ok) return { error: r.error };
  return { success: "카카오톡 「나와의 채팅」으로 시험 메시지를 보냈어요." };
}
