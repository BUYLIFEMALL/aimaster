import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMemberAccount, markMemberAccountNeedsReconnect, updateMemberAccountToken, type MemberAccount } from "@/lib/memberIntegrations";
import { refreshYoutubeAccessToken } from "@/lib/youtube/client";

// v1.04 유튜브 업로드(shorts-onestop-studio v1.19 account.ts에서 복사): 이 프로그램은 유튜브 연결 화면을 두지 않고, 회원이 다른 유튜브 프로그램에서 한 번 연결한 공용 계정(member_platform_accounts)을 쓴다.
// 갱신 토큰은 그것을 발급한 회원 본인 Google 앱으로만 쓸 수 있어서, 공용 계정의 앱(app_ref)이 지금 등록한 google_client_id와 같을 때만 쓴다.
// 최상위 규칙: 회원 본인 계정·본인 키만 — 없으면 안내만 하고 다른 회원·운영자 값으로 대신하지 않는다.

// 구글 videos.insert가 허용하는 권한(셋 중 하나면 업로드 가능)
const UPLOAD_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.force-ssl",
  "https://www.googleapis.com/auth/youtube",
];

export type YoutubeState =
  | { state: "ok"; channelTitle: string | null }
  | { state: "not_connected" | "no_scope" | "no_keys" | "other_app" | "reconnect"; channelTitle: string | null };

export const CONNECT_PROGRAMS = [
  { name: "유튜브 댓글 자동화", url: "https://youtube-auto-reply.buylife.xyz" },
  { name: "YOUTUBE Shots 자동화", url: "https://shots.buylife.xyz" },
];

async function googleKeys(userId: string): Promise<{ clientId: string | null; clientSecret: string | null }> {
  const { data } = await createAdminClient()
    .from("user_api_keys")
    .select("provider, api_key, created_at")
    .eq("user_id", userId)
    .in("provider", ["google_client_id", "google_client_secret"])
    .order("created_at", { ascending: false });
  const pick = (p: string) => (data ?? []).find((r) => r.provider === p && r.api_key)?.api_key ?? null;
  return { clientId: pick("google_client_id"), clientSecret: pick("google_client_secret") };
}

type Ready = { account: MemberAccount; clientId: string; clientSecret: string };

// v1.08 채널이 여러 개 연결된 회원이 올릴 채널을 고른다(플레이리스트 v1.24에서 복사, 개선 제안 C5). 공용 사본 memberIntegrations는 「기본 1개」만 돌려주므로
// 이 앱에서 회원 본인(user_id) 채널 목록·고른 채널을 직접 읽는다 — 다른 회원 채널 번호는 찾지 못한다.
const ACCOUNT_COLS = "id, platform, external_id, username, access_token, refresh_token, token_expires_at, granted_scopes, auth_method, app_ref, extra, needs_reconnect, connected_via";
type AccountRow = { id: string; external_id: string; username: string | null; access_token: string; refresh_token: string | null; token_expires_at: string | null; granted_scopes: string[] | null; auth_method: string | null; app_ref: string | null; extra: Record<string, unknown> | null; needs_reconnect: boolean; connected_via: string | null };
const rowToAccount = (r: AccountRow): MemberAccount => ({
  id: r.id, platform: "youtube", externalId: r.external_id, username: r.username, accessToken: r.access_token, refreshToken: r.refresh_token,
  tokenExpiresAt: r.token_expires_at, grantedScopes: r.granted_scopes ?? [], authMethod: r.auth_method, appRef: r.app_ref, extra: r.extra ?? {},
  needsReconnect: r.needs_reconnect, connectedVia: r.connected_via,
});

export type YoutubeChannel = { id: string; title: string; canUpload: boolean };

/** 회원 본인의 연결된 유튜브 채널(기본 표시·연결한 순서). 토큰 갱신 때 바뀌는 updated_at으로 정렬하면 다시 열 때마다 기본 채널이 뒤바뀌므로 created_at으로 고정 */
export async function listYoutubeChannels(userId: string): Promise<YoutubeChannel[]> {
  const { data } = await createAdminClient()
    .from("member_platform_accounts")
    .select("id, username, granted_scopes, needs_reconnect")
    .eq("user_id", userId).eq("platform", "youtube")
    .order("is_default", { ascending: false }).order("created_at", { ascending: true });
  return ((data ?? []) as { id: string; username: string | null; granted_scopes: string[] | null; needs_reconnect: boolean }[]).map((r) => ({
    id: r.id, title: r.username ?? "이름 없는 채널", canUpload: (r.granted_scopes ?? []).some((s) => UPLOAD_SCOPES.includes(s)) && !r.needs_reconnect,
  }));
}

