import "server-only";
// 구글 블로그 연결(2-3) — 회원 본인 구글 OAuth 앱(user_api_keys google_client_id/secret, 유튜브 자동화와 같은 키)으로만.
// 공용 연결 표(member_platform_accounts, platform=blogger)에 저장해 다른 프로그램도 다시 묻지 않고 쓴다.
// 운영자 공용 앱·다른 회원 키로 대신하지 않는다(최상위 규칙).
import { getMemberAccount, saveMemberAccount, updateMemberAccountToken, markMemberAccountNeedsReconnect, type MemberPlatform, type MemberAccount } from "./memberIntegrations";
import { BLOGGER_SCOPE, listBlogs, type BloggerBlog } from "./publish/blogger";
import { PublishError } from "./publish/types";
import type { FetchLike } from "./publish/http";
import { getMemberKey } from "./memberKeys";
export { getMemberKey };

const BLOGGER = "blogger" as unknown as MemberPlatform; // 공용 형식에 아직 없음(docs/IMPROVEMENTS.md)
export const SITE_ORIGIN = "https://wp-blogger-auto.buylife.xyz";
export const GOOGLE_REDIRECT_URI = `${SITE_ORIGIN}/api/oauth/google/callback`;
export const GOOGLE_SCOPES = ["openid", "email", BLOGGER_SCOPE];
export const OAUTH_COOKIE = "wba_google_oauth";
const AUTHORIZE = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminDb = { from: (table: string) => any };
type Deps = { fetchImpl?: FetchLike; now?: () => number };

