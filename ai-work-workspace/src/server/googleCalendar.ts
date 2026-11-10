// 구글 캘린더 연동 ② 구글 계정 연결(OAuth, 2026-11-11). 플랜 docs/PLAN_20261111_GOOGLE_CALENDAR.md
// 기준: wp-blogger-auto/src/lib/googleConnect.ts(회원 본인 구글 OAuth 앱 user_api_keys google_client_id/secret — 유튜브·구글 블로그와
// 같은 키, 공용 표 member_platform_accounts 저장·토큰 갱신·재연결 요청)를 캘린더 권한으로 옮김. 운영자 공용 앱 금지(최상위 규칙).
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMemberAccount, saveMemberAccount, updateMemberAccountToken, markMemberAccountNeedsReconnect, type MemberAccount, type MemberPlatform } from "@/lib/memberIntegrations";
import type { CalEvent } from "./calendarData";

export const GCAL_PLATFORM = "google_calendar" as unknown as MemberPlatform; // 공용 형식에 아직 없음 — 카탈로그에 2026-11-11 추가
export const GCAL_SCOPE = "https://www.googleapis.com/auth/calendar.events";
export const SITE_ORIGIN = "https://ai-work-workspace.buylife.xyz";
export const GOOGLE_REDIRECT_URI = `${SITE_ORIGIN}/api/oauth/google-calendar/callback`;
export const OAUTH_COOKIE = "aww_gcal_oauth";
const AUTHORIZE = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export class GcalError extends Error {
  constructor(public code: "auth" | "bad_request" | "forbidden" | "server" | "not_found", message: string) {
    super(message);
  }
}

type Fetch = typeof fetch;
let fetchImpl: Fetch = (...a) => fetch(...a);
/** 시험에서 바꿔 끼움 */
export function setGcalFetch(f: Fetch | undefined) {
  fetchImpl = f ?? ((...a) => fetch(...a));
}

const admin = () => createAdminClient() as unknown as SupabaseClient;

async function memberKey(userId: string, provider: string): Promise<string | null> {
  const { data } = await admin().from("user_api_keys").select("api_key").eq("user_id", userId).eq("provider", provider).maybeSingle();
  const v = typeof data?.api_key === "string" ? data.api_key.trim() : "";
  return v || null;
}

export async function getGoogleApp(userId: string) {
  const [clientId, clientSecret] = await Promise.all([memberKey(userId, "google_client_id"), memberKey(userId, "google_client_secret")]);
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function authorizeUrl(clientId: string, state: string): string {
  const p = new URLSearchParams({
    client_id: clientId, redirect_uri: GOOGLE_REDIRECT_URI, response_type: "code",
    scope: ["openid", "email", GCAL_SCOPE].join(" "), access_type: "offline", prompt: "consent", include_granted_scopes: "true", state,
  });
  return `${AUTHORIZE}?${p.toString()}`;
}

type TokenResponse = { access_token: string; refresh_token?: string; expires_in: number; scope?: string; id_token?: string; error?: string };

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetchImpl(TOKEN, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(params).toString() });
  const body = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || !body.access_token) {
    if (body.error === "invalid_grant") throw new GcalError("auth", "구글 연결이 만료됐거나 취소됐습니다. 「구글 연결」을 다시 눌러 주세요.");
    if (body.error === "invalid_client" || body.error === "unauthorized_client") throw new GcalError("bad_request", "구글 앱 Client ID·Secret이 맞지 않습니다. 「API키등록·플랫폼연동」에서 다시 확인해 주세요.");
    if (body.error === "redirect_uri_mismatch") throw new GcalError("bad_request", `구글 앱의 승인된 리디렉션 주소에 ${GOOGLE_REDIRECT_URI} 를 추가해 주세요.`);
    throw new GcalError("server", "구글 인증 서버가 응답하지 않았습니다. 잠시 뒤 다시 시도해 주세요.");
  }
  return body;
}

