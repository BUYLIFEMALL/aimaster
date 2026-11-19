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

/**
 * 검색 조건 아래 안내(2026-11-20 A2): 지금 결과에 바로 적용되는 필터, 검색할 때 빠지는 영상, 다음 검색부터 적용되는 종교 옵션을 구분한다.
 * 「바로 적용·할당량 0」은 영상 길이·최소 조회수·최대 구독자 필터에만 해당한다.
 */
export const SEARCH_HELP_LINES = [
  "검색 1회는 YouTube 할당량 약 100유닛을 사용합니다(기본 하루 1만유닛 ≈ 100회).",
  "영상 길이·최소 조회수·최대 구독자 필터는 지금 결과에 바로 적용되며 할당량을 쓰지 않습니다.",
  "해시태그만 도배한 영상·다른 언어 영상·검색어와 무관한 영상은 검색할 때 자동으로 빠집니다(추가 할당량 없음).",
  "「종교 영상 제외」는 지금 결과에는 적용되지 않고 다음 검색부터 적용됩니다. 검색어가 종교 단어면 종교 영상도 남깁니다.",
] as const;

/** 결과 머리글 요약: 남은 쇼츠가 있을 때만(0개면 본문 안내가 같은 요약을 보여 주므로 중복 표시하지 않음) */
export function headerExcludedSummary(e: SearchExcluded | null | undefined, videoCount: number): string {
  return videoCount > 0 ? describeExcluded(e) : "";
}

/** 「종교 영상 제외」 토글 옆 안내 — 이미 받은 결과를 다시 거르지 않고, 다음 검색 때 적용되며 그 검색이 할당량을 쓴다 */
export const RELIGION_TOGGLE_NOTE = "다음 검색부터 적용 · 다시 검색하면 할당량 약 102유닛 사용";

/**
 * 검색이 끝났는데 남은 쇼츠가 0개일 때 화면에 한 번만 보이는 안내.
 * 종교로 뺀 영상이 있을 때만 토글 조언을 붙인다(0건이면 토글을 꺼도 결과가 같으므로 숨김).
 */
export function emptyResultMessage(e: SearchExcluded | null | undefined): string {
  const ex = describeExcluded(e);
  if (!ex) return "검색 결과가 없습니다. 검색어나 기간을 바꿔 보세요.";
  const tip = e && e.religion > 0
    ? "「종교 영상 제외」를 끄고 다시 검색하면 종교 영상도 볼 수 있습니다(검색 할당량 사용)."
    : "검색어나 기간을 바꿔 보세요.";
  return `조건에 맞는 쇼츠가 없습니다 — ${ex}. ${tip}`;
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
