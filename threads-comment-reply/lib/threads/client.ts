import "server-only";

// 이 모듈은 서버 코드에서만 import 해야 한다. Access Token이 브라우저로 전달되지 않도록
// 여기서만 Meta/Threads API를 호출한다(youtube-auto-reply/lib/youtube/client.ts와 동일 원칙).
//
// 기존 threads/(Threads 자동 포스팅) 서브프로젝트의 OAuth·컨테이너/게시 흐름
// (threads/src/lib/threads/client.ts)을 그대로 가져오되, 댓글 조회(threads_read_replies)와
// 답글 게시(threads_manage_replies) 스코프/기능을 추가했다. 엔드포인트는 2026-08-26 공식 문서
// (developers.facebook.com/docs/threads/retrieve-and-manage-replies/replies-and-conversations/)로
// 직접 확인했다.
const AUTHORIZE_BASE = "https://threads.net/oauth/authorize";
const GRAPH_BASE = "https://graph.threads.net";

// threads_basic/threads_content_publish: 프로필 조회 + 게시물(답글 포함) 작성.
// threads_read_replies/threads_manage_replies: 댓글 조회 + 답글 게시·관리.
const THREADS_SCOPES = "threads_basic,threads_content_publish,threads_read_replies,threads_manage_replies";

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`환경변수 ${name}가 설정되지 않았습니다.`);
  return value;
}

export function getThreadsAuthorizeUrl(state: string, appId: string): string {
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: getEnv("META_THREADS_REDIRECT_URI"),
    response_type: "code",
    scope: THREADS_SCOPES,
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

export async function exchangeThreadsCode(
  code: string,
  appId: string,
  appSecret: string,
): Promise<ShortLivedTokenResponse> {
  const body = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: "authorization_code",
    redirect_uri: getEnv("META_THREADS_REDIRECT_URI"),
    code,
  });

  const response = await fetch(`${GRAPH_BASE}/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!response.ok) {
    throw new Error(`쓰레드 토큰 교환에 실패했습니다. (${response.status}) ${await response.text()}`);
  }
  return response.json();
}

/** 단기 토큰(1시간)을 장기 토큰(60일)으로 교환한다. */
export async function exchangeForLongLivedToken(
  shortLivedToken: string,
  appSecret: string,
): Promise<LongLivedTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "th_exchange_token",
    client_secret: appSecret,
    access_token: shortLivedToken,
  });
  const response = await fetch(`${GRAPH_BASE}/access_token?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`쓰레드 장기 토큰 교환에 실패했습니다. (${response.status}) ${await response.text()}`);
  }
  return response.json();
}

/** 만료 전 장기 토큰을 60일 더 연장한다(발급 후 24시간~60일 사이에만 가능, 공식 문서 기준). */
export async function refreshThreadsLongLivedToken(accessToken: string): Promise<LongLivedTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "th_refresh_token",
    access_token: accessToken,
  });
  const response = await fetch(`${GRAPH_BASE}/refresh_access_token?${params.toString()}`);
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`THREADS_TOKEN_EXPIRED: ${response.status} ${errorBody}`);
  }
  return response.json();
}

export interface ThreadsAccountInfo {
  threadsUserId: string;
  username: string;
}

export async function getThreadsAccountInfo(accessToken: string): Promise<ThreadsAccountInfo> {
  const params = new URLSearchParams({ fields: "id,username", access_token: accessToken });
  const response = await fetch(`${GRAPH_BASE}/v1.0/me?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`쓰레드 계정 정보 조회에 실패했습니다. (${response.status}) ${await response.text()}`);
  }
  const data = (await response.json()) as { id?: string; username?: string };
  if (!data.id || !data.username) throw new Error("쓰레드 계정 정보를 찾지 못했습니다.");
  return { threadsUserId: data.id, username: data.username };
}

export interface ThreadsPostSummary {
  postId: string;
  text: string;
  permalink: string | null;
}

/** 계정의 게시물 목록을 최신순으로 가져온다(최대 50개씩 페이지네이션). */
export async function listThreadsPosts(
  accessToken: string,
  threadsUserId: string,
  pageToken?: string,
): Promise<{ posts: ThreadsPostSummary[]; nextPageToken: string | null }> {
  const params = new URLSearchParams({
    fields: "id,text,permalink,timestamp",
    limit: "50",
    access_token: accessToken,
  });
  if (pageToken) params.set("after", pageToken);

  const response = await fetch(`${GRAPH_BASE}/v1.0/${threadsUserId}/threads?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`게시물 목록 조회에 실패했습니다. (${response.status}) ${await response.text()}`);
  }
  const data = (await response.json()) as {
    data?: { id?: string; text?: string; permalink?: string }[];
    paging?: { cursors?: { after?: string } };
  };

  const posts = (data.data ?? [])
    .filter((p) => p.id)
    .map((p) => ({
      postId: p.id as string,
      text: p.text ?? "(텍스트 없음)",
      permalink: p.permalink ?? null,
    }));

  return { posts, nextPageToken: data.paging?.cursors?.after ?? null };
}

