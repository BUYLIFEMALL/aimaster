import "server-only";

import type { RawChannelResource, RawVideoResource } from "./types";

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

/**
 * YouTube Data API 에러 응답 파싱
 */
/** v1.15: 오류 응답에서 쓰는 칸만 */
interface ApiErrorBody { error?: { message?: string; errors?: { reason?: string }[] } }

function handleApiError(data: unknown, status: number): never {
  const errorObj = (data as ApiErrorBody | null)?.error;
  const reason = errorObj?.errors?.[0]?.reason || "";
  const message = errorObj?.message || "YouTube API 요청 중 오류가 발생했습니다.";

  if (reason === "quotaExceeded") {
    throw new YouTubeApiError(
      "본인 Google Cloud 프로젝트의 YouTube 일일 한도가 소진되었습니다. 검색과 기타 API 한도는 별도로 적용되므로 콘솔에서 확인해주세요. 미국 태평양 자정(한국 서머타임 오후4시·겨울 오후5시)에 초기화됩니다.",
      "QUOTA_EXCEEDED",
      429
    );
  }
  if (reason === "keyInvalid" || reason === "badRequest" && message.includes("API key not valid")) {
    throw new YouTubeApiError(
      "유효하지 않은 YouTube API 키입니다. Google Cloud 콘솔에서 발급받은 키를 다시 확인해주세요.",
      "INVALID_KEY",
      401
    );
  }
  if (reason === "accessNotConfigured") {
    throw new YouTubeApiError(
      "Google Cloud 콘솔에서 'YouTube Data API v3'가 사용 설정(Enable)되지 않은 프로젝트의 키입니다. 콘솔에서 API를 사용 설정해주세요.",
      "API_NOT_ENABLED",
      403
    );
  }

  throw new YouTubeApiError(message, reason || "UNKNOWN", status);
}

/**
 * 공용 엔진(goldenEngine.ts)에 넘기는 YouTube 호출 함수 — 회원 본인 키·이 프로그램의 오류 안내 문구 사용(2026-10-17 v1.17).
 */
export async function youtubeCall(endpoint: string, query: Record<string, string>, apiKey: string): Promise<unknown> {
  const url = new URL(`${YOUTUBE_API_BASE}/${endpoint}`);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  url.searchParams.set("key", apiKey);
  const res = await fetch(url.toString(), { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) handleApiError(data, res.status);
  return data;
}

/**
 * 다수 비디오 상세 정보(조회수, 길이, 통계) 일괄 조회
 */
export async function fetchVideosDetails(
  videoIds: string[],
  apiKey: string
): Promise<Map<string, RawVideoResource>> {
  if (videoIds.length === 0) return new Map();

  const chunkSize = 50;
  const resultMap = new Map<string, RawVideoResource>();

  for (let i = 0; i < videoIds.length; i += chunkSize) {
    const chunk = videoIds.slice(i, i + chunkSize);
    const url = new URL(`${YOUTUBE_API_BASE}/videos`);
    url.searchParams.set("part", "snippet,contentDetails,statistics");
    url.searchParams.set("id", chunk.join(","));
    url.searchParams.set("key", apiKey);

    const res = await fetch(url.toString(), { next: { revalidate: 300 } });
    const data = await res.json();

    if (!res.ok) {
      handleApiError(data, res.status);
    }

    for (const item of data.items || []) {
      resultMap.set(item.id, item);
    }
  }

  return resultMap;
}

/**
 * 다수 채널 상세 정보(구독자수, 총 조회수 등) 일괄 조회
 */
export async function fetchChannelsDetails(
  channelIds: string[],
  apiKey: string
): Promise<Map<string, RawChannelResource>> {
  if (channelIds.length === 0) return new Map();

  const uniqueIds = Array.from(new Set(channelIds));
  const chunkSize = 50;
  const resultMap = new Map<string, RawChannelResource>();

  for (let i = 0; i < uniqueIds.length; i += chunkSize) {
    const chunk = uniqueIds.slice(i, i + chunkSize);
    const url = new URL(`${YOUTUBE_API_BASE}/channels`);
    url.searchParams.set("part", "snippet,statistics");
    url.searchParams.set("id", chunk.join(","));
    url.searchParams.set("key", apiKey);

    const res = await fetch(url.toString(), { next: { revalidate: 600 } });
    const data = await res.json();

    if (!res.ok) {
      handleApiError(data, res.status);
    }

    for (const item of data.items || []) {
      resultMap.set(item.id, item);
    }
  }

  return resultMap;
}

/**
 * YouTube API 키 유효성 검증
 */
export async function verifyYouTubeApiKey(apiKey: string): Promise<boolean> {
  const url = new URL(`${YOUTUBE_API_BASE}/videos`);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("chart", "mostPopular");
  url.searchParams.set("maxResults", "1");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  const data = await res.json();

  if (!res.ok) {
    handleApiError(data, res.status);
  }

  return true;
}
