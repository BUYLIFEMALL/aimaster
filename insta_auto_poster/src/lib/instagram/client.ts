import "server-only";
import type { InstagramAuthMethod } from "@/types/database.types";

// 이 모듈은 서버 코드에서만 import 해야 한다. Access Token이 브라우저로 전달되지 않도록
// 여기서만 Instagram/Facebook Graph API(Meta)를 호출한다.
//
// 2026-09-07: 두 가지 연동 방식을 함께 지원한다.
// 1) facebook_login — 운영자 공용 앱(META_APP_ID/META_APP_SECRET)으로 Facebook 로그인 후
//    연결된 Facebook 페이지의 인스타그램 비즈니스 계정을 찾는 기존 방식. 별도 설정 없이 바로
//    쓸 수 있어 기본(1차) 연결 방법으로 유지한다. 다만 이 앱이 Meta App Review(Live 전환)를
//    받은 적이 없어, 운영자 본인이 테스터로 등록되지 않은 계정에서는 작동하지 않을 수 있다.
// 2) instagram_login — 회원이 각자 본인 소유 Meta 앱을 만들어 App ID/Secret을 등록하는
//    "Instagram API with Instagram Login" 방식(threads-comment-reply, instagram-comment-reply,
//    instagram-dm-reply와 동일 패턴). Facebook 페이지 연결이 필요 없고, AIMaster 루트
//    CLAUDE.md의 "본인 API 키만 사용" 원칙에 맞는다. facebook_login이 안 되는 회원을 위한
//    대체(fallback) 방법으로 제공한다.
export type { InstagramAuthMethod };

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`환경변수 ${name}가 설정되지 않았습니다.`);
  return value;
}

/** 연동 방식에 맞는 Graph API host를 반환한다. 게시(퍼블리시) 로직에서 공통으로 쓴다. */
export function graphBaseFor(method: InstagramAuthMethod): string {
  return method === "facebook_login" ? FACEBOOK_GRAPH_BASE : INSTAGRAM_GRAPH_BASE;
}

async function parseGraphResponse<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) {
    const err = body as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? `Instagram/Facebook API 요청이 실패했습니다. (${response.status})`);
  }
  return body as T;
}

// ─────────────────────────────────────────────────────────────
// 1) facebook_login — 운영자 공용 앱 + Facebook 페이지 방식 (기존/기본 방식)

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

export function getFacebookAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getEnv("META_APP_ID"),
    redirect_uri: getEnv("META_INSTAGRAM_REDIRECT_URI"),
    scope: FACEBOOK_INSTAGRAM_SCOPES,
    response_type: "code",
    state,
  });
  return `${FACEBOOK_AUTHORIZE_BASE}?${params.toString()}`;
}

export async function exchangeFacebookCode(code: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: getEnv("META_APP_ID"),
    client_secret: getEnv("META_APP_SECRET"),
    redirect_uri: getEnv("META_INSTAGRAM_REDIRECT_URI"),
    code,
  });
  const response = await fetch(`${FACEBOOK_GRAPH_BASE}/oauth/access_token?${params.toString()}`);
  const data = await parseGraphResponse<{ access_token: string }>(response);
  return data.access_token;
}

/** 60일짜리 장기 토큰으로 교환한다. */
export async function exchangeForLongLivedFacebookToken(shortLivedToken: string): Promise<{
  accessToken: string;
  expiresInSeconds: number;
}> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: getEnv("META_APP_ID"),
    client_secret: getEnv("META_APP_SECRET"),
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

