import "server-only";

// 이 모듈은 서버 코드에서만 import 해야 한다. Access Token이 브라우저로 전달되지 않도록
// 여기서만 Instagram Graph API(Meta)를 호출한다.
//
// 2026-09-07: Facebook 로그인 + 운영자 공용 앱(META_APP_ID/META_APP_SECRET) + Facebook 페이지
// 필수 방식(구버전)에서, "Instagram API with Instagram Login"(Business Login for Instagram)
// 방식으로 전면 교체했다. 이 방식은 Facebook 페이지 연결이 필요 없고(공식 문서 확인,
// developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/),
// 콘텐츠 퍼블리싱(instagram_business_content_publish)까지 지원한다. 무엇보다 회원이 각자
// 본인 소유 Meta 앱을 만들어 App ID/Secret을 등록하는 구조(threads-comment-reply,
// instagram-comment-reply, instagram-dm-reply와 동일)라, AIMaster 루트 CLAUDE.md의
// "본인 API 키만 사용, 관리자 공용 키 폴백 금지" 원칙에 맞는다 — 구버전은 운영자 소유의
// 단일 공용 앱을 모든 회원이 같이 쓰는 구조였는데, 그 앱이 Meta App Review(Live 전환)를
// 받은 적이 없어 실제로는 운영자 본인 계정 외에는 작동하지 않았을 가능성이 높았다.
//
// instagram-comment-reply/lib/instagram/client.ts와 동일한 엔드포인트를 그대로 재사용한다.
const AUTHORIZE_BASE = "https://www.instagram.com/oauth/authorize";
const SHORT_TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const GRAPH_BASE = "https://graph.instagram.com/v25.0";

// instagram_business_basic: 기본 프로필 조회. instagram_business_content_publish: 미디어
// 컨테이너 생성 + 게시(피드/카드뉴스 게시에 필요).
const INSTAGRAM_SCOPES = "instagram_business_basic,instagram_business_content_publish";

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

async function parseGraphResponse<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) {
    const err = body as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? `Instagram API 요청이 실패했습니다. (${response.status})`);
  }
  return body as T;
}

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
  const data = await postGraphWithRetry<{ id: string }>(`${GRAPH_BASE}/${params.igUserId}/media`, body);
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
  const data = await postGraphWithRetry<{ id: string }>(`${GRAPH_BASE}/${params.igUserId}/media_publish`, body);
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
  const data = await postGraphWithRetry<{ id: string }>(`${GRAPH_BASE}/${params.igUserId}/media`, body);
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
  const data = await postGraphWithRetry<{ id: string }>(`${GRAPH_BASE}/${params.igUserId}/media`, body);
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
