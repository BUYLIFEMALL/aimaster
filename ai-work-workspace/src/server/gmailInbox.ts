// E4 1단계(WS-20261117-25, PLAN 7-16 A안, Master msg_02e977ff972d): Gmail 「받은 편지함 최근 메일 목록」 — 기능 꺼짐(OFF)으로 시작.
// - 권한: gmail.metadata(구글 「제한 권한」 — 제목·보낸 사람 등 머리글만, 본문 못 읽음) + openid·email. 그 밖의 권한이 함께 오면 저장 거절.
// - 회원 본인 구글 OAuth 앱(user_api_keys google_client_id/secret — 캘린더·유튜브·구글 블로그와 같은 키, googleCalendar.getGoogleApp 재사용).
//   운영자 공용 앱·운영자 키 0(최상위 규칙). 공용 표 member_platform_accounts에 플랫폼 'google_gmail'로 저장(공용 함수 재사용, 표·함수 변경 0).
// - 목록: messages.list(labelIds=INBOX, maxResults=20, 번호만) → messages.get(format=metadata, Subject·From·Date 머리글만,
//   fields로 snippet·본문·첨부 제외). 화면 표시용으로 돌려주기만 하고 저장 0. 검색어(q)는 metadata 권한에서 쓸 수 없어 쓰지 않는다.
// - 연결 끊기: 이 워크스페이스의 연결 줄만 삭제. 구글 쪽 토큰 폐기(revoke)는 같은 구글 프로젝트의 모든 권한(캘린더 등)을 끊을 수 있어 자동으로 하지 않는다.
// - 꺼짐이면 모든 진입점이 DB·외부 호출 전에 거절(이 파일은 불러올 때 DB·네트워크를 쓰지 않는다).
// - 토큰·메일 제목·보낸 사람·메시지 번호를 로그·오류 문구에 넣지 않는다.
import "server-only";
import { createHash, createPublicKey, randomBytes, verify as verifySig } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { markMemberAccountNeedsReconnect, saveMemberAccount, updateMemberAccountToken, type MemberPlatform } from "@/lib/memberIntegrations";
import { getGoogleApp, SITE_ORIGIN } from "./googleCalendar";

// ---------------------------------------------------------------- 기능 스위치(기본 꺼짐)
let GMAIL_ENABLED = false;
export function gmailEnabled(): boolean {
  return GMAIL_ENABLED;
}
/** 시험 전용 */
export function setGmailEnabledForTests(on: boolean) {
  GMAIL_ENABLED = on;
}

export const GMAIL_PLATFORM = "google_gmail" as unknown as MemberPlatform; // 공용 형식·카탈로그에는 아직 없음(카탈로그 1줄은 별도 승인)
export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.metadata";
export const GMAIL_REDIRECT_URI = `${SITE_ORIGIN}/api/oauth/google-gmail/callback`;
export const GMAIL_OAUTH_COOKIE = "aww_gmail_oauth";
export const GMAIL_COOKIE_PATH = "/api/oauth/google-gmail";
/** 이 단계에서 받아도 되는 권한(이것 말고 다른 권한이 함께 오면 저장하지 않음) */
const ALLOWED_SCOPES = new Set(["openid", "email", "https://www.googleapis.com/auth/userinfo.email", GMAIL_SCOPE]);
const AUTHORIZE = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";
const CERTS = "https://www.googleapis.com/oauth2/v3/certs";
const API = "https://gmail.googleapis.com/gmail/v1/users/me/messages";
export const GMAIL_LIST_MAX = 20;

export type GmailErrorCode = "off" | "auth" | "bad_request" | "forbidden" | "conflict" | "not_found" | "server";
export class GmailError extends Error {
  constructor(public code: GmailErrorCode, message: string) {
    super(message);
  }
}
export const GMAIL_OFF_MESSAGE = "Gmail 가져오기는 아직 꺼져 있습니다.";
export const GMAIL_OTHER_ACCOUNT_MESSAGE = "다른 구글 계정의 Gmail이 이미 연결돼 있습니다. 먼저 연결을 끊은 뒤 다시 연결해 주세요.";
export const GMAIL_ACCOUNT_CHANGED_MESSAGE = "연결된 Gmail 계정이 바뀌었습니다. 목록을 새로 열어 주세요.";
function ensureOn() {
  if (!GMAIL_ENABLED) throw new GmailError("off", GMAIL_OFF_MESSAGE);
}

