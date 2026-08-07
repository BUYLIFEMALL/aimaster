import "server-only";

// 이 모듈은 서버 코드에서만 import 해야 한다. Access/Refresh Token이 브라우저로
// 전달되지 않도록 여기서만 YouTube/Google API를 호출한다.

const AUTHORIZE_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";
const YOUTUBE_UPLOAD_API = "https://www.googleapis.com/upload/youtube/v3/videos";

// youtube.upload는 Google이 "민감 범위"로 분류해서, 앱이 검증(Verification)을 통과하기
// 전까지는 테스트 사용자로 등록된 계정만 연결할 수 있고, refresh_token도 7일 후 만료된다.
const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
].join(" ");

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
    // prompt=consent: 재연결 시에도 매번 refresh_token을 다시 발급받기 위해 강제한다.
    // (기본값은 최초 동의 때만 refresh_token을 주기 때문에, 이게 없으면 재연결해도
    // refresh_token을 못 받아 결국 다시 만료 문제를 겪게 된다.)
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

/** access_token이 만료됐으면 refresh_token으로 새로 발급받는다. */
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
    // refresh_token 자체가 무효화된 경우(재연결 필요)를 구분할 수 있도록 별도 표시.
    throw new Error(`YOUTUBE_TOKEN_EXPIRED: ${response.status} ${errorBody}`);
  }
  return response.json();
}

export interface YoutubeChannelInfo {
  channelId: string;
  channelTitle: string;
}

export async function getYoutubeChannelInfo(accessToken: string): Promise<YoutubeChannelInfo> {
  const response = await fetch(`${YOUTUBE_API}/channels?part=snippet&mine=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`채널 정보 조회에 실패했습니다. (${response.status}) ${await response.text()}`);
  }
  const data = (await response.json()) as {
    items?: { id?: string; snippet?: { title?: string } }[];
  };
  const channel = data.items?.[0];
  if (!channel?.id) throw new Error("연결된 유튜브 채널을 찾지 못했습니다.");
  return { channelId: channel.id, channelTitle: channel.snippet?.title ?? "" };
}

export interface UploadYoutubeVideoInput {
  accessToken: string;
  videoBuffer: Buffer;
  title: string;
  description: string;
  categoryId: string;
  privacyStatus?: "public" | "unlisted" | "private";
}

export interface UploadYoutubeVideoResult {
  videoId: string;
  videoUrl: string;
}

/** multipart 업로드로 영상을 유튜브에 올린다 (쇼츠 길이라 리줌 업로드 없이 한 번에 처리). */
export async function uploadYoutubeVideo(input: UploadYoutubeVideoInput): Promise<UploadYoutubeVideoResult> {
  const metadata = {
    snippet: {
      title: input.title,
      description: input.description,
      categoryId: input.categoryId,
    },
    status: {
      privacyStatus: input.privacyStatus ?? "public",
      selfDeclaredMadeForKids: false,
    },
  };

  const boundary = `shots_${crypto.randomUUID()}`;
  const parts: (string | Buffer)[] = [
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\nContent-Type: video/mp4\r\n\r\n`,
    input.videoBuffer,
    `\r\n--${boundary}--`,
  ];
  const body = Buffer.concat(parts.map((p) => (Buffer.isBuffer(p) ? p : Buffer.from(p, "utf-8"))));

  const response = await fetch(`${YOUTUBE_UPLOAD_API}?uploadType=multipart&part=snippet,status`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`유튜브 업로드에 실패했습니다. (${response.status}) ${await response.text()}`);
  }
  const data = (await response.json()) as { id?: string };
  if (!data.id) throw new Error("유튜브 업로드 응답에 video id가 없습니다.");

  return { videoId: data.id, videoUrl: `https://www.youtube.com/shorts/${data.id}` };
}