function idTokenClaims(idToken: string | undefined): { sub: string; email: string | null } | null {
  if (!idToken) return null;
  try {
    const p = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString("utf8")) as { sub?: string; email?: string };
    return p.sub ? { sub: String(p.sub), email: p.email ?? null } : null;
  } catch {
    return null;
  }
}

/** 콜백: 코드 교환 → 캘린더 권한 확인 → 공용 표 저장 */
export async function completeGoogleConnect(userId: string, code: string): Promise<{ email: string | null }> {
  const app = await getGoogleApp(userId);
  if (!app) throw new GcalError("bad_request", "구글 앱 Client ID·Secret을 먼저 등록해 주세요.");
  const t = await tokenRequest({ code, client_id: app.clientId, client_secret: app.clientSecret, redirect_uri: GOOGLE_REDIRECT_URI, grant_type: "authorization_code" });
  const scopes = (t.scope ?? "").split(" ").filter(Boolean);
  if (!scopes.includes(GCAL_SCOPE)) throw new GcalError("forbidden", "구글 캘린더 권한을 허용하지 않았습니다. 다시 연결하면서 캘린더 권한을 체크해 주세요.");
  const who = idTokenClaims(t.id_token);
  if (!who) throw new GcalError("server", "구글 계정 정보를 확인하지 못했습니다. 다시 시도해 주세요.");
  const { error } = await saveMemberAccount(admin(), {
    userId, platform: GCAL_PLATFORM, externalId: who.sub, username: who.email,
    accessToken: t.access_token, refreshToken: t.refresh_token ?? null,
    tokenExpiresAt: new Date(Date.now() + t.expires_in * 1000).toISOString(),
    grantedScopes: scopes, authMethod: "oauth", appRef: app.clientId, extra: {}, connectedVia: "ai-work-workspace",
  });
  if (error) throw new GcalError("server", "연결 정보를 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  return { email: who.email };
}

export async function loadGcalAccount(userId: string): Promise<MemberAccount | null> {
  const r = await getMemberAccount(admin(), userId, GCAL_PLATFORM, { authMethod: "oauth" });
  return r.status === "not_connected" ? null : r.account;
}

/** 쓸 수 있는 토큰 — 만료 1분 전이면 회원 본인 앱으로 갱신, 앱이 바뀌었으면 다시 연결 요청 */
export async function validToken(userId: string): Promise<string> {
  const account = await loadGcalAccount(userId);
  if (!account) throw new GcalError("auth", "구글 캘린더가 연결돼 있지 않습니다. 「구글 연결」을 눌러 주세요.");
  const exp = account.tokenExpiresAt ? Date.parse(account.tokenExpiresAt) : 0;
  if (exp - 60_000 > Date.now()) return account.accessToken;
  const app = await getGoogleApp(userId);
  if (!app || app.clientId !== account.appRef || !account.refreshToken) {
    await markMemberAccountNeedsReconnect(admin(), userId, account.id);
    throw new GcalError("auth", "구글 앱 키가 바뀌었거나 연결이 오래됐습니다. 「구글 연결」을 다시 눌러 주세요.");
  }
  try {
    const t = await tokenRequest({ client_id: app.clientId, client_secret: app.clientSecret, refresh_token: account.refreshToken, grant_type: "refresh_token" });
    await updateMemberAccountToken(admin(), userId, account.id, { accessToken: t.access_token, tokenExpiresAt: new Date(Date.now() + t.expires_in * 1000).toISOString(), refreshToken: t.refresh_token ?? null });
    return t.access_token;
  } catch (e) {
    if (e instanceof GcalError && e.code === "auth") await markMemberAccountNeedsReconnect(admin(), userId, account.id);
    throw e;
  }
}

export async function disconnectGcal(userId: string): Promise<void> {
  await admin().from("member_platform_accounts").delete().eq("user_id", userId).eq("platform", "google_calendar");
}

// ---------------------------------------------------------------- 캘린더 API

async function api(token: string, url: string, init: RequestInit = {}) {
  const res = await fetchImpl(url, { ...init, headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init.headers ?? {}) } });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) throw new GcalError("auth", "구글 연결이 만료됐습니다. 「구글 연결」을 다시 눌러 주세요.");
  if (res.status === 403) throw new GcalError("forbidden", "구글 캘린더 API가 꺼져 있거나 권한이 없습니다. 구글 클라우드에서 「Google Calendar API」를 사용 설정해 주세요.");
  if (res.status === 404 || res.status === 410) throw new GcalError("not_found", "구글 일정을 찾지 못했습니다.");
  if (!res.ok) throw new GcalError("server", `구글 캘린더가 응답하지 않았습니다(${res.status}). 잠시 뒤 다시 시도해 주세요.`);
  return body as Record<string, any>;
}

