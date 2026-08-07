import "server-only";

// 이 모듈은 서버 코드에서만 import 해야 한다. Access Token이 브라우저로 전달되지 않도록
// 여기서만 Instagram Graph API(Meta)를 호출한다.
// 전제 조건(플랫폼 자체 제약, 우리가 바꿀 수 없음): 사용자의 인스타그램 계정이
// 비즈니스/크리에이터 계정이어야 하고, Facebook 페이지와 연결되어 있어야 한다.

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const AUTHORIZE_BASE = "https://www.facebook.com/v21.0/dialog/oauth";

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

export function getInstagramAuthorizeUrl(state: string, appId: string): string {
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: getEnv("META_INSTAGRAM_REDIRECT_URI"),
    scope: INSTAGRAM_SCOPES,
    response_type: "code",
    state,
  });
  return `${AUTHORIZE_BASE}?${params.toString()}`;
}

export async function exchangeInstagramCode(code: string, appId: string, appSecret: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: getEnv("META_INSTAGRAM_REDIRECT_URI"),
    code,
  });
  const response = await fetch(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`);
  const data = await parseGraphResponse<{ access_token: string }>(response);
  return data.access_token;
}

/** 60일짜리 장기 토큰으로 교환한다. */
export async function exchangeForLongLivedInstagramToken(
  shortLivedToken: string,
  appId: string,
  appSecret: string,
): Promise<{
  accessToken: string;
  expiresInSeconds: number;
}> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });
  const response = await fetch(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`);
  const data = await parseGraphResponse<{ access_token: string; expires_in: number }>(response);
  return { accessToken: data.access_token, expiresInSeconds: data.expires_in };
}

export interface InstagramBusinessAccount {
  pageId: string;
  igUserId: string;
  igUsername: string;
}

/** 이 Facebook 계정에 연결된 페이지들 중, 인스타그램 비즈니스 계정이 연결된 첫 번째 것을 찾는다. */
export async function findInstagramBusinessAccount(userAccessToken: string): Promise<InstagramBusinessAccount> {
  const pagesRes = await fetch(`${GRAPH_BASE}/me/accounts?access_token=${userAccessToken}`);
  const pages = await parseGraphResponse<{ data: { id: string; access_token: string; name: string }[] }>(pagesRes);

  for (const page of pages.data ?? []) {
    const igRes = await fetch(
      `${GRAPH_BASE}/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`,
    );
    const igData = await parseGraphResponse<{ instagram_business_account?: { id: string } }>(igRes);
    const igUserId = igData.instagram_business_account?.id;
    if (igUserId) {
      const usernameRes = await fetch(`${GRAPH_BASE}/${igUserId}?fields=username&access_token=${page.access_token}`);
      const usernameData = await parseGraphResponse<{ username: string }>(usernameRes);
      return { pageId: page.id, igUserId, igUsername: usernameData.username };
    }
  }

  throw new Error(
    "연결된 Facebook 페이지에서 인스타그램 비즈니스 계정을 찾지 못했습니다. 인스타그램 계정이 비즈니스/크리에이터 계정으로 전환되어 있고 Facebook 페이지와 연결되어 있는지 확인해주세요.",
  );
}

async function createReelContainer(params: {
  accessToken: string;
  igUserId: string;
  videoUrl: string;
  caption: string;
}): Promise<string> {
  const body = new URLSearchParams({
    access_token: params.accessToken,
    media_type: "REELS",
    video_url: params.videoUrl,
    caption: params.caption,
    share_to_feed: "false",
  });
  const response = await fetch(`${GRAPH_BASE}/${params.igUserId}/media`, { method: "POST", body });
  const data = await parseGraphResponse<{ id: string }>(response);
  return data.id;
}

async function waitForContainerReady(params: { accessToken: string; creationId: string }): Promise<void> {
  const maxAttempts = 30; // 최대 5분 (10초 간격)
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(
      `${GRAPH_BASE}/${params.creationId}?fields=status_code&access_token=${params.accessToken}`,
    );
    const data = await parseGraphResponse<{ status_code: string }>(response);
    if (data.status_code === "FINISHED") return;
    if (data.status_code === "ERROR") throw new Error("인스타그램 릴스 처리 중 오류가 발생했습니다.");
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
  throw new Error("인스타그램 릴스 처리 시간이 초과되었습니다.");
}

async function publishReelContainer(params: {
  accessToken: string;
  igUserId: string;
  creationId: string;
}): Promise<string> {
  const body = new URLSearchParams({ access_token: params.accessToken, creation_id: params.creationId });
  const response = await fetch(`${GRAPH_BASE}/${params.igUserId}/media_publish`, { method: "POST", body });
  const data = await parseGraphResponse<{ id: string }>(response);
  return data.id;
}

async function getInstagramPermalink(params: { accessToken: string; mediaId: string }): Promise<string> {
  const response = await fetch(`${GRAPH_BASE}/${params.mediaId}?fields=permalink&access_token=${params.accessToken}`);
  const data = await parseGraphResponse<{ permalink: string }>(response);
  return data.permalink;
}

export interface PublishReelInput {
  accessToken: string;
  igUserId: string;
  videoUrl: string;
  caption: string;
}

export interface PublishReelResult {
  mediaId: string;
  permalink: string;
}

/** 컨테이너 생성 -> 처리 완료 대기(폴링) -> 게시 -> permalink 조회 순서로 릴스를 올린다. */
export async function publishInstagramReel(input: PublishReelInput): Promise<PublishReelResult> {
  const creationId = await createReelContainer({
    accessToken: input.accessToken,
    igUserId: input.igUserId,
    videoUrl: input.videoUrl,
    caption: input.caption,
  });

  await waitForContainerReady({ accessToken: input.accessToken, creationId });

  const mediaId = await publishReelContainer({
    accessToken: input.accessToken,
    igUserId: input.igUserId,
    creationId,
  });

  const permalink = await getInstagramPermalink({ accessToken: input.accessToken, mediaId });

  return { mediaId, permalink };
}
