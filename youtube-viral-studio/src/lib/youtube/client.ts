import "server-only";

import type { RawChannelResource, RawVideoResource } from "./types";
import { YouTubeDataError, fetchChannelsByIds, fetchVideosByIds, youtubeRequest, type YouTubeRequestOptions } from "./youtubeData";

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

/**
 * 2026-10-17 v1.18: YouTube 읽기 호출은 공용 기준 코드 youtube-data-client(youtubeData.ts — 기준은 youtube-channel-consultant)로 위임한다.
 * 15초 시간 제한·일시 오류 1회 재시도·키 가리기·한도/분당 제한 구분 안내. 오류는 이 프로그램 형식(YouTubeApiError)으로 바꿔 던진다.
 */
async function withAppError<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (e) {
    if (e instanceof YouTubeDataError) throw new YouTubeApiError(e.message, e.code, e.status);
    throw e;
  }
}

/** 읽기 호출 1회(이 프로그램 오류 형식). revalidateSeconds를 주면 그 시간 동안 같은 요청을 재사용해 회원 할당량을 아낀다. */
export async function youtubeGet(endpoint: string, query: Record<string, string>, apiKey: string, options: YouTubeRequestOptions = {}): Promise<unknown> {
  return withAppError(() => youtubeRequest(endpoint, query, apiKey, options));
}

/**
 * 공용 엔진(goldenEngine.ts)에 넘기는 YouTube 호출 함수 — 회원 본인 키·이 프로그램의 오류 안내 문구 사용(2026-10-17 v1.17).
 */
export async function youtubeCall(endpoint: string, query: Record<string, string>, apiKey: string): Promise<unknown> {
  return youtubeGet(endpoint, query, apiKey);
}

/**
 * 다수 비디오 상세 정보(조회수, 길이, 통계) 일괄 조회 — 50개당 1유닛, 5분 재사용
 */
export async function fetchVideosDetails(
  videoIds: string[],
  apiKey: string
): Promise<Map<string, RawVideoResource>> {
  if (videoIds.length === 0) return new Map();
  return withAppError(() => fetchVideosByIds(videoIds, apiKey, "snippet,contentDetails,statistics", { revalidateSeconds: 300 }));
}

/**
 * 다수 채널 상세 정보(구독자수, 총 조회수 등) 일괄 조회 — 50개당 1유닛, 10분 재사용
 */
export async function fetchChannelsDetails(
  channelIds: string[],
  apiKey: string
): Promise<Map<string, RawChannelResource>> {
  if (channelIds.length === 0) return new Map();
  return withAppError(() => fetchChannelsByIds(channelIds, apiKey, "snippet,statistics", { revalidateSeconds: 600 }));
}

/**
 * YouTube API 키 유효성 검증 (1유닛)
 */
export async function verifyYouTubeApiKey(apiKey: string): Promise<boolean> {
  await youtubeGet("videos", { part: "snippet", chart: "mostPopular", maxResults: "1" }, apiKey);
  return true;
}
