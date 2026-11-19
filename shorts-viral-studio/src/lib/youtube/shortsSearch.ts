// 2026-11-20 MOV-SVS-RELEVANCE-FILTER-INTEGRATION: 쇼츠 검색 순서(검색 → 영상 상세 → 거르기 → 채널 상세)를 네트워크 없는 순수 함수로.
// YouTube 호출은 바깥에서 넣어 주는 call(api.ts의 ytFetch)로만 한다 → 시험에서 가짜 호출로 호출 수·거르기를 확인할 수 있다.
// 거르기는 공용 기준 코드 youtube-relevance-filter(./relevanceFilter.ts — 사본, 직접 고치지 말 것) 그대로.
// 호출 수는 거르기 전과 같다: search 1 · videos 1 · channels 1(남은 영상이 없으면 channels 0).
import { buildShortVideo } from "./metrics";
import { isReligious, isReligiousQuery, relevanceIssue } from "./relevanceFilter";
import type { SearchExcluded, SearchParams, SearchShortsResult } from "@/types/svs";

export type YtCall = (path: string, params: Record<string, string>) => Promise<unknown>;

type RawVideo = Parameters<typeof buildShortVideo>[0];
type RawChannel = NonNullable<Parameters<typeof buildShortVideo>[1]> & { id: string };
/** videos.list part=snippet에 실제로 오는 거르기용 칸(RawVideo에는 없어 여기서 덧붙임) */
type VideoItem = RawVideo & {
  snippet: RawVideo["snippet"] & { description?: string; tags?: string[]; defaultAudioLanguage?: string; defaultLanguage?: string };
};

/** 검색 언어 — search.list relevanceLanguage와 같은 값 */
export const RELEVANCE_LANGUAGE = "ko";

export const emptyExcluded = (): SearchExcluded => ({ spam: 0, language: 0, offtopic: 0, religion: 0 });

export const excludedTotal = (e: SearchExcluded) => e.spam + e.language + e.offtopic + e.religion;

/** 화면용 한 줄: "제외 5건(해시태그 도배 2 · 다른 언어 1 · 검색어와 무관 1 · 종교 1)". 0건이면 빈 문자열 */
export function describeExcluded(e: SearchExcluded | null | undefined): string {
  if (!e) return "";
  const total = excludedTotal(e);
  if (total === 0) return "";
  const parts = ([["해시태그 도배", e.spam], ["다른 언어", e.language], ["검색어와 무관", e.offtopic], ["종교", e.religion]] as const)
    .filter(([, n]) => n > 0)
    .map(([label, n]) => `${label} ${n}`);
  return `제외 ${total}건(${parts.join(" · ")})`;
}

/** 받은 영상 상세 목록을 거른다. 종교 영상은 includeReligion이 아니고 검색어가 종교 단어도 아닐 때만 뺀다. */
export function filterShortsItems<T extends VideoItem>(items: T[], query: string, includeReligion = false): { kept: T[]; excluded: SearchExcluded } {
  const excluded = emptyExcluded();
  const dropReligion = !includeReligion && !isReligiousQuery(query);
  const kept: T[] = [];
  for (const v of items) {
    const s = v.snippet;
    const input = {
      title: s.title,
      channelTitle: s.channelTitle,
      description: s.description ?? "",
      tags: s.tags ?? [],
      defaultAudioLanguage: s.defaultAudioLanguage ?? "",
      defaultLanguage: s.defaultLanguage ?? "",
    };
    const reason = relevanceIssue(input, query, RELEVANCE_LANGUAGE) || (dropReligion && isReligious(input) ? "religion" : null);
    if (reason) excluded[reason] += 1;
    else kept.push(v);
  }
  return { kept, excluded };
}

/** 검색 → 영상 상세 → 거르기 → 채널 상세 → 지표 계산. (검색 1회 = 약 102유닛, 거르기는 할당량 0) */
export async function runShortsSearch(params: SearchParams, call: YtCall, now = new Date()): Promise<SearchShortsResult> {
  const q: Record<string, string> = {
    part: "snippet",
    type: "video",
    q: params.query,
    maxResults: "50",
    order: params.order,
    videoDuration: "short",
    regionCode: "KR",
    relevanceLanguage: RELEVANCE_LANGUAGE,
  };
  if (params.dateFrom) q.publishedAfter = new Date(`${params.dateFrom}T00:00:00Z`).toISOString();
  if (params.dateTo) q.publishedBefore = new Date(`${params.dateTo}T23:59:59Z`).toISOString();

  const search = (await call("search", q)) as { items?: { id?: { videoId?: string } }[] };
  const ids = (search.items ?? []).map((i) => i.id?.videoId).filter((v): v is string => Boolean(v));
  if (ids.length === 0) return { videos: [], excluded: emptyExcluded() };

  const videos = (await call("videos", { part: "snippet,statistics,contentDetails", id: ids.join(",") })) as { items?: VideoItem[] };
  const { kept, excluded } = filterShortsItems(videos.items ?? [], params.query, params.includeReligion === true);
  const channelIds = [...new Set(kept.map((v) => v.snippet.channelId))];

  const channels = channelIds.length
    ? ((await call("channels", { part: "snippet,statistics", id: channelIds.join(",") })) as { items?: RawChannel[] })
    : { items: [] as RawChannel[] };
  const channelMap = new Map((channels.items ?? []).map((c) => [c.id, c]));

  return { videos: kept.map((v) => buildShortVideo(v, channelMap.get(v.snippet.channelId), now)), excluded };
}
