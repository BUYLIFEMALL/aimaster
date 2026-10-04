import "server-only";
import { buildShortVideo } from "@/lib/youtube/metrics";
import type { SearchParams, ShortVideo } from "@/types/svs";

const BASE = "https://www.googleapis.com/youtube/v3";

export class YouTubeApiError extends Error {
  constructor(
    message: string,
    public readonly kind: "quota" | "invalid_key" | "other",
  ) {
    super(message);
  }
}

async function ytFetch<T>(path: string, params: Record<string, string>, apiKey: string): Promise<T> {
  const url = new URL(`${BASE}/${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set("key", apiKey);

  const res = await fetch(url, { cache: "no-store" });
  if (res.ok) return (await res.json()) as T;

  const body = (await res.json().catch(() => ({}))) as {
    error?: { message?: string; errors?: { reason?: string }[] };
  };
  const reason = body.error?.errors?.[0]?.reason ?? "";
  const message = body.error?.message ?? `YouTube API 오류 (${res.status})`;

  if (reason === "quotaExceeded" || reason === "rateLimitExceeded" || reason === "dailyLimitExceeded") {
    throw new YouTubeApiError(
      "YouTube API 일일 할당량을 모두 사용했습니다. 검색은 1회에 100유닛(하루 기본 1만유닛)을 쓰므로, 내일 다시 시도하시거나 구글 클라우드에서 할당량을 확인해 주세요.",
      "quota",
    );
  }
  if (res.status === 400 || res.status === 403) {
    if (reason === "keyInvalid" || reason === "API_KEY_INVALID" || message.toLowerCase().includes("api key")) {
      throw new YouTubeApiError(
        "YouTube API 키가 올바르지 않습니다. 설정 화면에서 키를 다시 확인해 주세요.",
        "invalid_key",
      );
    }
    if (reason === "accessNotConfigured" || reason === "forbidden") {
      throw new YouTubeApiError(
        "이 키에서 YouTube Data API v3가 활성화되어 있지 않습니다. 구글 클라우드 콘솔에서 'YouTube Data API v3'를 사용 설정해 주세요.",
        "invalid_key",
      );
    }
  }
  throw new YouTubeApiError(message, "other");
}

interface SearchResponse {
  items?: { id?: { videoId?: string } }[];
}
interface VideosResponse {
  items?: Parameters<typeof buildShortVideo>[0][];
}
interface ChannelsResponse {
  items?: (Parameters<typeof buildShortVideo>[1] & { id: string })[];
}

/** 검색 → 영상 상세 → 채널 상세 순으로 조회하고 지표를 계산합니다. (검색 1회 = 약 102유닛) */
export async function searchShorts(params: SearchParams, apiKey: string): Promise<ShortVideo[]> {
  const q: Record<string, string> = {
    part: "snippet",
    type: "video",
    q: params.query,
    maxResults: "50",
    order: params.order,
    videoDuration: "short",
    regionCode: "KR",
    relevanceLanguage: "ko",
  };
  if (params.dateFrom) q.publishedAfter = new Date(`${params.dateFrom}T00:00:00Z`).toISOString();
  if (params.dateTo) q.publishedBefore = new Date(`${params.dateTo}T23:59:59Z`).toISOString();

  const search = await ytFetch<SearchResponse>("search", q, apiKey);
  const ids = (search.items ?? []).map((i) => i.id?.videoId).filter((v): v is string => Boolean(v));
  if (ids.length === 0) return [];

  const videos = await ytFetch<VideosResponse>(
    "videos",
    { part: "snippet,statistics,contentDetails", id: ids.join(",") },
    apiKey,
  );
  const items = videos.items ?? [];
  const channelIds = [...new Set(items.map((v) => v.snippet.channelId))];

  const channels = channelIds.length
    ? await ytFetch<ChannelsResponse>(
        "channels",
        { part: "snippet,statistics", id: channelIds.join(",") },
        apiKey,
      )
    : { items: [] };
  const channelMap = new Map((channels.items ?? []).map((c) => [c.id, c]));

  const now = new Date();
  return items.map((v) => buildShortVideo(v, channelMap.get(v.snippet.channelId), now));
}

/** 영상별 상위 댓글 (실패하면 빈 배열 — 댓글이 막힌 영상이 많음) */
export async function fetchTopComments(videoId: string, apiKey: string, max = 20): Promise<string[]> {
  try {
    const data = await ytFetch<{
      items?: { snippet: { topLevelComment: { snippet: { textOriginal: string } } } }[];
    }>(
      "commentThreads",
      { part: "snippet", videoId, maxResults: String(max), order: "relevance", textFormat: "plainText" },
      apiKey,
    );
    return (data.items ?? []).map((i) => i.snippet.topLevelComment.snippet.textOriginal).filter(Boolean);
  } catch {
    return [];
  }
}

/** 영상 설명(분석 근거용) */
export async function fetchDescriptions(ids: string[], apiKey: string): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  try {
    const data = await ytFetch<{ items?: { id: string; snippet: { description?: string } }[] }>(
      "videos",
      { part: "snippet", id: ids.join(",") },
      apiKey,
    );
    return Object.fromEntries((data.items ?? []).map((i) => [i.id, i.snippet.description ?? ""]));
  } catch {
    return {};
  }
}
