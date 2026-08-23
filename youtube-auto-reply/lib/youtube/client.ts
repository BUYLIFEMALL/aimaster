import "server-only";

// 이 모듈은 서버 코드에서만 import 해야 한다. Access/Refresh Token이 브라우저로
// 전달되지 않도록 여기서만 YouTube/Google API를 호출한다. (shots/src/lib/youtube/client.ts와
// 동일한 원칙 — 유튜브 OAuth 자체는 shots의 패턴을 그대로 따르되, 이 프로젝트는 댓글
// 답글(comments.insert)에 필요한 youtube.force-ssl 스코프를 쓰므로 토큰을 공유하지 않는다.)

const AUTHORIZE_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";

// force-ssl 하나로 채널 조회/댓글 읽기/댓글 답글 작성까지 전부 커버된다(구글 문서 기준
// "Manage your YouTube account"). upload/readonly와 마찬가지로 민감 범위(sensitive scope)라
// 앱이 구글 검증을 통과하기 전엔 사용자가 각자 자신의 Google Cloud OAuth Client ID/Secret을
// 등록해야 하고, refresh_token도 테스트 상태에선 7일 후 만료된다(shots와 동일 제약).
const YOUTUBE_SCOPES = "https://www.googleapis.com/auth/youtube.force-ssl";

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`환경변수 ${name}가 설정되지 않았습니다.`);
  return value;
}

export function getYoutubeAuthorizeUrl(state: string, clientId: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getEnv("GOOGLE_YOUTUBE_REDIRECT_URI"),
    response_type: "code",
    scope: YOUTUBE_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${AUTHORIZE_BASE}?${params.toString()}`;
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export async function exchangeYoutubeCode(
  code: string,
  clientId: string,
  clientSecret: string,
): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: getEnv("GOOGLE_YOUTUBE_REDIRECT_URI"),
    grant_type: "authorization_code",
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!response.ok) {
    throw new Error(`YouTube 토큰 교환에 실패했습니다. (${response.status}) ${await response.text()}`);
  }
  return response.json();
}

export async function refreshYoutubeAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`YOUTUBE_TOKEN_EXPIRED: ${response.status} ${errorBody}`);
  }
  return response.json();
}

export interface YoutubeChannelInfo {
  channelId: string;
  channelTitle: string;
  uploadsPlaylistId: string;
}

export async function getYoutubeChannelInfo(accessToken: string): Promise<YoutubeChannelInfo> {
  const response = await fetch(`${YOUTUBE_API}/channels?part=snippet,contentDetails&mine=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`채널 정보 조회에 실패했습니다. (${response.status}) ${await response.text()}`);
  }
  const data = (await response.json()) as {
    items?: {
      id?: string;
      snippet?: { title?: string };
      contentDetails?: { relatedPlaylists?: { uploads?: string } };
    }[];
  };
  const channel = data.items?.[0];
  const uploadsPlaylistId = channel?.contentDetails?.relatedPlaylists?.uploads;
  if (!channel?.id || !uploadsPlaylistId) throw new Error("연결된 유튜브 채널을 찾지 못했습니다.");
  return { channelId: channel.id, channelTitle: channel.snippet?.title ?? "", uploadsPlaylistId };
}

export interface YoutubeVideoSummary {
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
}

/** 채널의 업로드 재생목록에서 영상 목록을 가져온다(최신순, 최대 50개씩 페이지네이션). */
export async function listUploadedVideos(
  accessToken: string,
  uploadsPlaylistId: string,
  quotaUser: string,
  pageToken?: string,
): Promise<{ videos: YoutubeVideoSummary[]; nextPageToken: string | null }> {
  const params = new URLSearchParams({
    part: "snippet",
    playlistId: uploadsPlaylistId,
    maxResults: "50",
    quotaUser,
  });
  if (pageToken) params.set("pageToken", pageToken);

  const response = await fetch(`${YOUTUBE_API}/playlistItems?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`영상 목록 조회에 실패했습니다. (${response.status}) ${await response.text()}`);
  }
  const data = (await response.json()) as {
    items?: {
      snippet?: {
        title?: string;
        resourceId?: { videoId?: string };
        thumbnails?: { medium?: { url?: string }; default?: { url?: string } };
      };
    }[];
    nextPageToken?: string;
  };

  const videos = (data.items ?? [])
    .map((item) => ({
      videoId: item.snippet?.resourceId?.videoId ?? "",
      title: item.snippet?.title ?? "(제목 없음)",
      thumbnailUrl: item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url ?? null,
    }))
    .filter((v) => v.videoId);

  return { videos, nextPageToken: data.nextPageToken ?? null };
}

export interface YoutubeCommentThread {
  topLevelCommentId: string;
  authorDisplayName: string | null;
  textOriginal: string;
}

/** 특정 영상의 최상위 댓글을 최신순으로 가져온다(대댓글에는 답글을 달지 않는다 — 원 댓글에만 응답). */
export async function listRecentCommentThreads(
  accessToken: string,
  videoId: string,
  quotaUser: string,
  maxResults = 20,
): Promise<YoutubeCommentThread[]> {
  const params = new URLSearchParams({
    part: "snippet",
    videoId,
    order: "time",
    maxResults: String(maxResults),
    textFormat: "plainText",
    quotaUser,
  });

  const response = await fetch(`${YOUTUBE_API}/commentThreads?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    // 댓글이 아예 꺼져 있는 영상이면 403(commentsDisabled)이 나므로, 이 경우는 에러 없이 빈 배열로 처리한다.
    const text = await response.text();
    if (response.status === 403 && text.includes("commentsDisabled")) return [];
    throw new Error(`댓글 조회에 실패했습니다. (${response.status}) ${text}`);
  }
  const data = (await response.json()) as {
    items?: {
      id?: string;
      snippet?: {
        topLevelComment?: {
          snippet?: { authorDisplayName?: string; textOriginal?: string };
        };
      };
    }[];
  };

  return (data.items ?? [])
    .map((item) => ({
      topLevelCommentId: item.id ?? "",
      authorDisplayName: item.snippet?.topLevelComment?.snippet?.authorDisplayName ?? null,
      textOriginal: item.snippet?.topLevelComment?.snippet?.textOriginal ?? "",
    }))
    .filter((c) => c.topLevelCommentId && c.textOriginal);
}

/** 최상위 댓글에 답글(대댓글)을 게시한다. */
export async function postCommentReply(
  accessToken: string,
  parentCommentId: string,
  text: string,
  quotaUser: string,
): Promise<{ replyId: string }> {
  const params = new URLSearchParams({ part: "snippet", quotaUser });
  const response = await fetch(`${YOUTUBE_API}/comments?${params.toString()}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      snippet: { parentId: parentCommentId, textOriginal: text },
    }),
  });
  if (!response.ok) {
    throw new Error(`답글 게시에 실패했습니다. (${response.status}) ${await response.text()}`);
  }
  const data = (await response.json()) as { id?: string };
  if (!data.id) throw new Error("답글 게시 응답에 comment id가 없습니다.");
  return { replyId: data.id };
}
