import "server-only";

// 이 모듈은 서버 코드에서만 import 해야 한다. Access Token이 브라우저로 전달되지 않도록
// 여기서만 Meta/Instagram API를 호출한다(youtube-auto-reply/lib/youtube/client.ts와 동일 원칙).
//
// "Instagram API with Instagram Login"(Business Login for Instagram) 플로우를 쓴다 — Facebook
// Page 연결 없이 인스타그램 비즈니스/크리에이터 계정만으로 바로 로그인할 수 있는 최신 방식이다.
// 엔드포인트는 2026-08-25 공식 문서(developers.facebook.com/docs/instagram-platform/
// instagram-api-with-instagram-login/business-login/, .../instagram-graph-api/comment-moderation)로
// 직접 확인했다.
const AUTHORIZE_BASE = "https://www.instagram.com/oauth/authorize";
const SHORT_TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const GRAPH_BASE = "https://graph.instagram.com/v25.0";

// instagram_business_basic: 기본 프로필/미디어 조회. instagram_business_manage_comments: 댓글
// 조회 + 답글 게시(둘 다 이 스코프 하나로 커버됨, Meta 공식 문서 확인).
const INSTAGRAM_SCOPES = "instagram_business_basic,instagram_business_manage_comments";

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

export interface InstagramMediaSummary {
  mediaId: string;
  caption: string;
  permalink: string | null;
  mediaType: string;
  thumbnailUrl: string | null;
}

/** 계정의 게시물/릴스 목록을 최신순으로 가져온다(최대 50개씩 페이지네이션). */
export async function listInstagramMedia(
  accessToken: string,
  igUserId: string,
  pageToken?: string,
): Promise<{ media: InstagramMediaSummary[]; nextPageToken: string | null }> {
  const params = new URLSearchParams({
    fields: "id,caption,permalink,media_type,media_url,thumbnail_url,timestamp",
    limit: "50",
    access_token: accessToken,
  });
  if (pageToken) params.set("after", pageToken);

  const response = await fetch(`${GRAPH_BASE}/${igUserId}/media?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`게시물 목록 조회에 실패했습니다. (${response.status}) ${await response.text()}`);
  }
  const data = (await response.json()) as {
    data?: {
      id?: string;
      caption?: string;
      permalink?: string;
      media_type?: string;
      media_url?: string;
      thumbnail_url?: string;
    }[];
    paging?: { cursors?: { after?: string }; next?: string };
  };

  const media = (data.data ?? [])
    .filter((m) => m.id)
    .map((m) => ({
      mediaId: m.id as string,
      caption: m.caption ?? "(캡션 없음)",
      permalink: m.permalink ?? null,
      mediaType: m.media_type ?? "IMAGE",
      // VIDEO/REELS는 thumbnail_url, IMAGE/CAROUSEL은 media_url이 썸네일 역할을 한다.
      thumbnailUrl: m.thumbnail_url ?? m.media_url ?? null,
    }));

  return { media, nextPageToken: data.paging?.cursors?.after ?? null };
}

export interface InstagramCommentThread {
  commentId: string;
  authorUsername: string | null;
  text: string;
  publishedAt: string | null;
}

/** 특정 게시물의 최상위 댓글을 가져온다(대댓글에는 답글을 달지 않는다 — 원 댓글에만 응답). */
export async function listRecentInstagramComments(
  accessToken: string,
  mediaId: string,
  maxResults = 20,
): Promise<InstagramCommentThread[]> {
  const params = new URLSearchParams({
    fields: "id,text,username,timestamp",
    limit: String(maxResults),
    access_token: accessToken,
  });

  const response = await fetch(`${GRAPH_BASE}/${mediaId}/comments?${params.toString()}`);
  if (!response.ok) {
    const text = await response.text();
    // 댓글이 꺼져 있거나 미디어가 삭제된 경우 등은 조용히 빈 배열로 처리한다.
    if (response.status === 400 || response.status === 404) return [];
    throw new Error(`댓글 조회에 실패했습니다. (${response.status}) ${text}`);
  }
  const data = (await response.json()) as {
    data?: { id?: string; text?: string; username?: string; timestamp?: string }[];
  };

  return (data.data ?? [])
    .map((c) => ({
      commentId: c.id ?? "",
      authorUsername: c.username ?? null,
      text: c.text ?? "",
      publishedAt: c.timestamp ?? null,
    }))
    .filter((c) => c.commentId && c.text);
}

/** 최상위 댓글에 답글을 게시한다. */
export async function postInstagramCommentReply(
  accessToken: string,
  commentId: string,
  message: string,
): Promise<{ replyId: string }> {
  const params = new URLSearchParams({ message, access_token: accessToken });
  const response = await fetch(`${GRAPH_BASE}/${commentId}/replies?${params.toString()}`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`답글 게시에 실패했습니다. (${response.status}) ${await response.text()}`);
  }
  const data = (await response.json()) as { id?: string };
  if (!data.id) throw new Error("답글 게시 응답에 comment id가 없습니다.");
  return { replyId: data.id };
}
