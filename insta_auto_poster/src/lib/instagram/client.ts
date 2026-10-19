import "server-only";
import type { InstagramAuthMethod } from "@/types/database.types";

// 이 모듈은 서버 코드에서만 import 해야 한다. Access Token이 브라우저로 전달되지 않도록
// 여기서만 Instagram/Facebook Graph API(Meta)를 호출한다.
//
// 2026-09-07: 두 가지 연동 방식을 함께 지원한다.
// 1) facebook_login — 회원 본인 Meta 앱(App ID/Secret)으로 Facebook 로그인 후
//    연결된 Facebook 페이지의 인스타그램 비즈니스 계정을 찾는 방식. 2026-10-09부터 운영자 공용
//    앱(META_APP_ID/SECRET 환경변수)은 쓰지 않는다 — 최상위 규칙(docs/TOP_RULE_PERSONAL_ACCOUNT_API.md).
//    앱 ID/Secret은 호출부가 회원 본인 키(user_api_keys)에서 읽어 넘긴다.
// 2) instagram_login — 회원이 각자 본인 소유 Meta 앱을 만들어 App ID/Secret을 등록하는
//    "Instagram API with Instagram Login" 방식(threads-comment-reply, instagram-comment-reply,
//    instagram-dm-reply와 동일 패턴). Facebook 페이지 연결이 필요 없고, AIMaster 루트
//    CLAUDE.md의 "본인 API 키만 사용" 원칙에 맞는다. facebook_login이 안 되는 회원을 위한
//    대체(fallback) 방법으로 제공한다.
export type { InstagramAuthMethod };

// 게시 함수·graphBaseFor는 공용 기준 코드 publish.ts로 옮겼다(2026-10-19, 동작 같음). 기존 import 호환을 위해 다시 내보낸다.
export { graphBaseFor, publishInstagramPost, publishInstagramCarousel } from "./publish";
export type { PublishInstagramPostInput, PublishInstagramPostResult, PublishInstagramCarouselInput } from "./publish";

async function parseGraphResponse<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) {
    const err = body as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? `Instagram/Facebook API 요청이 실패했습니다. (${response.status})`);
  }
  return body as T;
}

// ─────────────────────────────────────────────────────────────
// 1) facebook_login — 회원 본인 Meta 앱 + Facebook 페이지 방식

const FACEBOOK_GRAPH_VERSION = "v21.0";
const FACEBOOK_GRAPH_BASE = `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}`;
const FACEBOOK_AUTHORIZE_BASE = "https://www.facebook.com/v21.0/dialog/oauth";

// 주의: Meta 콘솔 "필수 권한 추가" 화면엔 "instagram_content_publishing"으로 표시되지만,
// 이건 UI 설명 라벨일 뿐이고 실제 OAuth scope 파라미터 값은 "instagram_content_publish"다
// (ing 없음). 콘솔 표기를 그대로 썼다가 "Invalid Scope" 에러가 났던 적이 있어 남겨둔다 (shots에서 확인됨).
const FACEBOOK_INSTAGRAM_SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_show_list",
  "pages_read_engagement",
  "business_management",
].join(",");

export function getFacebookAuthorizeUrl(state: string, appId: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: FACEBOOK_INSTAGRAM_SCOPES,
    response_type: "code",
    state,
  });
  return `${FACEBOOK_AUTHORIZE_BASE}?${params.toString()}`;
}

export async function exchangeFacebookCode(code: string, appId: string, appSecret: string, redirectUri: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });
  const response = await fetch(`${FACEBOOK_GRAPH_BASE}/oauth/access_token?${params.toString()}`);
  const data = await parseGraphResponse<{ access_token: string }>(response);
  return data.access_token;
}

/** 60일짜리 장기 토큰으로 교환한다. */
export async function exchangeForLongLivedFacebookToken(shortLivedToken: string, appId: string, appSecret: string): Promise<{
  accessToken: string;
  expiresInSeconds: number;
}> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });
  const response = await fetch(`${FACEBOOK_GRAPH_BASE}/oauth/access_token?${params.toString()}`);
  const data = await parseGraphResponse<{ access_token: string; expires_in: number }>(response);
  return { accessToken: data.access_token, expiresInSeconds: data.expires_in };
}