export function getInstagramAuthorizeUrl(state: string, appId: string): string {
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: getEnv("META_INSTAGRAM_BYOK_REDIRECT_URI"),
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
): Promise<ShortLivedTokenResponse> {
  const body = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: "authorization_code",
    redirect_uri: getEnv("META_INSTAGRAM_BYOK_REDIRECT_URI"),
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

// ─────────────────────────────────────────────────────────────
// 게시(퍼블리시) 로직 — 두 방식 모두 Graph API 규격이 동일해서(호스트만 다름) 공유한다.
// graphBase는 연결된 계정의 auth_method에 맞게 graphBaseFor()로 구해서 넘긴다.

// Meta Graph API가 자체 서버 사정으로 이미지 컨테이너 생성/게시 요청에 "Timeout"을 그대로
// 돌려주는 경우가 있다(우리 쪽 코드 타임아웃이 아니라 Meta 응답 본문의 error.message가 문자 그대로
// "Timeout"). 이런 일시적 오류는 재시도하면 대부분 성공하므로, POST 요청 몇 개에 짧은 재시도를
// 붙인다. 무한 재시도는 route의 maxDuration(120s) 예산을 넘길 수 있어 2회로 제한한다.
async function postGraphWithRetry<T>(
  url: string,
  body: URLSearchParams,
  maxRetries = 2,
): Promise<T> {
  let lastError: Error = new Error("Graph API 요청이 실패했습니다.");
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, { method: "POST", body });
      return await parseGraphResponse<T>(response);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const isTransient = /timeout/i.test(lastError.message);
      if (!isTransient || attempt === maxRetries) throw lastError;
      await new Promise((resolve) => setTimeout(resolve, 1_500 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function createImageContainer(params: {
  graphBase: string;
  accessToken: string;
  igUserId: string;
  imageUrl: string;
  caption: string;
}): Promise<string> {
  const body = new URLSearchParams({
    access_token: params.accessToken,
    image_url: params.imageUrl,
    caption: params.caption,
  });
  const data = await postGraphWithRetry<{ id: string }>(`${params.graphBase}/${params.igUserId}/media`, body);
  return data.id;
}

// 이미지 컨테이너는 Meta 서버에서 비동기로 처리되며, 고정 대기시간만으로는
// 처리가 안 끝난 상태에서 게시를 시도해 실패하는 경우가 있다 (threads에서 겪은 문제와 동일,
// docs/PLATFORM_PATTERNS.md §7 참고). status_code가 FINISHED가 될 때까지 폴링한다.
async function waitForContainerReady(params: {
  graphBase: string;
  accessToken: string;
  creationId: string;
  timeoutMs?: number;
  intervalMs?: number;
}): Promise<void> {
  const { graphBase, accessToken, creationId, timeoutMs = 60_000, intervalMs = 2_000 } = params;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const response = await fetch(
      `${graphBase}/${creationId}?fields=status_code&access_token=${accessToken}`,
    );
    const data = await parseGraphResponse<{ status_code: string }>(response);
    if (data.status_code === "FINISHED") return;
    if (data.status_code === "ERROR" || data.status_code === "EXPIRED") {
      throw new Error(`인스타그램 미디어 처리에 실패했습니다. (${data.status_code})`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("인스타그램 미디어 처리가 너무 오래 걸려 게시를 중단했습니다. 잠시 후 다시 시도해주세요.");
}

async function publishContainer(params: {
  graphBase: string;
  accessToken: string;
  igUserId: string;
  creationId: string;
}): Promise<string> {
  const body = new URLSearchParams({ access_token: params.accessToken, creation_id: params.creationId });
  const data = await postGraphWithRetry<{ id: string }>(`${params.graphBase}/${params.igUserId}/media_publish`, body);
  return data.id;
}

async function getPermalink(params: { graphBase: string; accessToken: string; mediaId: string }): Promise<string> {
  const response = await fetch(
    `${params.graphBase}/${params.mediaId}?fields=permalink&access_token=${params.accessToken}`,
  );
  const data = await parseGraphResponse<{ permalink: string }>(response);
  return data.permalink;
}

export interface PublishInstagramPostInput {
  graphBase: string;
  accessToken: string;
  igUserId: string;
  imageUrl: string;
  caption: string;
}

export interface PublishInstagramPostResult {
  mediaId: string;
  permalink: string;
}

/**
 * 피드 이미지 게시: 컨테이너 생성 -> 처리 완료(FINISHED) 대기(폴링) -> 게시 -> permalink 조회.
 */
export async function publishInstagramPost(input: PublishInstagramPostInput): Promise<PublishInstagramPostResult> {
  const creationId = await createImageContainer({
    graphBase: input.graphBase,
    accessToken: input.accessToken,
    igUserId: input.igUserId,
    imageUrl: input.imageUrl,
    caption: input.caption,
  });

  await waitForContainerReady({ graphBase: input.graphBase, accessToken: input.accessToken, creationId });

  const mediaId = await publishContainer({
    graphBase: input.graphBase,
    accessToken: input.accessToken,
    igUserId: input.igUserId,
    creationId,
  });

  const permalink = await getPermalink({ graphBase: input.graphBase, accessToken: input.accessToken, mediaId });

  return { mediaId, permalink };
}

// ─────────────────────────────────────────────────────────────
// 카드뉴스(캐러셀, 여러 장 이미지) 게시.
// Graph API 규칙: 이미지마다 is_carousel_item=true로 하위(item) 컨테이너를 먼저 만든 뒤,
// 부모 컨테이너를 media_type=CAROUSEL + children=[하위 컨테이너 id들]로 만들어 게시한다.
// (Make 카드뉴스 시나리오의 instagram-business:CreateCarouselPhoto 모듈과 동일한 절차.)

async function createCarouselItemContainer(params: {
  graphBase: string;
  accessToken: string;
  igUserId: string;
  imageUrl: string;
}): Promise<string> {
  const body = new URLSearchParams({
    access_token: params.accessToken,
    image_url: params.imageUrl,
    is_carousel_item: "true",
  });
  const data = await postGraphWithRetry<{ id: string }>(`${params.graphBase}/${params.igUserId}/media`, body);
  return data.id;
}

async function createCarouselParentContainer(params: {
  graphBase: string;
  accessToken: string;
  igUserId: string;
  childrenIds: string[];
  caption: string;
}): Promise<string> {
  const body = new URLSearchParams({
    access_token: params.accessToken,
    media_type: "CAROUSEL",
    children: params.childrenIds.join(","),
    caption: params.caption,
  });
  const data = await postGraphWithRetry<{ id: string }>(`${params.graphBase}/${params.igUserId}/media`, body);
  return data.id;
}

export interface PublishInstagramCarouselInput {
  graphBase: string;
  accessToken: string;
  igUserId: string;
  imageUrls: string[];
  caption: string;
}

/**
 * 카드뉴스(캐러셀) 게시: 이미지마다 하위 컨테이너 생성+처리 대기 -> 부모(CAROUSEL) 컨테이너
 * 생성+처리 대기 -> 게시 -> permalink 조회. 이미지 2~10장을 지원한다(Graph API 제약과 동일).
 */
export async function publishInstagramCarousel(
  input: PublishInstagramCarouselInput,
): Promise<PublishInstagramPostResult> {
  const childrenIds: string[] = [];
  for (const imageUrl of input.imageUrls) {
    const itemId = await createCarouselItemContainer({
      graphBase: input.graphBase,
      accessToken: input.accessToken,
      igUserId: input.igUserId,
      imageUrl,
    });
    await waitForContainerReady({ graphBase: input.graphBase, accessToken: input.accessToken, creationId: itemId });
    childrenIds.push(itemId);
  }

  const parentId = await createCarouselParentContainer({
    graphBase: input.graphBase,
    accessToken: input.accessToken,
    igUserId: input.igUserId,
    childrenIds,
    caption: input.caption,
  });
  await waitForContainerReady({ graphBase: input.graphBase, accessToken: input.accessToken, creationId: parentId });

  const mediaId = await publishContainer({
    graphBase: input.graphBase,
    accessToken: input.accessToken,
    igUserId: input.igUserId,
    creationId: parentId,
  });

  const permalink = await getPermalink({ graphBase: input.graphBase, accessToken: input.accessToken, mediaId });

  return { mediaId, permalink };
}
