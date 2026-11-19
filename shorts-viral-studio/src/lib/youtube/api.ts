import "server-only";
import { runShortsSearch } from "@/lib/youtube/shortsSearch";
import type { SearchParams, SearchShortsResult } from "@/types/svs";
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

/** 검색 → 영상 상세 → 관련성·언어·종교 거르기 → 채널 상세. 순서·호출 수는 shortsSearch.ts(순수 함수) 참고. (검색 1회 = 약 102유닛) */
export async function searchShorts(params: SearchParams, apiKey: string): Promise<SearchShortsResult> {
  return runShortsSearch(params, (path, query) => ytFetch(path, query, apiKey));
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
