import "server-only";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

export class YouTubeApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number = 400) {
    super(message);
    this.name = "YouTubeApiError";
    this.code = code;
    this.status = status;
  }
}

/** 이번 요청에서 쓴 YouTube 쿼터(유닛)를 센다. search.list=100, 나머지 목록 조회=1 */
export class QuotaMeter {
  used = 0;
  add(units: number) {
    this.used += units;
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function handleApiError(data: any, status: number): never {
  const errorObj = data?.error;
  const reason = errorObj?.errors?.[0]?.reason || "";
  const message: string = errorObj?.message || "YouTube API 요청 중 오류가 발생했습니다.";

  if (reason === "quotaExceeded") {
    throw new YouTubeApiError(
      "등록하신 YouTube API 키의 일일 사용 한도(10,000 units)가 모두 소진되었습니다. 한도는 매일 한국 시간 오후 4시(미국 태평양시 자정)에 초기화됩니다. 다른 키를 등록해도 됩니다.",
      "QUOTA_EXCEEDED",
      429
    );
  }
  if (reason === "keyInvalid" || (reason === "badRequest" && message.includes("API key not valid"))) {
    throw new YouTubeApiError(
      "유효하지 않은 YouTube API 키입니다. 설정에서 Google Cloud 콘솔에 발급된 키를 다시 확인해주세요.",
      "INVALID_KEY",
      401
    );
  }
  if (reason === "accessNotConfigured") {
    throw new YouTubeApiError(
      "이 키의 Google Cloud 프로젝트에서 'YouTube Data API v3'가 사용 설정되지 않았습니다. 콘솔에서 사용 설정(Enable)해주세요.",
      "API_NOT_ENABLED",
      403
    );
  }
  throw new YouTubeApiError(message, reason || "UNKNOWN", status);
}

async function call(path: string, params: Record<string, string>, apiKey: string, meter: QuotaMeter, units: number) {
  const url = new URL(`${YOUTUBE_API_BASE}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", apiKey);
  // 회원 본인 키로 호출하므로 다른 회원 요청과 캐시가 섞이지 않게 저장하지 않는다.
  const res = await fetch(url.toString(), { cache: "no-store" });
  const data = await res.json();
  meter.add(units);
  if (!res.ok) handleApiError(data, res.status);
  return data;
}

export interface RawChannel {
  id: string;
  snippet: any;
  statistics: any;
  contentDetails?: any;
}

const CHANNEL_PARTS = "snippet,statistics,contentDetails";

/** 채널 ID로 채널 정보 조회 (1유닛) */
export async function fetchChannelById(id: string, apiKey: string, meter: QuotaMeter): Promise<RawChannel | null> {
  const data = await call("channels", { part: CHANNEL_PARTS, id }, apiKey, meter, 1);
  return data.items?.[0] ?? null;
}

/** @핸들로 채널 조회 (1유닛) */
export async function fetchChannelByHandle(handle: string, apiKey: string, meter: QuotaMeter): Promise<RawChannel | null> {
  const forHandle = handle.startsWith("@") ? handle : `@${handle}`;
  const data = await call("channels", { part: CHANNEL_PARTS, forHandle }, apiKey, meter, 1);
  return data.items?.[0] ?? null;
}

/** 이전 방식 사용자명으로 채널 조회 (1유닛) */
export async function fetchChannelByUsername(username: string, apiKey: string, meter: QuotaMeter): Promise<RawChannel | null> {
  const data = await call("channels", { part: CHANNEL_PARTS, forUsername: username }, apiKey, meter, 1);
  return data.items?.[0] ?? null;
}

/** 이름으로 채널 검색 (100유닛). 후보 최대 5개를 돌려준다. */
export async function searchChannels(query: string, apiKey: string, meter: QuotaMeter) {
  const data = await call("search", { part: "snippet", type: "channel", q: query, maxResults: "5" }, apiKey, meter, 100);
  return (data.items ?? [])
    .map((it: any) => ({
      id: it.id?.channelId as string,
      title: it.snippet?.title as string,
      thumbnailUrl: (it.snippet?.thumbnails?.default?.url as string) ?? "",
    }))
    .filter((c: { id: string }) => !!c.id);
}

/** 업로드 재생목록에서 최근 영상 ID를 최신순으로 가져온다 (페이지당 1유닛, 50개) */
export async function fetchRecentUploadIds(playlistId: string, limit: number, apiKey: string, meter: QuotaMeter): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  while (ids.length < limit) {
    const params: Record<string, string> = { part: "contentDetails", playlistId, maxResults: "50" };
    if (pageToken) params.pageToken = pageToken;
    const data = await call("playlistItems", params, apiKey, meter, 1);
    for (const it of data.items ?? []) {
      if (it.contentDetails?.videoId) ids.push(it.contentDetails.videoId);
    }
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return ids.slice(0, limit);
}

/** 영상 상세(조회수·길이·태그) 일괄 조회 (50개당 1유닛) */
export async function fetchVideosDetails(videoIds: string[], apiKey: string, meter: QuotaMeter): Promise<Map<string, any>> {
  const map = new Map<string, any>();
  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50);
    const data = await call("videos", { part: "snippet,contentDetails,statistics", id: chunk.join(",") }, apiKey, meter, 1);
    for (const item of data.items ?? []) map.set(item.id, item);
  }
  return map;
}

/** 채널 상세(구독자 등) 일괄 조회 (50개당 1유닛) */
export async function fetchChannelsDetails(channelIds: string[], apiKey: string, meter: QuotaMeter): Promise<Map<string, any>> {
  const unique = Array.from(new Set(channelIds));
  const map = new Map<string, any>();
  for (let i = 0; i < unique.length; i += 50) {
    const chunk = unique.slice(i, i + 50);
    const data = await call("channels", { part: "snippet,statistics", id: chunk.join(",") }, apiKey, meter, 1);
    for (const item of data.items ?? []) map.set(item.id, item);
  }
  return map;
}

/** 키워드로 영상 검색 (페이지당 100유닛, 50개) */
export async function searchVideos(
  params: { q: string; order: string; regionCode?: string; relevanceLanguage?: string; videoCategoryId?: string; pages: number },
  apiKey: string,
  meter: QuotaMeter
): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < params.pages; page++) {
    const q: Record<string, string> = { part: "snippet", type: "video", q: params.q, order: params.order, maxResults: "50" };
    if (params.regionCode) q.regionCode = params.regionCode;
    if (params.relevanceLanguage) q.relevanceLanguage = params.relevanceLanguage;
    if (params.videoCategoryId) q.videoCategoryId = params.videoCategoryId;
    if (pageToken) q.pageToken = pageToken;
    const data = await call("search", q, apiKey, meter, 100);
    for (const it of data.items ?? []) {
      if (it.id?.videoId) ids.push(it.id.videoId);
    }
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return Array.from(new Set(ids));
}

/** API 키 유효성 검증 (1유닛) */
export async function verifyYouTubeApiKey(apiKey: string): Promise<boolean> {
  await call("videos", { part: "snippet", chart: "mostPopular", maxResults: "1" }, apiKey, new QuotaMeter(), 1);
  return true;
}