export interface InstagramBusinessAccount {
  pageId: string;
  pageName: string;
  igUserId: string;
  igUsername: string;
}

/**
 * 이 Facebook 계정에 연결된 페이지들 중, 인스타그램 비즈니스 계정이 연결된 페이지를 전부 찾는다.
 * 페이지를 여러 개 관리하는 사용자가 있을 수 있어(각각 다른 인스타그램 계정과 연결) 첫 번째 것만
 * 자동으로 고르지 않고, 후보 전체를 반환해서 사용자가 직접 선택하게 한다 (accounts/select 페이지 참고).
 */
export async function findInstagramBusinessAccounts(userAccessToken: string): Promise<InstagramBusinessAccount[]> {
  const pagesRes = await fetch(`${FACEBOOK_GRAPH_BASE}/me/accounts?access_token=${userAccessToken}`);
  const pages = await parseGraphResponse<{ data: { id: string; access_token: string; name: string }[] }>(pagesRes);

  const results: InstagramBusinessAccount[] = [];
  for (const page of pages.data ?? []) {
    const igRes = await fetch(
      `${FACEBOOK_GRAPH_BASE}/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`,
    );
    const igData = await parseGraphResponse<{ instagram_business_account?: { id: string } }>(igRes);
    const igUserId = igData.instagram_business_account?.id;
    if (igUserId) {
      const usernameRes = await fetch(
        `${FACEBOOK_GRAPH_BASE}/${igUserId}?fields=username&access_token=${page.access_token}`,
      );
      const usernameData = await parseGraphResponse<{ username: string }>(usernameRes);
      results.push({ pageId: page.id, pageName: page.name, igUserId, igUsername: usernameData.username });
    }
  }

  if (results.length === 0) {
    throw new Error(
      "연결된 Facebook 페이지에서 인스타그램 비즈니스 계정을 찾지 못했습니다. 인스타그램 계정이 비즈니스/크리에이터 계정으로 전환되어 있고 Facebook 페이지와 연결되어 있는지 확인해주세요.",
    );
  }
  return results;
}

// ─────────────────────────────────────────────────────────────
// 2) instagram_login — 회원 본인 Meta 앱(BYOK) 방식 (대체/fallback 방식)

const INSTAGRAM_AUTHORIZE_BASE = "https://www.instagram.com/oauth/authorize";
const INSTAGRAM_SHORT_TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const INSTAGRAM_GRAPH_BASE = "https://graph.instagram.com/v25.0";

// instagram_business_basic: 기본 프로필 조회. instagram_business_content_publish: 미디어
// 컨테이너 생성 + 게시(피드/카드뉴스 게시에 필요).
const INSTAGRAM_LOGIN_SCOPES = "instagram_business_basic,instagram_business_content_publish";

export function getInstagramAuthorizeUrl(state: string, appId: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: INSTAGRAM_LOGIN_SCOPES,
    state,
  });
  return `${INSTAGRAM_AUTHORIZE_BASE}?${params.toString()}`;
}

interface ShortLivedTokenResponse {
  access_token: string;
  user_id: string;
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
  redirectUri: string,
): Promise<ShortLivedTokenResponse> {
  const body = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });

  const response = await fetch(INSTAGRAM_SHORT_TOKEN_URL, {
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
  const response = await fetch(`${INSTAGRAM_GRAPH_BASE}/access_token?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`인스타그램 장기 토큰 교환에 실패했습니다. (${response.status}) ${await response.text()}`);
  }
  return response.json();
}

export interface InstagramAccountInfo {
  igUserId: string;
  username: string;
}

export async function getInstagramAccountInfo(accessToken: string, igUserId: string): Promise<InstagramAccountInfo> {
  const params = new URLSearchParams({ fields: "username", access_token: accessToken });
  const response = await fetch(`${INSTAGRAM_GRAPH_BASE}/${igUserId}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`인스타그램 계정 정보 조회에 실패했습니다. (${response.status}) ${await response.text()}`);
  }
  const data = (await response.json()) as { id?: string; username?: string };
  if (!data.username) throw new Error("인스타그램 계정 정보를 찾지 못했습니다.");
  return { igUserId, username: data.username };
}
