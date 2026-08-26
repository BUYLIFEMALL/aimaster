import "server-only";

// 이 모듈은 서버 코드에서만 import 해야 한다. Access Token이 브라우저로 전달되지 않도록
// 여기서만 Meta/Instagram API를 호출한다(instagram-comment-reply/lib/instagram/client.ts와 동일 원칙).
//
// "Instagram API with Instagram Login"(Business Login for Instagram) 플로우를 쓴다 — Facebook
// Page 연결 없이 인스타그램 비즈니스/크리에이터 계정만으로 바로 로그인할 수 있는 최신 방식이다.
// DM 발송에는 instagram_business_manage_messages 스코프가 추가로 필요하다(2026-08-26 공식 문서
// developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/
// messaging-api 로 확인).
const AUTHORIZE_BASE = "https://www.instagram.com/oauth/authorize";
const SHORT_TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const GRAPH_BASE = "https://graph.instagram.com/v25.0";

const INSTAGRAM_SCOPES = "instagram_business_basic,instagram_business_manage_messages";

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`환경변수 ${name}가 설정되지 않았습니다.`);
  return value;
}

export function getInstagramAuthorizeUrl(state: string, appId: string): string {
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: getEnv("META_INSTAGRAM_REDIRECT_URI"),
    response_type: "code",
    scope: INSTAGRAM_SCOPES,
    state,
  });
  return `${AUTHORIZE_BASE}?${params.toString()}`;
}

interface ShortLivedTokenResponse {
  access_token: string;
  user_id: string;
  permissions?: string[];
}

interface LongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // 초 단위, 보통 60일
}

export async function exchangeInstagramCode(
  code: string,
  appId: string,
  appSecret: string,
): Promise<ShortLivedTokenResponse> {
  const body = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: "authorization_code",
    redirect_uri: getEnv("META_INSTAGRAM_REDIRECT_URI"),
    code,
  });

  const response = await fetch(SHORT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!response.ok) {
    throw new Error(`인스타그램 토큰 교환에 실패했습니다. (${response.status}) ${await response.text()}`);
  }
  return response.json();
}

/** 단기 토큰(1시간)을 장기 토큰(60일)으로 교환한다. */
export async function exchangeForLongLivedToken(
  shortLivedToken: string,
  appSecret: string,
): Promise<LongLivedTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: appSecret,
    access_token: shortLivedToken,
  });
  const response = await fetch(`${GRAPH_BASE}/access_token?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`인스타그램 장기 토큰 교환에 실패했습니다. (${response.status}) ${await response.text()}`);
  }
  return response.json();
}

/** 만료 전 장기 토큰을 60일 더 연장한다(만료 24시간 전부터 가능, 공식 문서 기준). */
export async function refreshInstagramLongLivedToken(accessToken: string): Promise<LongLivedTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "ig_refresh_token",
    access_token: accessToken,
  });
  const response = await fetch(`${GRAPH_BASE}/refresh_access_token?${params.toString()}`);
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`INSTAGRAM_TOKEN_EXPIRED: ${response.status} ${errorBody}`);
  }
  return response.json();
}

export interface InstagramAccountInfo {
  igUserId: string;
  username: string;
}

export async function getInstagramAccountInfo(accessToken: string, igUserId: string): Promise<InstagramAccountInfo> {
  const params = new URLSearchParams({ fields: "username", access_token: accessToken });
  const response = await fetch(`${GRAPH_BASE}/${igUserId}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`인스타그램 계정 정보 조회에 실패했습니다. (${response.status}) ${await response.text()}`);
  }
  const data = (await response.json()) as { id?: string; username?: string };
  if (!data.username) throw new Error("인스타그램 계정 정보를 찾지 못했습니다.");
  return { igUserId, username: data.username };
}

/** 상대방(IGSID) 프로필 이름을 best-effort로 조회한다 — 실패해도 대화 자체는 계속 처리한다. */
export async function getInstagramParticipantUsername(
  accessToken: string,
  igScopedId: string,
): Promise<string | null> {
  try {
    const params = new URLSearchParams({ fields: "name,username", access_token: accessToken });
    const response = await fetch(`${GRAPH_BASE}/${igScopedId}?${params.toString()}`);
    if (!response.ok) return null;
    const data = (await response.json()) as { name?: string; username?: string };
    return data.username ?? data.name ?? null;
  } catch {
    return null;
  }
}

/** DM 1건을 발송한다. recipientId는 상대방의 IGSID(대화별로 발급되는 scoped id)다. */
export async function sendInstagramDirectMessage(
  accessToken: string,
  igUserId: string,
  recipientId: string,
  text: string,
): Promise<{ messageId: string }> {
  const response = await fetch(`${GRAPH_BASE}/${igUserId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }),
  });
  if (!response.ok) {
    throw new Error(`DM 발송에 실패했습니다. (${response.status}) ${await response.text()}`);
  }
  const data = (await response.json()) as { message_id?: string };
  if (!data.message_id) throw new Error("DM 발송 응답에 message_id가 없습니다.");
  return { messageId: data.message_id };
}