// ---------------------------------------------------------------- 바꿔 끼우는 곳(시험)
type Fetch = typeof fetch;
let fetchImpl: Fetch = (...a) => fetch(...a);
/** 시험 전용: 구글 호출(토큰·공개 키·Gmail API)을 가짜로 */
export function setGmailFetch(f: Fetch | undefined) {
  fetchImpl = f ?? ((...a) => fetch(...a));
  certCache = null;
}

export interface GmailAccount {
  id: string;
  externalId: string; // 구글 계정 번호(id_token sub)
  username: string | null; // 구글 이메일(화면 표시용)
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: string | null;
  grantedScopes: string[];
  appRef: string | null;
}
export interface GmailStore {
  getApp(userId: string): Promise<{ clientId: string; clientSecret: string } | null>;
  /** 이 회원의 google_gmail 연결 줄 전부(다른 계정 확인용) */
  listAccounts(userId: string): Promise<GmailAccount[]>;
  save(input: { userId: string; externalId: string; username: string | null; accessToken: string; refreshToken: string | null; tokenExpiresAt: string; grantedScopes: string[]; appRef: string }): Promise<{ error: string | null }>;
  updateToken(userId: string, accountId: string, t: { accessToken: string; tokenExpiresAt: string; refreshToken: string | null }): Promise<void>;
  markNeedsReconnect(userId: string, accountId: string): Promise<void>;
  /** 이 워크스페이스의 연결 줄만 삭제(구글 호출 0) */
  deleteAccount(userId: string, externalId?: string): Promise<void>;
}

