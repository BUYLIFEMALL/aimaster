import "server-only";

import { QuotaMeter, YouTubeDataError, youtubeRequest } from "@/lib/youtube/youtubeData";

export { QuotaMeter };

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

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * YouTube 읽기 호출 1회. 2026-10-17 v1.09: 공용 기준 코드 youtube-data-client(youtubeData.ts)로 위임 —
 * 15초 시간 제한·일시 오류 1회 재시도·키 가리기·한도/분당 제한 구분 안내. 오류는 이 프로그램 형식(YouTubeApiError)으로 바꿔 던진다.
 */
export async function call(path: string, params: Record<string, string>, apiKey: string, meter: QuotaMeter, units: number) {
  try {
    return await youtubeRequest(path, params, apiKey, { meter, units });
  } catch (e) {
    if (e instanceof YouTubeDataError) throw new YouTubeApiError(e.message, e.code, e.status);
    throw e;
  }
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
  params: {
    q: string;
    order: string;
    regionCode?: string;
    relevanceLanguage?: string;
    videoCategoryId?: string;
    publishedAfter?: string;
    videoDuration?: "short" | "medium" | "long";
    pages: number;
  },
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
    if (params.publishedAfter) q.publishedAfter = params.publishedAfter;
    if (params.videoDuration) q.videoDuration = params.videoDuration;
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