export interface ThreadsReplyThread {
  replyId: string;
  authorUsername: string | null;
  text: string;
  publishedAt: string | null;
}

/**
 * 특정 게시물에 달린 댓글(대댓글 포함)을 전부 가져온다. `/replies`는 최상위 댓글만 반환해서
 * 대댓글을 놓칠 수 있으므로, 전체(중첩 포함)를 평탄화해서 반환하는 `/conversation`을 쓴다.
 */
export async function listRecentThreadsComments(
  accessToken: string,
  postId: string,
  maxResults = 20,
): Promise<ThreadsReplyThread[]> {
  const params = new URLSearchParams({
    fields: "id,text,username,timestamp",
    limit: String(maxResults),
    reverse: "true",
    access_token: accessToken,
  });

  const response = await fetch(`${GRAPH_BASE}/v1.0/${postId}/conversation?${params.toString()}`);
  if (!response.ok) {
    const text = await response.text();
    // 댓글이 없거나 게시물이 삭제된 경우 등은 조용히 빈 배열로 처리한다.
    if (response.status === 400 || response.status === 404) return [];
    throw new Error(`댓글 조회에 실패했습니다. (${response.status}) ${text}`);
  }
  const data = (await response.json()) as {
    data?: { id?: string; text?: string; username?: string; timestamp?: string }[];
  };

  return (data.data ?? [])
    .map((c) => ({
      replyId: c.id ?? "",
      authorUsername: c.username ?? null,
      text: c.text ?? "",
      publishedAt: c.timestamp ?? null,
    }))
    .filter((c) => c.replyId && c.text);
}

async function createReplyContainer(params: {
  accessToken: string;
  threadsUserId: string;
  replyToId: string;
  text: string;
}): Promise<string> {
  const { accessToken, threadsUserId, replyToId, text } = params;
  const body = new URLSearchParams({
    access_token: accessToken,
    text,
    media_type: "TEXT",
    reply_to_id: replyToId,
  });

  const response = await fetch(`${GRAPH_BASE}/v1.0/${threadsUserId}/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!response.ok) {
    throw new Error(`답글 컨테이너 생성에 실패했습니다. (${response.status}) ${await response.text()}`);
  }
  const data = (await response.json()) as { id?: string };
  if (!data.id) throw new Error("답글 컨테이너 생성 응답에 id가 없습니다.");
  return data.id;
}

async function publishReplyContainer(params: {
  accessToken: string;
  threadsUserId: string;
  creationId: string;
}): Promise<string> {
  const { accessToken, threadsUserId, creationId } = params;
  const body = new URLSearchParams({ access_token: accessToken, creation_id: creationId });

  const response = await fetch(`${GRAPH_BASE}/v1.0/${threadsUserId}/threads_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!response.ok) {
    throw new Error(`답글 게시에 실패했습니다. (${response.status}) ${await response.text()}`);
  }
  const data = (await response.json()) as { id?: string };
  if (!data.id) throw new Error("답글 게시 응답에 id가 없습니다.");
  return data.id;
}

/** 댓글에 답글을 단다(컨테이너 생성 -> 게시 2단계, 기존 게시물 작성과 동일한 흐름). */
export async function postThreadsCommentReply(
  accessToken: string,
  threadsUserId: string,
  replyToId: string,
  message: string,
): Promise<{ replyId: string }> {
  const creationId = await createReplyContainer({ accessToken, threadsUserId, replyToId, text: message });
  const replyId = await publishReplyContainer({ accessToken, threadsUserId, creationId });
  return { replyId };
}
