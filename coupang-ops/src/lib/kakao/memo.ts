import "server-only";
import { getMemberAccount, markMemberAccountNeedsReconnect, updateMemberAccountToken } from "@/lib/memberIntegrations";

// 카카오 「나에게 보내기」. 기준 realty-listing-alert lib/notifyChannels.ts·lib/notifySend.ts.
// 공용 계정(member_platform_accounts)과 회원 본인 REST 키만 쓴다. 다른 회원·운영자 값으로 폴백하지 않는다.
type Db = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

async function memberKey(db: Db, userId: string, provider: string): Promise<string> {
  const { data } = await db.from("user_api_keys").select("api_key").eq("user_id", userId).eq("provider", provider).maybeSingle();
  return typeof data?.api_key === "string" ? data.api_key.trim() : "";
}
export const hasKakaoKey = async (db: Db, userId: string) => !!(await memberKey(db, userId, "kakao_rest_api_key"));

export type KakaoState = { ok: true; accessToken: string; nickname: string | null } | { ok: false; message: string };

/** withToken=false면 상태만 본다(화면 표시용, 갱신 안 함). 만료 직전이면 회원 본인 REST 키로 갱신한다 */
export async function getKakaoState(db: Db, userId: string, withToken = true): Promise<KakaoState> {
  const shared = await getMemberAccount(db, userId, "kakao", { needScopes: ["talk_message"] });
  if (shared.status === "not_connected") return { ok: false, message: "카카오가 아직 연결되지 않았습니다." };
  if (shared.status === "missing_scopes" || shared.account.needsReconnect || !shared.account.refreshToken) return { ok: false, message: "카카오를 다시 연결해 주세요." };
  const account = shared.account;
  const restApiKey = await memberKey(db, userId, "kakao_rest_api_key");
  if (!restApiKey) return { ok: false, message: "카카오 앱 REST API 키를 먼저 저장해 주세요." };
  if (account.appRef !== restApiKey) return { ok: false, message: "카카오 앱 키가 바뀌었습니다. 다시 연결해 주세요." };

  const expiresAt = account.tokenExpiresAt ? new Date(account.tokenExpiresAt).getTime() : 0;
  if (!withToken || expiresAt - Date.now() > EXPIRY_BUFFER_MS) return { ok: true, accessToken: withToken ? account.accessToken : "", nickname: account.username };

  const form: Record<string, string> = { grant_type: "refresh_token", client_id: restApiKey, refresh_token: account.refreshToken! };
  const clientSecret = await memberKey(db, userId, "kakao_client_secret");
  if (clientSecret) form.client_secret = clientSecret;
  const res = await fetch("https://kauth.kakao.com/oauth/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" }, body: new URLSearchParams(form).toString() });
  const body = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; refresh_token?: string };
  if (!res.ok || !body.access_token) {
    await markMemberAccountNeedsReconnect(db, userId, account.id);
    return { ok: false, message: "카카오 연결이 만료됐습니다. 다시 연결해 주세요." };
  }
  await updateMemberAccountToken(db, userId, account.id, { accessToken: body.access_token, tokenExpiresAt: new Date(Date.now() + (body.expires_in ?? 21599) * 1000).toISOString(), refreshToken: body.refresh_token ?? null });
  return { ok: true, accessToken: body.access_token, nickname: account.username };
}

/** 카카오 메시지는 200자까지 */
export async function sendKakaoMemo(accessToken: string, msg: { text: string; url: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const template = { object_type: "text", text: msg.text.slice(0, 200), link: { web_url: msg.url, mobile_web_url: msg.url }, button_title: "처리하기" };
  const res = await fetch("https://kapi.kakao.com/v2/api/talk/memo/default/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams({ template_object: JSON.stringify(template) }).toString(),
  });
  if (res.ok) return { ok: true };
  return { ok: false, error: `카카오 보내기에 실패했습니다(${res.status}).` };
}
