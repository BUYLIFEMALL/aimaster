import "server-only";

// 이 모듈은 서버 코드에서만 import 해야 한다. Access Token이 브라우저로 전달되지 않도록
// 여기서만 Instagram Graph API(Meta)를 호출한다.
// 전제 조건(플랫폼 자체 제약, 우리가 바꿀 수 없음): 사용자의 인스타그램 계정이
// 비즈니스/크리에이터 계정이어야 하고, Facebook 페이지와 연결되어 있어야 한다.
// shots/src/lib/instagram/client.ts(릴스 게시)와 동일한 OAuth/계정탐색 로직을 공유하되,
// 이 프로그램은 피드(이미지) 게시가 목적이라 미디어 컨테이너 로직만 다르다.

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const AUTHORIZE_BASE = "https://www.facebook.com/v21.0/dialog/oauth";

// 주의: Meta 콘솔 "필수 권한 추가" 화면엔 "instagram_content_publishing"으로 표시되지만,
// 이건 UI 설명 라벨일 뿐이고 실제 OAuth scope 파라미터 값은 "instagram_content_publish"다
// (ing 없음). 콘솔 표기를 그대로 썼다가 "Invalid Scope" 에러가 났던 적이 있어 남겨둔다 (shots에서 확인됨).
const INSTAGRAM_SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_show_list",
  "pages_read_engagement",
  "business_management",
].join(",");

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`환경변수 ${name}가 설정되지 않았습니다.`);
  return value;
}

async function parseGraphResponse<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) {
    const err = body as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? `Instagram/Facebook API 요청이 실패했습니다. (${response.status})`);
  }
  return body as T;
}

export function getInstagramAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getEnv("META_APP_ID"),
    redirect_uri: getEnv("META_INSTAGRAM_REDIRECT_URI"),
    scope: INSTAGRAM_SCOPES,
    response_type: "code",
    state,
  });
  return `${AUTHORIZE_BASE}?${params.toString()}`;
}

export async function exchangeInstagramCode(code: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: getEnv("META_APP_ID"),
    client_secret: getEnv("META_APP_SECRET"),
    redirect_uri: getEnv("META_INSTAGRAM_REDIRECT_URI"),
    code,
  });
  const response = await fetch(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`);
  const data = await parseGraphResponse<{ access_token: string }>(response);
  return data.access_token;
}

/** 60일짜리 장기 토큰으로 교환한다. */
export async function exchangeForLongLivedInstagramToken(shortLivedToken: string): Promise<{
  accessToken: string;
  expiresInSeconds: number;
}> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: getEnv("META_APP_ID"),
    client_secret: getEnv("META_APP_SECRET"),
    fb_exchange_token: shortLivedToken,
  });
  const response = await fetch(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`);
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
  const pagesRes = await fetch(`${GRAPH_BASE}/me/accounts?access_token=${userAccessToken}`);
  const pages = await parseGraphResponse<{ data: { id: string; access_token: string; name: string }[] }>(pagesRes);

  const results: InstagramBusinessAccount[] = [];
  for (const page of pages.data ?? []) {
    const igRes = await fetch(
      `${GRAPH_BASE}/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`,
    );
    const igData = await parseGraphResponse<{ instagram_business_account?: { id: string } }>(igRes);
    const igUserId = igData.instagram_business_account?.id;
    if (igUserId) {
      const usernameRes = await fetch(`${GRAPH_BASE}/${igUserId}?fields=username&access_token=${page.access_token}`);
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

async function createImageContainer(params: {
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
  const response = await fetch(`${GRAPH_BASE}/${params.igUserId}/media`, { method: "POST", body });
  const data = await parseGraphResponse<{ id: string }>(response);
  return data.id;
}

// 이미지 컨테이너는 Meta 서버에서 비동기로 처리되며, 고정 대기시간만으로는
// 처리가 안 끝난 상태에서 게시를 시도해 실패하는 경우가 있다 (threads에서 겪은 문제와 동일,
// docs/PLATFORM_PATTERNS.md §7 참고). status_code가 FINISHED가 될 때까지 폴링한다.
async function waitForContainerReady(params: {
  accessToken: string;
  creationId: string;
  timeoutMs?: number;
  intervalMs?: number;
}): Promise<void> {
  const { accessToken, creationId, timeoutMs = 60_000, intervalMs = 2_000 } = params;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const response = await fetch(
      `${GRAPH_BASE}/${creationId}?fields=status_code&access_token=${accessToken}`,
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
  accessToken: string;
  igUserId: string;
  creationId: string;
}): Promise<string> {
  const body = new URLSearchParams({ access_token: params.accessToken, creation_id: params.creationId });
  const response = await fetch(`${GRAPH_BASE}/${params.igUserId}/media_publish`, { method: "POST", body });
  const data = await parseGraphResponse<{ id: string }>(response);
  return data.id;
}

async function getPermalink(params: { accessToken: string; mediaId: string }): Promise<string> {
  const response = await fetch(`${GRAPH_BASE}/${params.mediaId}?fields=permalink&access_token=${params.accessToken}`);
  const data = await parseGraphResponse<{ permalink: string }>(response);
  return data.permalink;
}

export interface PublishInstagramPostInput {
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
    accessToken: input.accessToken,
    igUserId: input.igUserId,
    imageUrl: input.imageUrl,
    caption: input.caption,
  });

  await waitForContainerReady({ accessToken: input.accessToken, creationId });

  const mediaId = await publishContainer({
    accessToken: input.accessToken,
    igUserId: input.igUserId,
    creationId,
  });

  const permalink = await getPermalink({ accessToken: input.accessToken, mediaId });

  return { mediaId, permalink };
}

// ─────────────────────────────────────────────────────────────
// 카드뉴스(캐러셀, 여러 장 이미지) 게시.
// Graph API 규칙: 이미지마다 is_carousel_item=true로 하위(item) 컨테이너를 먼저 만든 뒤,
// 부모 컨테이너를 media_type=CAROUSEL + children=[하위 컨테이너 id들]로 만들어 게시한다.
// (Make 카드뉴스 시나리오의 instagram-business:CreateCarouselPhoto 모듈과 동일한 절차.)

async function createCarouselItemContainer(params: {
  accessToken: string;
  igUserId: string;
  imageUrl: string;
}): Promise<string> {
  const body = new URLSearchParams({
    access_token: params.accessToken,
    image_url: params.imageUrl,
    is_carousel_item: "true",
  });
  const response = await fetch(`${GRAPH_BASE}/${params.igUserId}/media`, { method: "POST", body });
  const data = await parseGraphResponse<{ id: string }>(response);
  return data.id;
}

async function createCarouselParentContainer(params: {
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
  const response = await fetch(`${GRAPH_BASE}/${params.igUserId}/media`, { method: "POST", body });
  const data = await parseGraphResponse<{ id: string }>(response);
  return data.id;
}

export interface PublishInstagramCarouselInput {
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
      accessToken: input.accessToken,
      igUserId: input.igUserId,
      imageUrl,
    });
    await waitForContainerReady({ accessToken: input.accessToken, creationId: itemId });
    childrenIds.push(itemId);
  }

  const parentId = await createCarouselParentContainer({
    accessToken: input.accessToken,
    igUserId: input.igUserId,
    childrenIds,
    caption: input.caption,
  });
  await waitForContainerReady({ accessToken: input.accessToken, creationId: parentId });

  const mediaId = await publishContainer({
    accessToken: input.accessToken,
    igUserId: input.igUserId,
    creationId: parentId,
  });

  const permalink = await getPermalink({ accessToken: input.accessToken, mediaId });

  return { mediaId, permalink };
}
