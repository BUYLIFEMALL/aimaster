import "server-only";

// 공용 기준 코드 `instagram-publish` — 기준: insta_auto_poster/src/lib/instagram/publish.ts (docs/SHARED_MODULES.md)
// 사본은 직접 고치지 않는다. 기준만 고치고 `node scripts/check-shared-modules.mjs --sync`로 사본에 반영한다.
// 인스타그램 게시(피드 1장·캐러셀 2~10장). 회원 본인 계정의 Access Token으로만 호출하며(호출부가 회원 본인 연결값을 넘김),
// 토큰은 브라우저로 보내지 않는다. 인스타그램 API는 공개된 JPEG 이미지 주소만 받는다.
// 2026-10-19 insta_auto_poster `client.ts`의 게시 부분을 그대로 옮겨 독립 파일로 만듦(동작 변경 없음).

export type InstagramAuthMethod = "facebook_login" | "instagram_login";

const FACEBOOK_GRAPH_BASE = "https://graph.facebook.com/v21.0";
const INSTAGRAM_GRAPH_BASE = "https://graph.instagram.com/v25.0";

/** 연동 방식에 맞는 Graph API host를 반환한다. */
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

// Meta Graph API가 자체 서버 사정으로 이미지 컨테이너 생성/게시 요청에 "Timeout"을 그대로
// 돌려주는 경우가 있다(우리 쪽 코드 타임아웃이 아니라 Meta 응답 본문의 error.message가 문자 그대로
// "Timeout"). 이런 일시적 오류는 재시도하면 대부분 성공하므로, POST 요청 몇 개에 짧은 재시도를
// 붙인다. 무한 재시도는 route의 maxDuration 예산을 넘길 수 있어 2회로 제한한다.
async function postGraphWithRetry<T>(url: string, body: URLSearchParams, maxRetries = 2): Promise<T> {
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

async function createImageContainer(params: { graphBase: string; accessToken: string; igUserId: string; imageUrl: string; caption: string }): Promise<string> {
  const body = new URLSearchParams({ access_token: params.accessToken, image_url: params.imageUrl, caption: params.caption });
  const data = await postGraphWithRetry<{ id: string }>(`${params.graphBase}/${params.igUserId}/media`, body);
  return data.id;
}

// 이미지 컨테이너는 Meta 서버에서 비동기로 처리되며, 고정 대기시간만으로는
// 처리가 안 끝난 상태에서 게시를 시도해 실패하는 경우가 있다 (docs/PLATFORM_PATTERNS.md §7 참고).
// status_code가 FINISHED가 될 때까지 폴링한다.
async function waitForContainerReady(params: { graphBase: string; accessToken: string; creationId: string; timeoutMs?: number; intervalMs?: number }): Promise<void> {
  const { graphBase, accessToken, creationId, timeoutMs = 60_000, intervalMs = 2_000 } = params;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await fetch(`${graphBase}/${creationId}?fields=status_code&access_token=${accessToken}`);
    const data = await parseGraphResponse<{ status_code: string }>(response);
    if (data.status_code === "FINISHED") return;
    if (data.status_code === "ERROR" || data.status_code === "EXPIRED") {
      throw new Error(`인스타그램 미디어 처리에 실패했습니다. (${data.status_code})`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error("인스타그램 미디어 처리가 너무 오래 걸려 게시를 중단했습니다. 잠시 후 다시 시도해주세요.");
}

async function publishContainer(params: { graphBase: string; accessToken: string; igUserId: string; creationId: string }): Promise<string> {
  const body = new URLSearchParams({ access_token: params.accessToken, creation_id: params.creationId });
  const data = await postGraphWithRetry<{ id: string }>(`${params.graphBase}/${params.igUserId}/media_publish`, body);
  return data.id;
}

async function getPermalink(params: { graphBase: string; accessToken: string; mediaId: string }): Promise<string> {
  const response = await fetch(`${params.graphBase}/${params.mediaId}?fields=permalink&access_token=${params.accessToken}`);
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

/** 피드 이미지 게시: 컨테이너 생성 -> 처리 완료(FINISHED) 대기(폴링) -> 게시 -> permalink 조회. */
export async function publishInstagramPost(input: PublishInstagramPostInput): Promise<PublishInstagramPostResult> {
  const creationId = await createImageContainer(input);
  await waitForContainerReady({ graphBase: input.graphBase, accessToken: input.accessToken, creationId });
  const mediaId = await publishContainer({ graphBase: input.graphBase, accessToken: input.accessToken, igUserId: input.igUserId, creationId });
  const permalink = await getPermalink({ graphBase: input.graphBase, accessToken: input.accessToken, mediaId });
  return { mediaId, permalink };
}

// 카드뉴스(캐러셀) 게시. Graph API 규칙: 이미지마다 is_carousel_item=true로 하위(item) 컨테이너를 먼저 만든 뒤,
// 부모 컨테이너를 media_type=CAROUSEL + children=[하위 컨테이너 id들]로 만들어 게시한다.
async function createCarouselItemContainer(params: { graphBase: string; accessToken: string; igUserId: string; imageUrl: string }): Promise<string> {
  const body = new URLSearchParams({ access_token: params.accessToken, image_url: params.imageUrl, is_carousel_item: "true" });
  const data = await postGraphWithRetry<{ id: string }>(`${params.graphBase}/${params.igUserId}/media`, body);
  return data.id;
}

async function createCarouselParentContainer(params: { graphBase: string; accessToken: string; igUserId: string; childrenIds: string[]; caption: string }): Promise<string> {
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
export async function publishInstagramCarousel(input: PublishInstagramCarouselInput): Promise<PublishInstagramPostResult> {
  const childrenIds: string[] = [];
  for (const imageUrl of input.imageUrls) {
    const itemId = await createCarouselItemContainer({ graphBase: input.graphBase, accessToken: input.accessToken, igUserId: input.igUserId, imageUrl });
    await waitForContainerReady({ graphBase: input.graphBase, accessToken: input.accessToken, creationId: itemId });
    childrenIds.push(itemId);
  }
  const parentId = await createCarouselParentContainer({ graphBase: input.graphBase, accessToken: input.accessToken, igUserId: input.igUserId, childrenIds, caption: input.caption });
  await waitForContainerReady({ graphBase: input.graphBase, accessToken: input.accessToken, creationId: parentId });
  const mediaId = await publishContainer({ graphBase: input.graphBase, accessToken: input.accessToken, igUserId: input.igUserId, creationId: parentId });
  const permalink = await getPermalink({ graphBase: input.graphBase, accessToken: input.accessToken, mediaId });
  return { mediaId, permalink };
}