const admin = () => createAdminClient() as unknown as SupabaseClient;
/** 기본: 공용 표 member_platform_accounts — 서버 키 전용 접근(기존 캘린더 연결과 같은 규칙), 공용 함수 그대로 */
const supabaseStore: GmailStore = {
  getApp: (userId) => getGoogleApp(userId),
  async listAccounts(userId) {
    const { data, error } = await admin()
      .from("member_platform_accounts")
      .select("id, external_id, username, access_token, refresh_token, token_expires_at, granted_scopes, app_ref")
      .eq("user_id", userId)
      .eq("platform", "google_gmail");
    if (error) throw new GmailError("server", "연결 정보를 읽지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
    return (data ?? []).map((r: Record<string, unknown>) => ({
      id: String(r.id), externalId: String(r.external_id), username: (r.username as string | null) ?? null,
      accessToken: String(r.access_token ?? ""), refreshToken: (r.refresh_token as string | null) ?? null,
      tokenExpiresAt: (r.token_expires_at as string | null) ?? null, grantedScopes: (r.granted_scopes as string[] | null) ?? [], appRef: (r.app_ref as string | null) ?? null,
    }));
  },
  save: (i) => saveMemberAccount(admin(), {
    userId: i.userId, platform: GMAIL_PLATFORM, externalId: i.externalId, username: i.username, accessToken: i.accessToken, refreshToken: i.refreshToken,
    tokenExpiresAt: i.tokenExpiresAt, grantedScopes: i.grantedScopes, authMethod: "oauth", appRef: i.appRef, extra: {}, connectedVia: "ai-work-workspace",
  }),
  async updateToken(userId, accountId, t) {
    const { error } = await updateMemberAccountToken(admin(), userId, accountId, t);
    if (error) throw new GmailError("server", "연결 정보를 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  },
  markNeedsReconnect: (userId, accountId) => markMemberAccountNeedsReconnect(admin(), userId, accountId),
  async deleteAccount(userId, externalId) {
    let q = admin().from("member_platform_accounts").delete().eq("user_id", userId).eq("platform", "google_gmail");
    if (externalId) q = q.eq("external_id", externalId);
    const { error } = await q;
    if (error) throw new GmailError("server", "연결을 끊지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  },
};
let store: GmailStore = supabaseStore;
/** 시험 전용: 저장소를 가짜로(실제 DB 0) */
export function setGmailStoreForTests(s: GmailStore | null) {
  store = s ?? supabaseStore;
}

// ---------------------------------------------------------------- id_token 검증(구글 공개 키로 서명·발급자·대상·만료)
// 2026-11-17: 저장소에 검증 경로가 없어(캘린더 idTokenClaims는 내용만 읽음) 새 패키지 없이 node:crypto로 검증한다.
type Jwk = { kid: string; kty: string; n: string; e: string; alg?: string; use?: string };
let certCache: { keys: Jwk[]; until: number } | null = null;
async function googleKeys(now: number): Promise<Jwk[]> {
  if (certCache && certCache.until > now) return certCache.keys;
  let res: Response;
  try {
    res = await fetchImpl(CERTS, { signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new GmailError("server", "구글 계정 확인 키를 받지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  }
  const body = (await res.json().catch(() => ({}))) as { keys?: Jwk[] };
  if (!res.ok || !Array.isArray(body.keys)) throw new GmailError("server", "구글 계정 확인 키를 받지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  const m = /max-age=(\d+)/.exec(res.headers.get("cache-control") ?? "");
  certCache = { keys: body.keys, until: now + Math.min(Number(m?.[1] ?? 3600), 86_400) * 1000 };
  return body.keys;
}
/** base64url JSON → 평범한 객체만(null·배열·숫자·문자열이면 null) */
const b64obj = (s: string): Record<string, unknown> | null => {
  const v: unknown = JSON.parse(Buffer.from(s, "base64url").toString("utf8"));
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
};

/** 검증에 실패하면 null(이유는 밖으로 내지 않음). 통과하면 sub·email */
export async function verifyGoogleIdToken(idToken: string | undefined, clientId: string, now = Date.now()): Promise<{ sub: string; email: string | null } | null> {
  if (!idToken) return null;
  const parts = idToken.split(".");
  if (parts.length !== 3) return null;
  let header: Record<string, unknown> | null, payload: Record<string, unknown> | null;
  try {
    header = b64obj(parts[0]);
    payload = b64obj(parts[1]);
  } catch {
    return null;
  }
  if (!header || !payload) return null; // QA036(4): JSON null·배열·원시값이면 검증 실패(예외 0)
  if (header.alg !== "RS256" || typeof header.kid !== "string") return null;
  const jwk = (await googleKeys(now)).find((k) => k.kid === header.kid && k.kty === "RSA");
  if (!jwk) return null;
  let ok = false;
  try {
    const key = createPublicKey({ key: { kty: "RSA", n: jwk.n, e: jwk.e }, format: "jwk" });
    ok = verifySig("RSA-SHA256", Buffer.from(`${parts[0]}.${parts[1]}`), key, Buffer.from(parts[2], "base64url"));
  } catch {
    return null;
  }
  if (!ok) return null;
  const iss = payload.iss;
  if (iss !== "accounts.google.com" && iss !== "https://accounts.google.com") return null;
  // QA036(1) OIDC: aud에 이 앱이 있어야 하고, aud가 여러 개면 azp(인가받은 쪽)가 반드시 이 앱, azp가 있으면 항상 이 앱
  const aud = payload.aud;
  const auds: unknown[] = Array.isArray(aud) ? aud : [aud];
  if (!auds.length || auds.some((a) => typeof a !== "string") || !auds.includes(clientId)) return null;
  if (auds.length > 1 && payload.azp !== clientId) return null;
  if (payload.azp !== undefined && payload.azp !== clientId) return null;
  const sec = Math.floor(now / 1000);
  if (typeof payload.exp !== "number" || payload.exp <= sec) return null;
  if (typeof payload.iat !== "number" || payload.iat > sec + 300) return null;
  if (typeof payload.sub !== "string" || !payload.sub) return null;
  const email = typeof payload.email === "string" && payload.email_verified === true ? payload.email : null;
  return { sub: payload.sub, email };
}

// ---------------------------------------------------------------- 연결(OAuth)
export const appTagOf = (clientId: string) => createHash("sha256").update(clientId).digest("hex").slice(0, 16);

export function gmailAuthorizeUrl(clientId: string, state: string): string {
  const q = new URLSearchParams({
    client_id: clientId, redirect_uri: GMAIL_REDIRECT_URI, response_type: "code",
    // include_granted_scopes는 켜지 않는다(캘린더 등과 묶음 권한을 새로 만들지 않음)
    scope: ["openid", "email", GMAIL_SCOPE].join(" "), access_type: "offline", prompt: "consent", state,
  });
  return `${AUTHORIZE}?${q}`;
}

/** 「Gmail 연결」 시작: 동의 주소 + 쿠키 값(state.회원.앱표식) */
export async function startGmailConnect(userId: string): Promise<{ url: string; cookie: string }> {
  ensureOn();
  const app = await store.getApp(userId);
  if (!app) throw new GmailError("bad_request", "구글 앱 Client ID·Secret을 먼저 등록해 주세요.");
  const state = randomBytes(24).toString("hex");
  return { url: gmailAuthorizeUrl(app.clientId, state), cookie: `${state}.${userId}.${appTagOf(app.clientId)}` };
}

type TokenResponse = { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; id_token?: string; error?: string };
async function tokenRequest(params: Record<string, string>): Promise<Required<Pick<TokenResponse, "access_token" | "expires_in">> & TokenResponse> {
  let res: Response;
  try {
    res = await fetchImpl(TOKEN, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(params).toString(), signal: AbortSignal.timeout(15_000) });
  } catch {
    throw new GmailError("server", "구글에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  }
  const body = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || !body.access_token || typeof body.expires_in !== "number") {
    if (body.error === "invalid_grant") throw new GmailError("auth", "구글 연결이 만료됐습니다. 「Gmail 연결」을 다시 눌러 주세요.");
    if (body.error === "invalid_client") throw new GmailError("bad_request", "구글 앱 Client ID·Secret이 맞지 않습니다. 등록한 값을 확인해 주세요.");
    throw new GmailError("server", "구글이 연결을 마치지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  }
  return body as Required<Pick<TokenResponse, "access_token" | "expires_in">> & TokenResponse;
}

/**
 * 콜백: 앱 일치 확인 → 코드 교환 → 권한 확인(metadata 필수, 그 밖 거절) → id_token 검증(sub) → 다른 계정 확인 → 저장 → 저장 뒤 다시 확인.
 * 동시 콜백 두 개가 서로 다른 계정을 새로 넣는 경우: 새로 넣은 쪽이 저장 뒤 다른 계정 줄을 보면 자기 줄을 지우고 409.
 * 원자적 보장은 아님 — 재확인·지우기가 실패하거나 중단되면 줄이 2개 남을 수 있고, 그때는 읽기가 409로 닫혀(다른 계정 메일 노출 0)
 * 회원이 연결을 끊고 다시 연결해야 함. 공용 표 고유 조건 변경 없이 할 수 있는 최선(QA036(3)).
 */
export async function completeGmailConnect(userId: string, code: string, appTag: string): Promise<{ email: string | null }> {
  ensureOn();
  const app = await store.getApp(userId);
  if (!app) throw new GmailError("bad_request", "구글 앱 Client ID·Secret을 먼저 등록해 주세요.");
  if (appTagOf(app.clientId) !== appTag) throw new GmailError("bad_request", "구글 앱 키가 연결 도중 바뀌었습니다. 「Gmail 연결」을 다시 눌러 주세요.");
  const t = await tokenRequest({ code, client_id: app.clientId, client_secret: app.clientSecret, redirect_uri: GMAIL_REDIRECT_URI, grant_type: "authorization_code" });
  const scopes = (t.scope ?? "").split(" ").filter(Boolean);
  if (!scopes.includes(GMAIL_SCOPE)) throw new GmailError("forbidden", "Gmail 메일 목록(제목·보낸 사람) 권한을 허용하지 않았습니다. 다시 연결하면서 권한을 체크해 주세요.");
  if (scopes.some((s) => !ALLOWED_SCOPES.has(s))) throw new GmailError("forbidden", "필요한 것보다 넓은 구글 권한이 함께 와서 저장하지 않았습니다. 구글 계정의 타사 연결에서 이 앱 권한을 확인한 뒤 다시 연결해 주세요.");
  const who = await verifyGoogleIdToken(t.id_token, app.clientId);
  if (!who) throw new GmailError("auth", "구글 계정 확인에 실패했습니다. 「Gmail 연결」을 다시 눌러 주세요."); // QA036(4): 인증 실패를 서버 오류로 내보내지 않음
  const before = await store.listAccounts(userId);
  if (before.some((a) => a.externalId !== who.sub)) throw new GmailError("conflict", GMAIL_OTHER_ACCOUNT_MESSAGE);
  const isNew = !before.some((a) => a.externalId === who.sub);
  const { error } = await store.save({
    userId, externalId: who.sub, username: who.email, accessToken: t.access_token, refreshToken: t.refresh_token ?? null,
    tokenExpiresAt: new Date(Date.now() + t.expires_in * 1000).toISOString(), grantedScopes: scopes, appRef: app.clientId,
  });
  if (error) throw new GmailError("server", "연결 정보를 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  if (isNew) {
    // 저장 뒤 다시 확인. 다른 계정 줄이 보이거나 확인 자체가 실패하면 **자기가 새로 넣은 줄만** 지우고 실패(다른 계정 줄은 지우지 않음).
    // QA036(3): 지우기마저 실패하면 줄이 남을 수 있음 — 그때도 읽기(currentAccount)가 줄 2개를 409로 닫아 다른 계정 메일은 보이지 않음.
    let after: GmailAccount[] | null = null;
    try {
      after = await store.listAccounts(userId);
    } catch {
      after = null;
    }
    if (!after || after.some((a) => a.externalId !== who.sub)) {
      await store.deleteAccount(userId, who.sub).catch(() => {});
      throw after ? new GmailError("conflict", GMAIL_OTHER_ACCOUNT_MESSAGE) : new GmailError("server", "연결을 확인하지 못해 저장하지 않았습니다. 잠시 뒤 다시 연결해 주세요.");
    }
  }
  return { email: who.email };
}

/** 지금 연결(없으면 null). 줄이 2개 이상이면 어느 계정인지 정할 수 없어 실패 쪽으로 닫음 */
async function currentAccount(userId: string): Promise<GmailAccount | null> {
  let rows: GmailAccount[];
  try {
    rows = await store.listAccounts(userId);
  } catch (e) {
    if (e instanceof GmailError) throw e;
    throw new GmailError("server", "연결 정보를 읽지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  }
  if (rows.length > 1) throw new GmailError("conflict", GMAIL_OTHER_ACCOUNT_MESSAGE);
  return rows[0] ?? null;
}

export async function gmailStatus(userId: string): Promise<{ connected: boolean; email: string | null; sub: string | null }> {
  ensureOn();
  const a = await currentAccount(userId);
  return { connected: !!a, email: a?.username ?? null, sub: a?.externalId ?? null };
}

async function validToken(userId: string, account: GmailAccount, force = false): Promise<string> {
  // QA036(2): 토큰이 아직 유효해도 지금 회원 앱이 연결 때 앱과 다르면 쓰지 않음(Gmail 호출 0·재연결)
  const app = await store.getApp(userId);
  if (!app || app.clientId !== account.appRef) {
    await store.markNeedsReconnect(userId, account.id);
    throw new GmailError("auth", "구글 앱 키가 바뀌었습니다. 「Gmail 연결」을 다시 눌러 주세요.");
  }
  const exp = account.tokenExpiresAt ? Date.parse(account.tokenExpiresAt) : 0;
  if (!force && exp - 60_000 > Date.now()) return account.accessToken;
  if (!account.refreshToken) {
    await store.markNeedsReconnect(userId, account.id);
    throw new GmailError("auth", "구글 앱 키가 바뀌었거나 연결이 오래됐습니다. 「Gmail 연결」을 다시 눌러 주세요.");
  }
  try {
    const t = await tokenRequest({ client_id: app.clientId, client_secret: app.clientSecret, refresh_token: account.refreshToken, grant_type: "refresh_token" });
    await store.updateToken(userId, account.id, { accessToken: t.access_token, tokenExpiresAt: new Date(Date.now() + t.expires_in * 1000).toISOString(), refreshToken: t.refresh_token ?? null });
    return t.access_token;
  } catch (e) {
    if (e instanceof GmailError && e.code === "auth") await store.markNeedsReconnect(userId, account.id);
    throw e;
  }
}

// ---------------------------------------------------------------- 목록(표시만, 저장 0)
export interface GmailListItem { id: string; subject: string; from: string; date: string | null }
const MSG_ID = /^[A-Za-z0-9_-]{1,64}$/;

async function gmailGet(token: string, url: string): Promise<Record<string, unknown>> {
  let res: Response;
  try {
    res = await fetchImpl(url, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000) });
  } catch {
    throw new GmailError("server", "Gmail에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.status === 401) throw new GmailError("auth", "Gmail 연결이 만료됐습니다. 「Gmail 연결」을 다시 눌러 주세요.");
  if (res.status === 403) throw new GmailError("forbidden", "Gmail API가 꺼져 있거나 권한이 없습니다. 구글 클라우드에서 「Gmail API」를 사용 설정해 주세요.");
  if (res.status === 429) throw new GmailError("server", "Gmail 사용 한도를 넘었습니다. 잠시 뒤 다시 시도해 주세요.");
  if (!res.ok) throw new GmailError("server", `Gmail이 응답하지 않았습니다(${res.status}). 잠시 뒤 다시 시도해 주세요.`);
  return body;
}
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/[\r\n\t]+/g, " ").trim().slice(0, n) : "");

/**
 * 받은 편지함 최근 메일(최대 20개)의 제목·보낸 사람·날짜. expectSub를 주면 지금 연결 계정과 다를 때 호출 전에 409.
 * 응답이 늦게 오는 동안 연결이 끊기거나 다른 계정으로 바뀌면 결과를 버리고 404/409(다른 계정 메일을 보여 주지 않음).
 */
export async function listGmailInbox(userId: string, expectSub?: string): Promise<{ sub: string; email: string | null; items: GmailListItem[] }> {
  ensureOn();
  const account = await currentAccount(userId);
  if (!account) throw new GmailError("not_found", "Gmail이 연결돼 있지 않습니다. 「Gmail 연결」을 눌러 주세요.");
  if (expectSub !== undefined && expectSub !== account.externalId) throw new GmailError("conflict", GMAIL_ACCOUNT_CHANGED_MESSAGE);
  let token = await validToken(userId, account);
  await sameAccountOrThrow(userId, account); // QA036(2): 갱신하는 사이 연결이 바뀌었으면 Gmail 호출 전에 멈춤
  const listUrl = `${API}?${new URLSearchParams({ labelIds: "INBOX", maxResults: String(GMAIL_LIST_MAX), fields: "messages/id" })}`;
  let list: Record<string, unknown>;
  try {
    list = await gmailGet(token, listUrl);
  } catch (e) {
    if (!(e instanceof GmailError && e.code === "auth")) throw e;
    token = await validToken(userId, account, true); // 401이면 한 번만 새로 받아 다시
    await sameAccountOrThrow(userId, account);
    list = await gmailGet(token, listUrl);
  }
  const ids = (Array.isArray(list.messages) ? list.messages : []).map((m) => (m as { id?: unknown })?.id).filter((id): id is string => typeof id === "string" && MSG_ID.test(id)).slice(0, GMAIL_LIST_MAX);
  const items: GmailListItem[] = [];
  for (const id of ids) {
    const q = new URLSearchParams({ format: "metadata", fields: "id,payload/headers" });
    for (const h of ["Subject", "From", "Date"]) q.append("metadataHeaders", h);
    const m = await gmailGet(token, `${API}/${encodeURIComponent(id)}?${q}`);
    const headers = Array.isArray((m.payload as { headers?: unknown } | undefined)?.headers) ? (m.payload as { headers: { name?: unknown; value?: unknown }[] }).headers : [];
    const pick = (name: string) => headers.find((h) => typeof h?.name === "string" && h.name.toLowerCase() === name.toLowerCase())?.value;
    const d = Date.parse(String(pick("Date") ?? ""));
    items.push({ id, subject: clip(pick("Subject"), 300) || "(제목 없음)", from: clip(pick("From"), 200), date: Number.isFinite(d) ? new Date(d).toISOString() : null });
  }
  // 늦은 응답: 그사이 연결이 끊기거나 계정이 바뀌었으면 결과를 버림
  await sameAccountOrThrow(userId, account);
  return { sub: account.externalId, email: account.username, items };
}

/** 지금 연결이 처음 읽은 연결과 같은 계정인지(끊김 404·바뀜 409) */
async function sameAccountOrThrow(userId: string, account: GmailAccount): Promise<void> {
  const now = await currentAccount(userId);
  if (!now) throw new GmailError("not_found", "Gmail 연결이 끊겼습니다. 다시 연결해 주세요.");
  if (now.externalId !== account.externalId) throw new GmailError("conflict", GMAIL_ACCOUNT_CHANGED_MESSAGE);
}

/** 이 워크스페이스의 Gmail 연결만 끊음(구글 토큰 폐기 호출 0 — 같은 구글 앱의 캘린더 등 다른 연결을 끊지 않기 위해) */
export async function disconnectGmail(userId: string): Promise<void> {
  ensureOn();
  await store.deleteAccount(userId);
}
