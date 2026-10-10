import "server-only";
import {
  calculateViralScore,
  calculateVPH,
  calculateVsRatio,
  isShortsVideo,
  parseDuration,
} from "./metrics";
import type { YouTubeVideoItem, YouTubeChannelItem } from "./types";

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
function handleApiError(data: any, status: number): never {
  const errorObj = data?.error;
  const reason = errorObj?.errors?.[0]?.reason || "";
  const message = errorObj?.message || "YouTube API 요청 중 오류가 발생했습니다.";

  if (reason === "quotaExceeded") {
    throw new YouTubeApiError(
      "등록하신 YouTube API 키의 일일 사용 한도(10,000 units)가 모두 소진되었습니다. 내일 오후 4시(PST 기준 자정)에 초기화되거나 새 키를 등록해주세요.",
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
 * 다수 비디오 상세 정보(조회수, 길이, 통계) 일괄 조회
 */
export async function fetchVideosDetails(
  videoIds: string[],
  apiKey: string
): Promise<Map<string, any>> {
  if (videoIds.length === 0) return new Map();

  const chunkSize = 50;
  const resultMap = new Map<string, any>();

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
): Promise<Map<string, any>> {
  if (channelIds.length === 0) return new Map();

  const uniqueIds = Array.from(new Set(channelIds));
  const chunkSize = 50;
  const resultMap = new Map<string, any>();

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