/** 워크스페이스 일정 → 구글 일정 본문 */
export function toGoogleEvent(e: CalEvent) {
  const nextDay = (d: string) => { const t = new Date(`${d}T00:00:00Z`); t.setUTCDate(t.getUTCDate() + 1); return t.toISOString().slice(0, 10); };
  let start, end;
  if (e.startTime) {
    let endD = e.endDate ?? e.startDate;
    let endT = e.endTime;
    if (!endT) {
      // 끝 시각이 없으면 1시간 뒤 — 자정을 넘으면 날짜도 함께 넘긴다
      const x = new Date(`${e.startDate}T${e.startTime}:00Z`);
      x.setUTCHours(x.getUTCHours() + 1);
      endD = x.toISOString().slice(0, 10);
      endT = x.toISOString().slice(11, 16);
    }
    start = { dateTime: `${e.startDate}T${e.startTime}:00`, timeZone: "Asia/Seoul" };
    end = { dateTime: `${endD}T${endT}:00`, timeZone: "Asia/Seoul" };
  } else {
    start = { date: e.startDate };
    end = { date: nextDay(e.endDate ?? e.startDate) };
  }
  return { status: "confirmed", summary: e.title, description: `${e.dbTitle} · AI 업무 워크스페이스\n${e.url}`, start, end, source: { title: "AI 업무 워크스페이스", url: e.url }, extendedProperties: { private: { awwRowId: e.rowId } } };
}

export async function upsertGoogleEvent(token: string, e: CalEvent, eventId?: string | null): Promise<string> {
  const body = JSON.stringify(toGoogleEvent(e));
  if (eventId) {
    try {
      const r = await api(token, `${API}/${encodeURIComponent(eventId)}`, { method: "PUT", body });
      return String(r.id);
    } catch (err) {
      if (!(err instanceof GcalError && err.code === "not_found")) throw err; // 구글에서 완전히 지운 일정이면 새로 만든다(휴지통의 「취소됨」 일정은 status confirmed로 되살아남)
    }
  }
  const r = await api(token, API, { method: "POST", body });
  return String(r.id);
}

export interface GoogleItem { id: string; title: string; date: string; time: string; location: string; link: string }

/** 앞으로 days일 구글 일정(기본 캘린더) */
export async function listGoogleEvents(token: string, days = 30): Promise<GoogleItem[]> {
  const now = new Date();
  const until = new Date(now.getTime() + days * 86_400_000);
  const q = new URLSearchParams({ timeMin: now.toISOString(), timeMax: until.toISOString(), singleEvents: "true", orderBy: "startTime", maxResults: "250" });
  const r = await api(token, `${API}?${q}`);
  return ((r.items ?? []) as any[])
    .filter((x) => x.status !== "cancelled" && !x.extendedProperties?.private?.awwRowId) // 워크스페이스에서 보낸 일정은 다시 가져오지 않음
    .map((x) => {
      const dt: string = x.start?.dateTime ?? "";
      const kst = dt ? new Date(Date.parse(dt) + 9 * 3600_000).toISOString() : "";
      return { id: String(x.id), title: String(x.summary ?? "제목 없음"), date: kst ? kst.slice(0, 10) : String(x.start?.date ?? ""), time: kst ? kst.slice(11, 16) : "", location: String(x.location ?? ""), link: String(x.htmlLink ?? "") };
    });
}
