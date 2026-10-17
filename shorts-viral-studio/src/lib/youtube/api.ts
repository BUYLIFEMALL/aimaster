import "server-only";
import { buildShortVideo } from "@/lib/youtube/metrics";
import type { SearchParams, ShortVideo } from "@/types/svs";
import { YouTubeDataError, youtubeRequest } from "@/lib/youtube/youtubeData";

export class YouTubeApiError extends Error {
  constructor(
    message: string,
    public readonly kind: "quota" | "invalid_key" | "other",
  ) {
    super(message);
  }
}

/**
 * 2026-10-17 v1.10: YouTube 읽기 호출은 공용 기준 코드 youtube-data-client(youtubeData.ts — 기준은 youtube-channel-consultant)로 위임한다.
 * 15초 시간 제한·일시 오류 1회 재시도·키 가리기·한도/분당 제한·키 사용 제한 구분 안내. 오류는 이 프로그램 형식(kind)으로 바꿔 던진다.
 */
async function ytFetch<T>(path: string, params: Record<string, string>, apiKey: string): Promise<T> {
  try {
    return (await youtubeRequest(path, params, apiKey)) as T;
  } catch (e) {
    if (e instanceof YouTubeDataError) {
      const kind = e.keyProblem ? "invalid_key" : e.code === "QUOTA_EXCEEDED" || e.code === "RATE_LIMITED" ? "quota" : "other";
      throw new YouTubeApiError(e.message, kind);
    }
    throw e;
  }
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