export async function getGoogleApp(admin: AdminDb, userId: string) {
  const [clientId, clientSecret] = await Promise.all([getMemberKey(admin, userId, "google_client_id"), getMemberKey(admin, userId, "google_client_secret")]);
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function authorizeUrl(clientId: string, state: string): string {
  const p = new URLSearchParams({
    client_id: clientId,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${AUTHORIZE}?${p.toString()}`;
}

type TokenResponse = { access_token: string; refresh_token?: string; expires_in: number; scope?: string; id_token?: string; error?: string; error_description?: string };

async function tokenRequest(params: Record<string, string>, deps: Deps): Promise<TokenResponse> {
  const f = deps.fetchImpl ?? fetch;
  const res = await f(TOKEN, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(params).toString() });
  const body = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || !body.access_token) {
    const code = body.error === "invalid_grant" ? "auth" : body.error === "invalid_client" || body.error === "unauthorized_client" ? "bad_request" : "server";
    const msg =
      body.error === "invalid_grant" ? "구글 연결이 만료됐거나 취소됐습니다. 「구글 연결」을 다시 눌러 주세요."
      : body.error === "invalid_client" ? "구글 앱 Client ID·Secret이 맞지 않습니다. 「AI 키·모델」 화면에서 다시 확인해 주세요."
      : body.error === "redirect_uri_mismatch" ? `구글 앱에 승인된 리디렉션 주소로 ${GOOGLE_REDIRECT_URI} 를 추가해 주세요.`
      : "구글 인증 서버가 응답하지 않았습니다. 잠시 뒤 다시 시도해 주세요.";
    throw new PublishError(code, msg, { status: res.status });
  }
  return body;
}

/** id_token(구글 토큰 창구에서 TLS로 직접 받은 값)에서 계정 번호·이메일만 읽는다 */
export function idTokenClaims(idToken: string | undefined): { sub: string; email: string | null } | null {
  if (!idToken) return null;
  try {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString("utf8")) as { sub?: string; email?: string };
    return payload.sub ? { sub: String(payload.sub), email: payload.email ?? null } : null;
  } catch { return null; }
}

/** 콜백: 코드 교환 → 블로그 권한 확인 → 공용 표 저장(블로그 선택은 다음 단계) */
export async function completeGoogleConnect(admin: AdminDb, userId: string, code: string, deps: Deps = {}) {
  const app = await getGoogleApp(admin, userId);
  if (!app) throw new PublishError("bad_request", "구글 앱 Client ID·Secret을 먼저 등록해 주세요.");
  const t = await tokenRequest({ code, client_id: app.clientId, client_secret: app.clientSecret, redirect_uri: GOOGLE_REDIRECT_URI, grant_type: "authorization_code" }, deps);
  const scopes = (t.scope ?? "").split(" ").filter(Boolean);
  if (!scopes.includes(BLOGGER_SCOPE)) throw new PublishError("forbidden", "구글 블로그 권한을 허용하지 않았습니다. 다시 연결하면서 블로그 권한을 체크해 주세요.");
  const who = idTokenClaims(t.id_token);
  if (!who) throw new PublishError("server", "구글 계정 정보를 확인하지 못했습니다. 다시 시도해 주세요.");
  const now = (deps.now ?? Date.now)();
  // 같은 구글 계정을 다시 연결하면 고른 블로그를 지킨다
  const prev = await getMemberAccount(admin, userId, BLOGGER, { authMethod: "oauth" });
  const prevExtra = prev.status !== "not_connected" && prev.account.externalId === who.sub ? prev.account.extra : {};
  const { error } = await saveMemberAccount(admin, {
    userId,
    platform: BLOGGER,
    externalId: who.sub,
    username: who.email,
    accessToken: t.access_token,
    refreshToken: t.refresh_token ?? null,
    tokenExpiresAt: new Date(now + t.expires_in * 1000).toISOString(),
    grantedScopes: scopes,
    authMethod: "oauth",
    appRef: app.clientId,
    extra: { ...prevExtra },
    connectedVia: "wp-blogger-auto",
  });
  if (error) throw new PublishError("server", "연결 정보를 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  return { email: who.email };
}

/** 저장된 구글 블로그 연결(없으면 null) */
export async function loadBloggerAccount(admin: AdminDb, userId: string): Promise<MemberAccount | null> {
  const r = await getMemberAccount(admin, userId, BLOGGER, { authMethod: "oauth" });
  return r.status === "not_connected" ? null : r.account;
}

/** 쓸 수 있는 액세스 토큰 — 만료 1분 전이면 회원 본인 앱으로 갱신. 같은 앱이 아니면 다시 연결 요청 */
export async function getValidBloggerToken(admin: AdminDb, userId: string, deps: Deps = {}): Promise<{ token: string; account: MemberAccount }> {
  const account = await loadBloggerAccount(admin, userId);
  if (!account) throw new PublishError("auth", "구글 블로그가 연결돼 있지 않습니다. 「블로그 연결」에서 구글 연결을 눌러 주세요.");
  const now = (deps.now ?? Date.now)();
  const exp = account.tokenExpiresAt ? Date.parse(account.tokenExpiresAt) : 0;
  if (exp - 60_000 > now) return { token: account.accessToken, account };
  const app = await getGoogleApp(admin, userId);
  if (!app || app.clientId !== account.appRef || !account.refreshToken) {
    await markMemberAccountNeedsReconnect(admin, userId, account.id);
    throw new PublishError("auth", "구글 앱 키가 바뀌었거나 연결이 오래됐습니다. 「구글 연결」을 다시 눌러 주세요.");
  }
  try {
    const t = await tokenRequest({ client_id: app.clientId, client_secret: app.clientSecret, refresh_token: account.refreshToken, grant_type: "refresh_token" }, deps);
    const tokenExpiresAt = new Date(now + t.expires_in * 1000).toISOString();
    await updateMemberAccountToken(admin, userId, account.id, { accessToken: t.access_token, tokenExpiresAt, refreshToken: t.refresh_token ?? null });
    return { token: t.access_token, account: { ...account, accessToken: t.access_token, tokenExpiresAt } };
  } catch (e) {
    if (e instanceof PublishError && e.code === "auth") await markMemberAccountNeedsReconnect(admin, userId, account.id);
    throw e;
  }
}

/** 내 블로그 목록 */
export async function listMyBlogs(admin: AdminDb, userId: string, deps: Deps = {}): Promise<BloggerBlog[]> {
  const { token } = await getValidBloggerToken(admin, userId, deps);
  return listBlogs(token, { fetchImpl: deps.fetchImpl });
}

/** 올릴 블로그 고르기 — 내 목록에 있는 블로그만 */
export async function selectBlog(admin: AdminDb, userId: string, blogId: string, deps: Deps = {}) {
  const blogs = await listMyBlogs(admin, userId, deps);
  const blog = blogs.find((b) => b.id === blogId);
  if (!blog) throw new PublishError("not_found", "내 블로그 목록에 없는 블로그입니다.");
  const account = (await loadBloggerAccount(admin, userId))!;
  const { error } = await admin
    .from("member_platform_accounts")
    .update({ extra: { ...account.extra, blog_id: blog.id, blog_name: blog.name, blog_url: blog.url }, updated_at: new Date().toISOString() })
    .eq("id", account.id)
    .eq("user_id", userId);
  if (error) throw new PublishError("server", "선택을 저장하지 못했습니다.");
  return blog;
}

export async function disconnectBlogger(admin: AdminDb, userId: string, accountId: string): Promise<boolean> {
  const { data, error } = await admin.from("member_platform_accounts").delete().eq("id", accountId).eq("user_id", userId).eq("platform", "blogger").select("id");
  return !error && Array.isArray(data) && data.length === 1;
}
