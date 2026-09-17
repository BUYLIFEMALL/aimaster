import "server-only";
import type {
  PublishThreadsPostParams,
  PublishThreadsPostResult,
  ThreadsApiError,
  ThreadsContainerResponse,
  ThreadsContainerStatusResponse,
  ThreadsLongLivedTokenResponse,
  ThreadsPublishResponse,
  ThreadsTokenExchangeResponse,
  ThreadsUserProfile,
} from "./types";

// 이 모듈은 서버 코드(Server Action / Route Handler)에서만 import 해야 합니다.
// Access Token이 브라우저로 절대 전달되지 않도록 여기서만 Threads API를 호출합니다.
//
// 2026-09-16 변경: 예전에는 threads/(자동 포스팅) 서브프로젝트가 쓰는 앱(관리자) 공용 단일
// Meta 앱(THREADS_APP_ID/THREADS_APP_SECRET 환경변수)을 그대로 재사용했지만, 그 Meta 앱이
// Development 모드라 그 앱의 Tester로 등록된 계정(운영자 본인)만 OAuth를 완료할 수 있어 다른
// 회원은 이 프로그램에서 Threads 계정을 연결할 수 없었다. threads-comment-reply가 쓰는
// BYOK(본인 Meta 앱 등록) 패턴으로 전환해서, 회원마다 본인이 만든 Meta 앱의 App ID/Secret을
// user_api_keys에 등록하고 그 값을 파라미터로 받아 쓰도록 바꿨다. 스코프(threads_basic,
// threads_content_publish)는 그대로 유지한다.

const GRAPH_BASE = "https://graph.threads.net";
const AUTHORIZE_BASE = "https://threads.net/oauth/authorize";

const THREADS_SCOPES = ["threads_basic", "threads_content_publish"].join(",");

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`환경변수 ${name}가 설정되지 않았습니다.`);
  }
  return value;
}

async function parseThreadsResponse<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) {
    const err = body as ThreadsApiError;
    throw new Error(err?.error?.message ?? `Threads API 요청이 실패했습니다. (${response.status})`);
  }
  return body as T;
}

export function getThreadsAuthorizeUrl(state: string, appId: string): string {
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: getEnv("THREADS_REDIRECT_URI"),
    scope: THREADS_SCOPES,
    response_type: "code",
    state,
  });
  return `${AUTHORIZE_BASE}?${params.toString()}`;
}

export async function exchangeCodeForToken(
  code: string,
  appId: string,
  appSecret: string,
): Promise<ThreadsTokenExchangeResponse> {
  const form = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: "authorization_code",
    redirect_uri: getEnv("THREADS_REDIRECT_URI"),
    code,
  });

  const response = await fetch(`${GRAPH_BASE}/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  return parseThreadsResponse<ThreadsTokenExchangeResponse>(response);
}

export async function exchangeForLongLivedToken(
  shortLivedToken: string,
  appSecret: string,
): Promise<ThreadsLongLivedTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "th_exchange_token",
    client_secret: appSecret,
    access_token: shortLivedToken,
  });

  const response = await fetch(`${GRAPH_BASE}/access_token?${params.toString()}`);
  return parseThreadsResponse<ThreadsLongLivedTokenResponse>(response);
}

export async function refreshLongLivedToken(
  accessToken: string,
): Promise<ThreadsLongLivedTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "th_refresh_token",
    access_token: accessToken,
  });

  const response = await fetch(`${GRAPH_BASE}/refresh_access_token?${params.toString()}`);
  return parseThreadsResponse<ThreadsLongLivedTokenResponse>(response);
}

export async function getThreadsUserProfile(
  accessToken: string,
): Promise<ThreadsUserProfile> {
  const params = new URLSearchParams({
    fields: "id,username",
    access_token: accessToken,
  });

  const response = await fetch(`${GRAPH_BASE}/v1.0/me?${params.toString()}`);
  return parseThreadsResponse<ThreadsUserProfile>(response);
}

async function createThreadsContainer(params: {
  accessToken: string;
  threadsUserId: string;
  text: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
}): Promise<string> {
  const { accessToken, threadsUserId, text, imageUrl, videoUrl } = params;

  const mediaType = videoUrl ? "VIDEO" : imageUrl ? "IMAGE" : "TEXT";
  const body = new URLSearchParams({
    access_token: accessToken,
    text,
    media_type: mediaType,
  });
  if (videoUrl) {
    body.set("video_url", videoUrl);
  } else if (imageUrl) {
    body.set("image_url", imageUrl);
  }

  const response = await fetch(`${GRAPH_BASE}/v1.0/${threadsUserId}/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const result = await parseThreadsResponse<ThreadsContainerResponse>(response);
  return result.id;
}

