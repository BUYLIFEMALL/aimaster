"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createServiceClient } from "@/lib/supabase/service";
import { getKakaoState, getResendKey } from "@/lib/notifyChannels";
import { RESEND_FROM, sendKakaoMemo, sendResendMail } from "@/lib/notifySend";
import { cookies } from "next/headers";
import { isClientSecret, isRestApiKey, kakaoAuthorizeUrl, makeState, STATE_COOKIE } from "@/lib/kakaoOAuth";

// 카톡·이메일 받기 설정 동작(플랜 docs/PLAN_20261025_KAKAO_EMAIL.md). 회원 본인 행만(userId 조건, 서비스 키).
// 시험 보내기는 매물 내용이 없는 안내 문장만 보낸다 — 실제 알림은 확장이 회원 PC에서 보낸다.

type Result = { error?: string; success?: string; suggestEmail?: string };

export async function saveResendKeyAction(_: Result, formData: FormData): Promise<Result> {
  const user = await requireProgramAccess();
  const key = String(formData.get("resendKey") ?? "").trim();
  if (!/^re_[A-Za-z0-9_]{10,}$/.test(key)) return { error: "Resend API 키는 re_로 시작하는 긴 글자예요. Resend의 API Keys 화면에서 다시 복사해 주세요." };
  const db = createServiceClient();
  const { error } = await db.from("user_api_keys").upsert({ user_id: user.id, provider: "resend_api_key", api_key: key }, { onConflict: "user_id,provider" });
  if (error) return { error: `저장에 실패했습니다: ${error.message}` };
  revalidatePath("/delivery");
  revalidatePath("/settings");
  return { success: "Resend 키를 저장했어요. 「시험 메일 보내기」로 확인해 보세요." };
}

export async function deleteResendKeyAction(): Promise<Result> {
  const user = await requireProgramAccess();
  const db = createServiceClient();
  const { error } = await db.from("user_api_keys").delete().eq("user_id", user.id).eq("provider", "resend_api_key");
  if (error) return { error: `삭제에 실패했습니다: ${error.message}` };
  revalidatePath("/delivery");
  revalidatePath("/settings");
  return { success: "Resend 키를 지웠어요." };
}

export async function sendTestEmailAction(): Promise<Result> {
  const user = await requireProgramAccess();
  const db = createServiceClient();
  const key = await getResendKey(db, user.id);
  if (!key) return { error: "먼저 Resend API 키를 저장해 주세요." };
  const { data: s } = await db.from("realty_alert_settings").select("email_to").eq("user_id", user.id).maybeSingle();
  const to = s?.email_to;
  if (!to) return { error: "받는 메일 주소(Resend에 가입한 메일)를 먼저 넣고 「주소 저장」을 눌러 주세요." };
  const r = await sendResendMail(key, {
    to,
    subject: "🏠 [매물 알림] 시험 메일이에요",
    text: `부동산 실시간 매물 알림의 이메일 받기가 연결됐어요.\n앞으로 새 매물·가격 변동이 있으면 이 주소로 요약과 엑셀 파일을 보내 드려요.\n\n보내는 주소: ${RESEND_FROM}`,
  });
  if (!r.ok) return { error: r.error, suggestEmail: r.ownerEmail };
  return { success: `${to} 로 시험 메일을 보냈어요. 1~2분 안에 받은편지함(없으면 스팸함)을 확인해 주세요.` };
}

export async function sendTestKakaoAction(): Promise<Result> {
  const user = await requireProgramAccess();
  const state = await getKakaoState(createServiceClient(), user.id);
  if (state.status !== "ok") return { error: state.message };
  const r = await sendKakaoMemo(state.accessToken, {
    text: "🏠 [매물 알림] 카톡 받기가 연결됐어요. 새 매물·가격 변동이 있으면 요약을 보내 드려요(엑셀 파일은 텔레그램·이메일로).",
    url: "https://realty-listing-alert.buylife.xyz/dashboard",
  });
  if (!r.ok) return { error: r.error };
  return { success: "카카오톡 「나와의 채팅」으로 시험 메시지를 보냈어요." };
}

// 💬 카카오 바로 연결(2026-10-25, v1.17) — 회원 본인 카카오 앱 키를 공용 user_api_keys에 저장(카카오 자동화와 같은 이름이라 두 프로그램이 함께 씀)
export async function saveKakaoKeysAction(_: Result, formData: FormData): Promise<Result> {
  const user = await requireProgramAccess();
  const rest = String(formData.get("kakaoRestKey") ?? "").trim();
  const secret = String(formData.get("kakaoSecret") ?? "").trim();
  if (!isRestApiKey(rest)) return { error: "REST API 키는 영문·숫자 32자예요. 카카오 개발자 → 내 앱 → 「앱 → 플랫폼 키」 맨 왼쪽 「REST API 키」를 다시 복사해 주세요(JavaScript 키·네이티브 앱 키가 아니에요)." };
  if (secret && !isClientSecret(secret)) return { error: "클라이언트 시크릿 모양이 이상해요. 「플랫폼 키」의 REST API 키 카드를 눌러 아래 「클라이언트 시크릿 → 카카오 로그인 → 코드」를 다시 복사해 주세요." };
  const db = createServiceClient();
  const rows = [{ user_id: user.id, provider: "kakao_rest_api_key", api_key: rest }];
  if (secret) rows.push({ user_id: user.id, provider: "kakao_client_secret", api_key: secret });
  const { error } = await db.from("user_api_keys").upsert(rows, { onConflict: "user_id,provider" });
  if (error) return { error: `저장에 실패했습니다: ${error.message}` };
  revalidatePath("/delivery");
  revalidatePath("/settings");
  return { success: "카카오 앱 키를 저장했어요. 이제 「💬 카카오 연결하기」를 눌러 주세요." };
}

/** 카카오 동의 화면 주소를 만든다. 1회용 확인값은 10분짜리 쿠키에 두고 콜백에서 대조한다. */
export async function startKakaoConnectAction(): Promise<Result & { url?: string }> {
  const user = await requireProgramAccess();
  const db = createServiceClient();
  const { data } = await db.from("user_api_keys").select("api_key").eq("user_id", user.id).eq("provider", "kakao_rest_api_key").maybeSingle();
  const rest = typeof data?.api_key === "string" ? data.api_key.trim() : "";
  if (!rest) return { error: "먼저 카카오 REST API 키를 저장해 주세요." };
  const state = makeState(user.id, crypto.randomUUID().replace(/-/g, ""));
  const jar = await cookies();
  jar.set(STATE_COOKIE, state, { httpOnly: true, secure: true, sameSite: "lax", path: "/api/kakao", maxAge: 600 });
  return { url: kakaoAuthorizeUrl(rest, state) };
}