async function load(userId: string, accountId?: string | null): Promise<{ status: YoutubeState; ready?: Ready }> {
  let account: MemberAccount;
  if (accountId) {
    const { data } = await createAdminClient().from("member_platform_accounts").select(ACCOUNT_COLS)
      .eq("id", accountId).eq("user_id", userId).eq("platform", "youtube").maybeSingle();
    if (!data) return { status: { state: "not_connected", channelTitle: null } };
    account = rowToAccount(data as unknown as AccountRow);
  } else {
    const r = await getMemberAccount(createAdminClient(), userId, "youtube");
    if (r.status === "not_connected") return { status: { state: "not_connected", channelTitle: null } };
    account = r.account;
  }
  const channelTitle = account.username;
  if (!account.grantedScopes.some((s) => UPLOAD_SCOPES.includes(s))) return { status: { state: "no_scope", channelTitle } };
  if (account.needsReconnect || !account.refreshToken) return { status: { state: "reconnect", channelTitle } };
  const { clientId, clientSecret } = await googleKeys(userId);
  if (!clientId || !clientSecret) return { status: { state: "no_keys", channelTitle } };
  if (account.appRef !== clientId) return { status: { state: "other_app", channelTitle } };
  return { status: { state: "ok", channelTitle }, ready: { account, clientId, clientSecret } };
}

/** 접근 토큰(만료 1분 전이면 갱신해 공용 표에 저장). 갱신 토큰이 무효면 「다시 연결 필요」로 표시하고 reconnect */
async function accessToken(userId: string, x: Ready): Promise<string | "reconnect"> {
  const exp = x.account.tokenExpiresAt ? new Date(x.account.tokenExpiresAt).getTime() : 0;
  if (exp > Date.now() + 60_000) return x.account.accessToken;
  try {
    const t = await refreshYoutubeAccessToken(x.account.refreshToken!, x.clientId, x.clientSecret);
    await updateMemberAccountToken(createAdminClient(), userId, x.account.id, {
      accessToken: t.access_token,
      tokenExpiresAt: new Date(Date.now() + t.expires_in * 1000).toISOString(),
    });
    return t.access_token;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("YOUTUBE_TOKEN_EXPIRED:")) {
      await markMemberAccountNeedsReconnect(createAdminClient(), userId, x.account.id);
      return "reconnect";
    }
    throw e;
  }
}

/** 화면 표시용 상태 — 토큰이 살아 있는지도 확인한다(테스트 상태 Google 앱은 갱신 토큰이 7일 뒤 만료) */
export async function youtubeStatus(userId: string, accountId?: string | null): Promise<YoutubeState> {
  const { status, ready } = await load(userId, accountId);
  if (!ready) return status;
  return (await accessToken(userId, ready)) === "reconnect" ? { state: "reconnect", channelTitle: status.channelTitle } : status;
}

/** 업로드용 접근 토큰. 쓸 수 없으면 상태를 돌려준다 */
export async function youtubeUploadToken(userId: string, accountId?: string | null): Promise<{ token: string } | { status: YoutubeState }> {
  const { status, ready } = await load(userId, accountId);
  if (!ready) return { status };
  const token = await accessToken(userId, ready);
  return token === "reconnect" ? { status: { state: "reconnect", channelTitle: status.channelTitle } } : { token };
}

export function youtubeStateMessage(s: YoutubeState["state"]): string {
  switch (s) {
    case "not_connected": return "유튜브 채널이 아직 연결되지 않았습니다. 「유튜브 댓글 자동화」나 「YOUTUBE Shots 자동화」에서 한 번 연결하면 이 프로그램에서도 그대로 씁니다.";
    case "no_scope": return "연결된 유튜브 계정에 영상 올리기 권한이 없습니다. YOUTUBE Shots 자동화에서 「다른 YouTube 프로그램 권한도 함께 받기」를 켜고 다시 연결해 주세요.";
    case "no_keys": return "Google OAuth Client ID·Secret이 등록되어 있지 않습니다. 유튜브를 연결한 프로그램의 [API키등록·플랫폼연동]에서 확인해 주세요.";
    case "other_app": return "유튜브를 연결할 때 쓴 Google 앱과 지금 등록된 Client ID가 다릅니다. 지금 Client ID로 유튜브를 다시 연결해 주세요.";
    case "reconnect": return "유튜브 연결이 만료되었습니다(Google 앱이 테스트 상태면 7일마다 만료). 유튜브를 연결한 프로그램에서 다시 연결해 주세요.";
    default: return "";
  }
}
