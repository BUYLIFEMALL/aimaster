import "server-only";

import { aiEngine, AI_ENGINES, type AiProvider } from "@/lib/aiEngines";
import { getMemberAccount, markMemberAccountNeedsReconnect, updateMemberAccountToken } from "@/lib/memberIntegrations";

// 카톡·이메일 키. 기준: realty-listing-alert/lib/notifyChannels.ts. 회원 본인 계정·키만 쓰고 폴백하지 않는다.
type Db = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

async function memberKey(db: Db, userId: string, provider: string): Promise<string | null> {
  const { data } = await db.from("user_api_keys").select("api_key").eq("user_id", userId).eq("provider", provider).maybeSingle();
  const key = typeof data?.api_key === "string" ? data.api_key.trim() : "";
  return key || null;
}

export type KakaoState =
  | { status: "ok"; accessToken: string; nickname: string | null }
  | { status: "not_connected" | "app_missing" | "app_mismatch" | "reconnect"; message: string };

/** 회원 본인 카카오 「나에게 보내기」 토큰. 만료 직전이면 회원 본인 REST 키로 갱신한다. withToken=false면 상태만 본다 */
export async function getKakaoState(db: Db, userId: string, withToken = true): Promise<KakaoState> {
  const shared = await getMemberAccount(db, userId, "kakao", { needScopes: ["talk_message"] });
  if (shared.status === "not_connected") return { status: "not_connected", message: "카카오가 아직 연결되지 않았어요. 카카오 앱 키를 저장하고 「카카오 연결하기」를 눌러 주세요." };
  if (shared.status === "missing_scopes" || shared.account.needsReconnect || !shared.account.refreshToken) {
    return { status: "reconnect", message: "카카오 연결을 다시 해 주세요." };
  }
  const account = shared.account;
  const restApiKey = await memberKey(db, userId, "kakao_rest_api_key");
  if (!restApiKey) return { status: "app_missing", message: "카카오 앱 REST API 키를 먼저 저장해 주세요." };
  if (account.appRef !== restApiKey) return { status: "app_mismatch", message: "카카오 앱 키가 바뀌었어요. 「카카오 연결하기」를 다시 눌러 주세요." };

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
    return { status: "reconnect", message: "카카오 연결이 만료됐어요. 「카카오 연결하기」를 다시 눌러 주세요." };
  }
  await updateMemberAccountToken(db, userId, account.id, {
    accessToken: body.access_token,
    tokenExpiresAt: new Date(Date.now() + (body.expires_in ?? 21599) * 1000).toISOString(),
    refreshToken: body.refresh_token ?? null,
  });
  return { status: "ok", accessToken: body.access_token, nickname: account.username };
}

export const hasKakaoKey = async (db: Db, userId: string) => !!(await memberKey(db, userId, "kakao_rest_api_key"));
export const getAiKey = (db: Db, userId: string, provider: AiProvider) => memberKey(db, userId, aiEngine(provider).keyProvider);

/** 화면용: 키 끝 4자리만 보낸다. 없으면 null */
export async function aiKeyTails(db: Db, userId: string): Promise<Record<AiProvider, string | null>> {
  const out = { openai: null, claude: null, gemini: null } as Record<AiProvider, string | null>;
  await Promise.all(AI_ENGINES.map(async (e) => {
    const key = await memberKey(db, userId, e.keyProvider);
    out[e.id] = key ? key.slice(-4) : null;
  }));
  return out;
}
export const getResendKey = (db: Db, userId: string) => memberKey(db, userId, "resend_api_key");
