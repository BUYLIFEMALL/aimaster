import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserApiKey } from "@/lib/apiKeys";
import { getMemberAccount, markMemberAccountNeedsReconnect, saveMemberAccount, updateMemberAccountToken } from "@/lib/memberIntegrations";
import {
  MY_CHANNEL_CONNECT_SCOPES, MY_CHANNEL_NEED_SCOPES, SUMMARY_METRICS, buildHints, dateRange,
  toContentTypes, toCountries, toDaily, toDemographics, toSummary, toTopVideos, toTraffic,
  type Period, type ReportTable,
} from "@/lib/youtube/analytics";

// V6 「내 채널 진짜 지표」(v1.27) — 회원 본인 구글 OAuth 앱(google_client_id·secret)으로 연결, 공용 표 member_platform_accounts(youtube)에 저장.
// 토큰은 이 서버 파일 안에서만 쓰고 화면으로 보내지 않는다. 연결 방식은 youtube-auto-reply(lib/youtube/client.ts)와 같다.
// 지표는 화면을 열 때 바로 불러오고 DB에 저장하지 않는다(새 표 없음 → 30일 정리 대상 없음).

export const SITE_ORIGIN = "https://youtube-viral-studio.buylife.xyz";
export const REDIRECT_URI = `${SITE_ORIGIN}/api/youtube/my-channel/callback`;
const AUTHORIZE = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ANALYTICS = "https://youtubeanalytics.googleapis.com/v2/reports";
const DATA_API = "https://www.googleapis.com/youtube/v3";
const PROGRAM = "youtube-viral-studio";

export class MyChannelError extends Error {
  constructor(public code: "no_app" | "not_connected" | "missing_scopes" | "reconnect" | "api_disabled" | "google", message: string) { super(message); }
}