// 이미지 컨테이너는 Meta 서버에서 비동기로 처리되며, 고정 대기시간만으로는
// 처리가 안 끝난 상태에서 게시를 시도해 실패하는 경우가 있다 (Threads/IG
// Graph API 공통 이슈). status가 FINISHED가 될 때까지 짧은 간격으로
// 상태를 조회(polling)해서 실제로 게시 가능한 상태인지 확인한다.
// 주의: 필드명은 Instagram Graph API의 "status_code"가 아니라 Threads Graph API
// 문서 기준 "status"다 — threads/ 프로젝트에서 실제로 이 필드명 오류 때문에
// 이미지가 있는 게시물이 매번 게시 실패했던 이력이 있다.
async function waitForContainerReady(params: {
  accessToken: string;
  creationId: string;
  timeoutMs?: number;
  intervalMs?: number;
}): Promise<void> {
  const { accessToken, creationId, timeoutMs = 60_000, intervalMs = 2_000 } = params;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const query = new URLSearchParams({
      fields: "status,error_message",
      access_token: accessToken,
    });
    const response = await fetch(`${GRAPH_BASE}/v1.0/${creationId}?${query.toString()}`);
    const result = await parseThreadsResponse<ThreadsContainerStatusResponse>(response);

    if (result.status === "FINISHED") return;
    if (result.status === "ERROR" || result.status === "EXPIRED") {
      throw new Error(
        result.error_message
          ? `Threads 미디어 처리에 실패했습니다: ${result.error_message}`
          : `Threads 미디어 처리에 실패했습니다. (${result.status})`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Threads 미디어 처리가 너무 오래 걸려 게시를 중단했습니다. 잠시 후 다시 시도해주세요.");
}

async function publishThreadsContainer(params: {
  accessToken: string;
  threadsUserId: string;
  creationId: string;
}): Promise<string> {
  const { accessToken, threadsUserId, creationId } = params;

  const body = new URLSearchParams({
    access_token: accessToken,
    creation_id: creationId,
  });

  const response = await fetch(`${GRAPH_BASE}/v1.0/${threadsUserId}/threads_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const result = await parseThreadsResponse<ThreadsPublishResponse>(response);
  return result.id;
}

async function getThreadsPostPermalink(params: {
  accessToken: string;
  threadsPostId: string;
}): Promise<string> {
  const { accessToken, threadsPostId } = params;
  const query = new URLSearchParams({
    fields: "permalink",
    access_token: accessToken,
  });

  const response = await fetch(`${GRAPH_BASE}/v1.0/${threadsPostId}?${query.toString()}`);
  const result = await parseThreadsResponse<{ id: string; permalink: string }>(response);
  return result.permalink;
}

// 미디어 컨테이너 생성 -> (이미지/영상의 경우 처리 대기) -> 게시 -> permalink 조회 순서로 진행합니다.
// 영상은 Meta 서버 처리에 이미지보다 오래 걸리는 게 공식 문서 기준이라(평균 30초 이상)
// 타임아웃을 더 길게 준다.
async function createThreadsCarouselItemContainer(params: {
  accessToken: string;
  threadsUserId: string;
  mediaType: "IMAGE" | "VIDEO";
  url: string;
}): Promise<string> {
  const { accessToken, threadsUserId, mediaType, url } = params;
  const body = new URLSearchParams({
    access_token: accessToken,
    is_carousel_item: "true",
    media_type: mediaType,
  });
  if (mediaType === "VIDEO") {
    body.set("video_url", url);
  } else {
    body.set("image_url", url);
  }

  const response = await fetch(`${GRAPH_BASE}/v1.0/${threadsUserId}/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const result = await parseThreadsResponse<ThreadsContainerResponse>(response);
  return result.id;
}

async function createThreadsCarouselParentContainer(params: {
  accessToken: string;
  threadsUserId: string;
  text: string;
  children: string[];
}): Promise<string> {
  const { accessToken, threadsUserId, text, children } = params;
  const body = new URLSearchParams({
    access_token: accessToken,
    media_type: "CAROUSEL",
    children: children.join(","),
    text,
  });

  const response = await fetch(`${GRAPH_BASE}/v1.0/${threadsUserId}/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const result = await parseThreadsResponse<ThreadsContainerResponse>(response);
  return result.id;
}

// 미디어 컨테이너 생성 -> (이미지/영상의 경우 처리 대기) -> 게시 -> permalink 조회 순서로 진행합니다.
// 영상은 Meta 서버 처리에 이미지보다 오래 걸리는 게 공식 문서 기준이라(평균 30초 이상)
// 타임아웃을 더 길게 준다.
// 캐러셀(Carousel)의 경우 최대 20개의 이미지/동영상을 아이템 컨테이너로 각각 생성 후 FINISHED 상태를 확인하고,
// 부모 컨테이너(children=ID1,ID2...)를 게시합니다.
export async function publishThreadsPost(
  params: PublishThreadsPostParams,
): Promise<PublishThreadsPostResult> {
  const { accessToken, threadsUserId, text, imageUrl, videoUrl, imageUrls, mediaItems } = params;

  // 캐러셀 용 미디어 항목 추출 (최대 20개)
  const items: Array<{ url: string; type: "IMAGE" | "VIDEO" }> = [];

  if (mediaItems && mediaItems.length > 0) {
    for (const item of mediaItems) {
      if (item.url) {
        items.push({ url: item.url, type: item.type ?? (item.url.match(/\.(mp4|mov)(\?.*)?$/i) ? "VIDEO" : "IMAGE") });
      }
    }
  } else if (imageUrls && imageUrls.length > 0) {
    for (const url of imageUrls) {
      if (url) items.push({ url, type: "IMAGE" });
    }
  }

  // 항목이 없는 경우 단일 imageUrl/videoUrl 사용
  if (items.length === 0) {
    if (videoUrl) items.push({ url: videoUrl, type: "VIDEO" });
    else if (imageUrl) items.push({ url: imageUrl, type: "IMAGE" });
  }

  let creationId: string;

  if (items.length > 1) {
    // 2개 이상인 경우 캐러셀(CAROUSEL) 처리 (최대 20개)
    const carouselItems = items.slice(0, 20);
    const itemContainerIds: string[] = [];

    for (const item of carouselItems) {
      const childId = await createThreadsCarouselItemContainer({
        accessToken,
        threadsUserId,
        mediaType: item.type,
        url: item.url,
      });
      itemContainerIds.push(childId);
    }

    // 모든 자식 컨테이너 준비 상태 확인
    for (let i = 0; i < itemContainerIds.length; i++) {
      const childId = itemContainerIds[i];
      const isVideo = carouselItems[i].type === "VIDEO";
      await waitForContainerReady({
        accessToken,
        creationId: childId,
        timeoutMs: isVideo ? 180_000 : 60_000,
        intervalMs: isVideo ? 3_000 : 2_000,
      });
    }

    // 부모 캐러셀 컨테이너 생성
    creationId = await createThreadsCarouselParentContainer({
      accessToken,
      threadsUserId,
      text,
      children: itemContainerIds,
    });

    await waitForContainerReady({ accessToken, creationId });
  } else if (items.length === 1) {
    // 단일 미디어 처리
    const single = items[0];
    creationId = await createThreadsContainer({
      accessToken,
      threadsUserId,
      text,
      imageUrl: single.type === "IMAGE" ? single.url : null,
      videoUrl: single.type === "VIDEO" ? single.url : null,
    });

    if (single.type === "VIDEO") {
      await waitForContainerReady({ accessToken, creationId, timeoutMs: 180_000, intervalMs: 3_000 });
    } else {
      await waitForContainerReady({ accessToken, creationId });
    }
  } else {
    // 텍스트 전용 포스트
    creationId = await createThreadsContainer({
      accessToken,
      threadsUserId,
      text,
    });
  }

  const threadsPostId = await publishThreadsContainer({
    accessToken,
    threadsUserId,
    creationId,
  });

  const permalink = await getThreadsPostPermalink({ accessToken, threadsPostId });

  return { threadsPostId, permalink };
}
