import "server-only";

import type { AiProvider } from "@/lib/aiProviders";
import { getMemberAccount, markMemberAccountNeedsReconnect, updateMemberAccountToken } from "@/lib/memberIntegrations";

// 카톡·이메일 받기(플랜 docs/PLAN_20261025_KAKAO_EMAIL.md). 서버는 회원 본인 토큰·키만 건네고, 보내기는 확장이 회원 PC에서 한다(매물 내용은 서버를 거치지 않음).
// 카카오: 이 프로그램(v1.17 카카오 바로 연결) 또는 「카카오 자동화」에서 회원 본인 카카오 앱으로 한 번 연결한 공용 계정(member_platform_accounts, platform kakao, talk_message)을 쓴다.
// 갱신 토큰은 발급한 카카오 앱으로만 쓸 수 있어서, 공용 계정의 앱(app_ref)이 회원이 등록한 REST API 키와 같을 때만 쓴다(kakao_auto_poster lib/kakao/memberAccount.ts와 같은 규칙).
// 최상위 규칙: 회원 본인 계정·본인 키만. 다른 회원·운영자 값으로 폴백하지 않는다.

type Db = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export const KAKAO_CONNECT_URL = "https://kakao-auto-posting.buylife.xyz/settings";
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

async function memberKey(db: Db, userId: string, provider: string): Promise<string | null> {
  const { data } = await db.from("user_api_keys").select("api_key").eq("user_id", userId).eq("provider", provider).maybeSingle();
  const key = typeof data?.api_key === "string" ? data.api_key.trim() : "";
  return key || null;
}

export type KakaoState =
  | { status: "ok"; accessToken: string; nickname: string | null }
  | { status: "not_connected" | "app_missing" | "app_mismatch" | "reconnect"; message: string };

/** 회원 본인 카카오 「나에게 보내기」 토큰. 만료 직전이면 회원 본인 REST 키로 갱신한다. withToken=false면 상태만(화면 표시용, 갱신 안 함). */
export async function getKakaoState(db: Db, userId: string, withToken = true): Promise<KakaoState> {
  const shared = await getMemberAccount(db, userId, "kakao", { needScopes: ["talk_message"] });
  if (shared.status === "not_connected") return { status: "not_connected", message: "카카오가 아직 연결되지 않았어요. 아래에서 카카오 앱 키를 저장하고 「💬 카카오 연결하기」를 눌러 주세요." };
  if (shared.status === "missing_scopes" || shared.account.needsReconnect || !shared.account.refreshToken) {
    return { status: "reconnect", message: "카카오 연결을 다시 해 주세요(아래 「💬 카카오 연결하기」)." };
  }
  const account = shared.account;
  const restApiKey = await memberKey(db, userId, "kakao_rest_api_key");
  if (!restApiKey) return { status: "app_missing", message: "카카오 앱 REST API 키를 먼저 저장해 주세요." };
  if (account.appRef !== restApiKey) return { status: "app_mismatch", message: "카카오 앱 키가 바뀌었어요. 「💬 카카오 연결하기」를 다시 눌러 주세요." };

  const expiresAt = account.tokenExpiresAt ? new Date(account.tokenExpiresAt).getTime() : 0;
  if (!withToken || expiresAt - Date.now() > EXPIRY_BUFFER_MS) return { status: "ok", accessToken: withToken ? account.accessToken : "", nickname: account.username };

  const form: Record<string, string> = { grant_type: "refresh_token", client_id: restApiKey, refresh_token: account.refreshToken! };
  const clientSecret = await memberKey(db, userId, "kakao_client_secret");
  if (clientSecret) form.client_secret = clientSecret;
  const res = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams(form).toString(),
  });
  const body = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; refresh_token?: string };
  if (!res.ok || !body.access_token) {
    await markMemberAccountNeedsReconnect(db, userId, account.id);
    return { status: "reconnect", message: "카카오 연결이 만료됐어요. 「💬 카카오 연결하기」를 다시 눌러 주세요." };
  }
  await updateMemberAccountToken(db, userId, account.id, {
    accessToken: body.access_token,
    tokenExpiresAt: new Date(Date.now() + (body.expires_in ?? 21599) * 1000).toISOString(),
    refreshToken: body.refresh_token ?? null,
  });
  return { status: "ok", accessToken: body.access_token, nickname: account.username };
}

/** 카카오 앱 REST API 키를 저장해 두었는지(화면 표시용 — 키 값은 화면으로 보내지 않음) */
export async function hasKakaoKey(db: Db, userId: string): Promise<boolean> {
  return !!(await memberKey(db, userId, "kakao_rest_api_key"));
}

/** 쓸 AI → 공용 user_api_keys provider 이름(Claude는 다른 프로그램과 같은 anthropic) */
export const AI_KEY_PROVIDER: Record<AiProvider, string> = { gemini: "gemini", openai: "openai", claude: "anthropic" };
/** 🤖 AI 시세 요약(v1.22): 회원 본인 AI 키(공용 user_api_keys openai·gemini — 다른 AIMaster 프로그램과 같은 키). 없으면 null */
export function getAiKey(db: Db, userId: string, provider: AiProvider): Promise<string | null> {
  return memberKey(db, userId, AI_KEY_PROVIDER[provider]);
}

/** 화면용: AI 키 등록 여부만(값은 보내지 않음) */
export async function getAiKeyStatus(db: Db, userId: string): Promise<{ hasGemini: boolean; hasOpenai: boolean; hasClaude: boolean }> {
  const [g, o, c] = await Promise.all([memberKey(db, userId, "gemini"), memberKey(db, userId, "openai"), memberKey(db, userId, "anthropic")]);
  return { hasGemini: Boolean(g), hasOpenai: Boolean(o), hasClaude: Boolean(c) };
}

/** 회원 본인 메일 발송 키(Resend). 없으면 null. */
export function getResendKey(db: Db, userId: string): Promise<string | null> {
  return memberKey(db, userId, "resend_api_key");
}