export async function getGoogleApp(userId: string): Promise<{ clientId: string; clientSecret: string } | null> {
  const [clientId, clientSecret] = await Promise.all([getUserApiKey(userId, "google_client_id"), getUserApiKey(userId, "google_client_secret")]);
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function authorizeUrl(clientId: string, state: string): string {
  const p = new URLSearchParams({
    client_id: clientId, redirect_uri: REDIRECT_URI, response_type: "code",
    scope: MY_CHANNEL_CONNECT_SCOPES.join(" "), access_type: "offline", prompt: "consent", include_granted_scopes: "true", state,
  });
  return `${AUTHORIZE}?${p.toString()}`;
}

type TokenRes = { access_token: string; refresh_token?: string; expires_in: number; scope?: string };

async function tokenRequest(body: Record<string, string>): Promise<TokenRes> {
  const res = await fetch(TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(body).toString(), cache: "no-store", signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new MyChannelError("reconnect", `구글 토큰 요청이 거절됐습니다(${res.status}).`);
  return (await res.json()) as TokenRes;
}

/** 콜백: 코드 교환 → 채널 확인 → 공용 표에 저장 */
export async function completeConnect(userId: string, code: string): Promise<{ channelTitle: string }> {
  const app = await getGoogleApp(userId);
  if (!app) throw new MyChannelError("no_app", "구글 OAuth 클라이언트 ID·보안 비밀을 먼저 등록해 주세요.");
  const tok = await tokenRequest({ code, client_id: app.clientId, client_secret: app.clientSecret, redirect_uri: REDIRECT_URI, grant_type: "authorization_code" });
  const ch = await fetch(`${DATA_API}/channels?part=snippet&mine=true`, { headers: { Authorization: `Bearer ${tok.access_token}` }, cache: "no-store", signal: AbortSignal.timeout(20_000) });
  if (!ch.ok) throw new MyChannelError("google", `내 채널 정보를 읽지 못했습니다(${ch.status}). 구글 클라우드에서 YouTube Data API v3가 켜져 있는지 확인해 주세요.`);
  const item = ((await ch.json()) as { items?: { id?: string; snippet?: { title?: string } }[] }).items?.[0];
  if (!item?.id) throw new MyChannelError("google", "이 구글 계정에 연결된 유튜브 채널이 없습니다.");
  const { error } = await saveMemberAccount(createAdminClient(), {
    userId, platform: "youtube", externalId: item.id, username: item.snippet?.title ?? null,
    accessToken: tok.access_token, refreshToken: tok.refresh_token ?? null,
    tokenExpiresAt: new Date(Date.now() + tok.expires_in * 1000).toISOString(),
    grantedScopes: (tok.scope ?? "").split(" ").filter(Boolean), appRef: app.clientId, connectedVia: PROGRAM,
  });
  if (error) throw new MyChannelError("google", "연결 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  return { channelTitle: item.snippet?.title ?? "" };
}

export type ConnectionStatus =
  | { state: "no_app" }
  | { state: "not_connected" }
  | { state: "missing_scopes"; channelTitle: string | null }
  | { state: "reconnect"; channelTitle: string | null }
  | { state: "ok"; channelTitle: string | null };

/** 화면 상태 + 쓸 수 있는 토큰(필요하면 갱신). 다른 앱으로 받은 갱신 토큰은 이 앱으로 갱신할 수 없어 다시 연결 안내 */
async function resolve(userId: string): Promise<{ status: ConnectionStatus; token?: string }> {
  const app = await getGoogleApp(userId);
  if (!app) return { status: { state: "no_app" } };
  const admin = createAdminClient();
  const r = await getMemberAccount(admin, userId, "youtube", { needScopes: MY_CHANNEL_NEED_SCOPES });
  if (r.status === "not_connected") return { status: { state: "not_connected" } };
  const title = r.account.username;
  if (r.status === "missing_scopes" || r.account.appRef !== app.clientId) return { status: { state: "missing_scopes", channelTitle: title } };
  if (r.account.needsReconnect || !r.account.refreshToken) return { status: { state: "reconnect", channelTitle: title } };
  const exp = r.account.tokenExpiresAt ? Date.parse(r.account.tokenExpiresAt) : 0;
  if (exp - Date.now() > 120_000) return { status: { state: "ok", channelTitle: title }, token: r.account.accessToken };
  try {
    const t = await tokenRequest({ refresh_token: r.account.refreshToken, client_id: app.clientId, client_secret: app.clientSecret, grant_type: "refresh_token" });
    await updateMemberAccountToken(admin, userId, r.account.id, { accessToken: t.access_token, tokenExpiresAt: new Date(Date.now() + t.expires_in * 1000).toISOString(), refreshToken: t.refresh_token ?? null });
    return { status: { state: "ok", channelTitle: title }, token: t.access_token };
  } catch {
    await markMemberAccountNeedsReconnect(admin, userId, r.account.id);
    return { status: { state: "reconnect", channelTitle: title } };
  }
}

export async function connectionStatus(userId: string): Promise<ConnectionStatus> {
  return (await resolve(userId)).status;
}

async function report(token: string, params: Record<string, string>): Promise<ReportTable> {
  const p = new URLSearchParams({ ids: "channel==MINE", ...params });
  const res = await fetch(`${ANALYTICS}?${p.toString()}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(30_000) });
  if (res.ok) return (await res.json()) as ReportTable;
  const text = (await res.text().catch(() => "")).slice(0, 400);
  if (res.status === 403 && /accessNotConfigured|has not been used|is disabled|SERVICE_DISABLED/i.test(text)) {
    throw new MyChannelError("api_disabled", "구글 클라우드 프로젝트에서 「YouTube Analytics API」가 꺼져 있습니다. 사용 설정한 뒤 몇 분 후 다시 열어 주세요.");
  }
  if (res.status === 401 || res.status === 403) throw new MyChannelError("missing_scopes", "구글이 분석 데이터 접근을 거절했습니다. 「내 유튜브 채널 연결」을 다시 눌러 권한을 허용해 주세요.");
  throw new MyChannelError("google", `유튜브 분석 데이터를 불러오지 못했습니다(${res.status}). 잠시 후 다시 시도해 주세요.`);
}

/** 선택 보고서는 실패해도 화면 전체를 막지 않는다(빈 칸) */
const optional = (p: Promise<ReportTable>) => p.catch((e) => { if (e instanceof MyChannelError && e.code === "api_disabled") throw e; return null; });

export async function loadMyChannel(userId: string, days: Period) {
  const { status, token } = await resolve(userId);
  if (status.state !== "ok" || !token) return { status };
  const { startDate, endDate } = dateRange(days);
  const base = { startDate, endDate };
  const [summaryT, dailyT, topT, trafficT, demoT, countryT, typeT] = await Promise.all([
    report(token, { ...base, metrics: SUMMARY_METRICS }),
    optional(report(token, { ...base, metrics: "views,estimatedMinutesWatched,subscribersGained,subscribersLost", dimensions: "day", sort: "day" })),
    optional(report(token, { ...base, metrics: "views,estimatedMinutesWatched,averageViewPercentage", dimensions: "video", sort: "-views", maxResults: "10" })),
    optional(report(token, { ...base, metrics: "views", dimensions: "insightTrafficSourceType" })),
    optional(report(token, { ...base, metrics: "viewerPercentage", dimensions: "ageGroup,gender" })),
    optional(report(token, { ...base, metrics: "views", dimensions: "country" })),
    optional(report(token, { ...base, metrics: "views", dimensions: "day,creatorContentType" })),
  ]);
  const summary = toSummary(summaryT);
  const top = toTopVideos(topT);
  // 잘 된 영상 제목(공개 Data API, 회원 토큰 · 최대 10개 한 번)
  if (top.length) {
    const res = await fetch(`${DATA_API}/videos?part=snippet&id=${top.map((v) => v.videoId).join(",")}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(20_000) }).catch(() => null);
    if (res?.ok) {
      const items = ((await res.json()) as { items?: { id?: string; snippet?: { title?: string } }[] }).items ?? [];
      for (const v of top) v.title = items.find((i) => i.id === v.videoId)?.snippet?.title;
    }
  }
  const traffic = toTraffic(trafficT);
  const contentTypes = toContentTypes(typeT);
  return {
    status,
    period: { days, startDate, endDate },
    summary, daily: toDaily(dailyT), top, traffic, demographics: toDemographics(demoT), countries: toCountries(countryT), contentTypes,
    hints: buildHints({ summary, top, traffic, contentTypes, days }),
  };
}
