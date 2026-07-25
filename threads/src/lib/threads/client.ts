import "server-only";
import type {
  PublishThreadsPostParams,
  PublishThreadsPostResult,
  ThreadsApiError,
  ThreadsContainerResponse,
  ThreadsLongLivedTokenResponse,
  ThreadsPublishResponse,
  ThreadsTokenExchangeResponse,
  ThreadsUserProfile,
} from "./types";

// 이 모듈은 서버 코드(Server Action / Route Handler)에서만 import 해야 합니다.
// Access Token이 브라우저로 절대 전달되지 않도록 여기서만 Threads API를 호출합니다.

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

export function getThreadsAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getEnv("THREADS_APP_ID"),
    redirect_uri: getEnv("THREADS_REDIRECT_URI"),
    scope: THREADS_SCOPES,
    response_type: "code",
    state,
  });
  return `${AUTHORIZE_BASE}?${params.toString()}`;
}

export async function exchangeCodeForToken(
  code: string,
): Promise<ThreadsTokenExchangeResponse> {
  const form = new URLSearchParams({
    client_id: getEnv("THREADS_APP_ID"),
    client_secret: getEnv("THREADS_APP_SECRET"),
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
): Promise<ThreadsLongLivedTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "th_exchange_token",
    client_secret: getEnv("THREADS_APP_SECRET"),
    access_token: shortLivedToken,
  });

  const response = await fetch(`${GRAPH_BASE}/access_token?${params.toString()}`);
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
}): Promise<string> {
  const { accessToken, threadsUserId, text, imageUrl } = params;

  const body = new URLSearchParams({
    access_token: accessToken,
    text,
    media_type: imageUrl ? "IMAGE" : "TEXT",
  });
  if (imageUrl) {
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

// 미디어 컨테이너 생성 -> (이미지의 경우 처리 대기) -> 게시 -> permalink 조회 순서로 진행합니다.
export async function publishThreadsPost(
  params: PublishThreadsPostParams,
): Promise<PublishThreadsPostResult> {
  const { accessToken, threadsUserId, text, imageUrl } = params;

  const creationId = await createThreadsContainer({
    accessToken,
    threadsUserId,
    text,
    imageUrl,
  });

  if (imageUrl) {
    // 이미지 컨테이너는 서버 측 처리 시간이 필요할 수 있어 짧게 대기 후 게시합니다.
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  const threadsPostId = await publishThreadsContainer({
    accessToken,
    threadsUserId,
    creationId,
  });

  const permalink = await getThreadsPostPermalink({ accessToken, threadsPostId });

  return { threadsPostId, permalink };
}
