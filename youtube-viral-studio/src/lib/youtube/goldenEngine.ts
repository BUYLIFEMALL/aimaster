/**
 * 황금(공략) 채널 찾기 공용 계산 엔진 — 2026-10-17 통합(주인님 승인 ①안).
 *
 * ⚠️ 공용 기준 코드(docs/SHARED_MODULES.md, 모듈 id: youtube-golden-engine).
 *   - 기준(여기만 고친다): youtube-channel-consultant/src/lib/youtube/goldenEngine.ts  (「공략 채널 찾기」)
 *   - 사본(직접 고치지 않는다): youtube-viral-studio/src/lib/youtube/goldenEngine.ts (「황금 채널 발굴」)
 *   기준을 고친 뒤 `node scripts/check-shared-modules.mjs --sync`로 사본에 반영하고, 사본을 쓰는 프로그램도 빌드·배포·버전 +0.01.
 *   기준으로 고른 이유: 조건이 더 많고(기간·길이·국가·검색 깊이), 할당량 계산·구독자 비공개 처리·테스트가 있어 자동화와 결과 품질이 더 낫다.
 * 두 프로그램은 서로를 호출하지 않는다. 각자 회원 본인 YouTube 키로 YouTube에 직접 요청하고,
 * 이 파일은 그 요청 순서와 선별 계산만 담당한다(YouTube 호출 함수는 각 프로그램이 넘겨준다).
 * 프로그램 고유 코드(server-only, 오류 문구, 화면)는 여기에 넣지 않는다.
 */

export type GoldenPeriod = "30d" | "90d" | "365d";
export type GoldenRegion = "all" | "kr" | "global";

export interface GoldenSearchParams {
  keyword: string;
  /** 이 구독자 수 이하 채널만 */
  maxSubscribers: number;
  /** 채널 전체 평균 조회수(총 조회수 ÷ 영상 수)가 이 값 이상인 채널만 */
  minAverageViews: number;
  period: GoldenPeriod;
  /** true 이면 4분 미만의 짧은 영상만 검색 (쇼츠 포함) */
  shortVideosOnly: boolean;
  region: GoldenRegion;
  /** 검색 페이지 수(1페이지 = 영상 50개 = 약 100유닛) */
  pages: 1 | 2;
}

export interface GoldenBestVideo {
  id: string;
  title: string;
  viewCount: number;
  publishedAt: string;
  thumbnailUrl: string;
}

export interface GoldenCandidate {
  id: string;
  title: string;
  handle?: string;
  description?: string;
  thumbnailUrl: string;
  publishedAt: string;
  /** 구독자 비공개이면 null */
  subscriberCount: number | null;
  viewCount: number;
  videoCount: number;
  bestVideo: GoldenBestVideo;
  matchedVideos: number;
}

export interface GoldenChannel {
  id: string;
  title: string;
  handle?: string;
  description?: string;
  thumbnailUrl: string;
  publishedAt: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  /** 채널 전체 누적 조회수 ÷ 영상 수 (최근 영상 평균이 아니다) */
  averageViews: number;
  /** 평균 조회수 ÷ 구독자 수 (구독자 대비 파괴력 배수) */
  powerRatio: number;
  /** 이번 검색에서 잡힌 이 채널의 가장 조회수 높은 영상 */
  bestVideo: GoldenBestVideo;
  /** 이번 검색에서 잡힌 이 채널의 영상 수 */
  matchedVideos: number;
}

export interface GoldenSearchResult {
  keyword: string;
  channels: GoldenChannel[];
  scannedVideos: number;
  scannedChannels: number;
  /** 구독자 수를 비공개한 채널 수(계산 불가라 제외) */
  hiddenSubscriberExcluded: number;
  quotaUsed: number;
  fetchedAt: string;
}

/**
 * YouTube Data API 한 번 호출. 각 프로그램이 자기 오류 처리(한도 소진·잘못된 키 안내)를 담아 넘긴다.
 * @param endpoint "search" | "videos" | "channels"
 * @param units 이 호출이 쓰는 할당량(search 100, videos/channels 1)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- YouTube 응답 원본(필요한 칸만 아래에서 읽음)
export type YouTubeCall = (endpoint: string, query: Record<string, string>, units: number) => Promise<any>;

export const GOLDEN_PERIOD_DAYS: Record<GoldenPeriod, number> = { "30d": 30, "90d": 90, "365d": 365 };
const PERIODS: GoldenPeriod[] = ["30d", "90d", "365d"];
const REGIONS: GoldenRegion[] = ["all", "kr", "global"];

function boundedInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : NaN;
  return Number.isNaN(n) ? fallback : Math.min(max, Math.max(min, n));
}

/** 화면에서 받은 값을 안전한 범위로 맞춘다. 비어 있거나 잘못된 값은 각 프로그램의 기본값을 쓴다. */
export function normalizeGoldenParams(
  body: Record<string, unknown>,
  defaults: Omit<GoldenSearchParams, "keyword">
): GoldenSearchParams | { error: string } {
  const keyword = typeof body.keyword === "string" ? body.keyword.trim() : "";
  if (!keyword || keyword.length > 100) return { error: "검색 키워드를 100자 이내로 입력해주세요." };
  return {
    keyword,
    maxSubscribers: boundedInt(body.maxSubscribers, 100, 10_000_000, defaults.maxSubscribers),
    minAverageViews: boundedInt(body.minAverageViews, 0, 100_000_000, defaults.minAverageViews),
    period: PERIODS.includes(body.period as GoldenPeriod) ? (body.period as GoldenPeriod) : defaults.period,
    shortVideosOnly: typeof body.shortVideosOnly === "boolean" ? body.shortVideosOnly : defaults.shortVideosOnly,
    region: REGIONS.includes(body.region as GoldenRegion) ? (body.region as GoldenRegion) : defaults.region,
    pages: Number(body.pages) === 2 ? 2 : Number(body.pages) === 1 ? 1 : defaults.pages,
  };
}

/**
 * 선별: 구독자가 적은데(상한 이하) 채널 평균 조회수가 높은(하한 이상) 채널을 골라
 * 구독자 대비 파괴력 배수(평균 조회수 ÷ 구독자) 순으로 정렬한다.
 * 구독자 비공개 채널은 배수를 계산할 수 없어 제외하고 개수만 돌려준다(0명으로 보지 않는다).
 */
export function selectGoldenChannels(
  candidates: GoldenCandidate[],
  params: Pick<GoldenSearchParams, "maxSubscribers" | "minAverageViews">,
  limit = 30
): { channels: GoldenChannel[]; hiddenSubscriberExcluded: number } {
  let hiddenSubscriberExcluded = 0;
  const channels: GoldenChannel[] = [];

  for (const c of candidates) {
    if (c.subscriberCount === null) {
      hiddenSubscriberExcluded += 1;
      continue;
    }
    if (c.subscriberCount > params.maxSubscribers || c.videoCount <= 0) continue;
    const averageViews = Math.round(c.viewCount / c.videoCount);
    if (averageViews < params.minAverageViews) continue;
    channels.push({
      id: c.id,
      title: c.title,
      handle: c.handle,
      description: c.description,
      thumbnailUrl: c.thumbnailUrl,
      publishedAt: c.publishedAt,
      subscriberCount: c.subscriberCount,
      viewCount: c.viewCount,
      videoCount: c.videoCount,
      averageViews,
      powerRatio: Math.round((averageViews / Math.max(c.subscriberCount, 1)) * 10) / 10,
      bestVideo: c.bestVideo,
      matchedVideos: c.matchedVideos,
    });
  }

  channels.sort((a, b) => b.powerRatio - a.powerRatio || b.averageViews - a.averageViews);
  return { channels: channels.slice(0, limit), hiddenSubscriberExcluded };
}

/* eslint-disable @typescript-eslint/no-explicit-any -- YouTube 응답 원본에서 필요한 칸만 읽는다 */
function thumbOf(snippet: any): string {
  const t = snippet?.thumbnails;
  return t?.high?.url ?? t?.medium?.url ?? t?.default?.url ?? "";
}

function subscriberOf(stats: any): number | null {
  return stats?.hiddenSubscriberCount === true || stats?.subscriberCount === undefined ? null : Number(stats.subscriberCount);
}

/**
 * 황금 채널 찾기: 키워드로 최근 기간의 인기 영상을 검색해 그 영상을 올린 채널을 모은 뒤 선별한다.
 * 검색에 잡힌 채널만 대상이다(시장 전체가 아니다). 할당량: 검색 페이지당 100 + 영상·채널 상세 50개당 1.
 */
export async function runGoldenSearch(params: GoldenSearchParams, call: YouTubeCall, limit = 30): Promise<GoldenSearchResult> {
  let quotaUsed = 0;
  const yt = async (endpoint: string, query: Record<string, string>, units: number) => {
    const data = await call(endpoint, query, units);
    quotaUsed += units;
    return data;
  };

  // 1. 기간·길이·국가 조건으로 조회수 높은 영상 검색
  const regionQuery: Record<string, string> =
    params.region === "kr"
      ? { regionCode: "KR", relevanceLanguage: "ko" }
      : params.region === "global"
        ? { regionCode: "US", relevanceLanguage: "en" }
        : {};
  const publishedAfter = new Date(Date.now() - GOLDEN_PERIOD_DAYS[params.period] * 86400000).toISOString();
  const ids: string[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < params.pages; page++) {
    const q: Record<string, string> = {
      part: "snippet",
      type: "video",
      q: params.keyword,
      order: "viewCount",
      publishedAfter,
      maxResults: "50",
      ...regionQuery,
    };
    if (params.shortVideosOnly) q.videoDuration = "short";
    if (pageToken) q.pageToken = pageToken;
    const data = await yt("search", q, 100);
    for (const it of data?.items ?? []) if (it.id?.videoId) ids.push(it.id.videoId);
    pageToken = data?.nextPageToken;
    if (!pageToken) break;
  }
  const videoIds = Array.from(new Set(ids));

  // 2. 영상 상세(조회수) → 채널별로 이번 검색에서 가장 많이 본 영상 기억
  const byChannel = new Map<string, { best: any; count: number }>();
  let scannedVideos = 0;
  for (let i = 0; i < videoIds.length; i += 50) {
    const data = await yt("videos", { part: "snippet,statistics", id: videoIds.slice(i, i + 50).join(",") }, 1);
    for (const item of data?.items ?? []) {
      scannedVideos += 1;
      const channelId = item.snippet?.channelId;
      if (!channelId) continue;
      const views = Number(item.statistics?.viewCount ?? 0);
      const cur = byChannel.get(channelId);
      if (!cur) byChannel.set(channelId, { best: item, count: 1 });
      else {
        cur.count += 1;
        if (views > Number(cur.best.statistics?.viewCount ?? 0)) cur.best = item;
      }
    }
  }

  // 3. 채널 상세(구독자·총 조회수·영상 수)
  const channelIds = Array.from(byChannel.keys());
  const channels = new Map<string, any>();
  for (let i = 0; i < channelIds.length; i += 50) {
    const data = await yt("channels", { part: "snippet,statistics", id: channelIds.slice(i, i + 50).join(",") }, 1);
    for (const item of data?.items ?? []) channels.set(item.id, item);
  }

  const candidates: GoldenCandidate[] = [];
  byChannel.forEach(({ best, count }, channelId) => {
    const ch = channels.get(channelId);
    if (!ch) return;
    candidates.push({
      id: channelId,
      title: ch.snippet?.title ?? "",
      handle: ch.snippet?.customUrl,
      description: ch.snippet?.description ?? "",
      thumbnailUrl: thumbOf(ch.snippet),
      publishedAt: ch.snippet?.publishedAt ?? "",
      subscriberCount: subscriberOf(ch.statistics),
      viewCount: Number(ch.statistics?.viewCount ?? 0),
      videoCount: Number(ch.statistics?.videoCount ?? 0),
      bestVideo: {
        id: best.id,
        title: best.snippet?.title ?? "",
        viewCount: Number(best.statistics?.viewCount ?? 0),
        publishedAt: best.snippet?.publishedAt ?? "",
        thumbnailUrl: thumbOf(best.snippet),
      },
      matchedVideos: count,
    });
  });
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const { channels: picked, hiddenSubscriberExcluded } = selectGoldenChannels(candidates, params, limit);
  return {
    keyword: params.keyword,
    channels: picked,
    scannedVideos,
    scannedChannels: candidates.length,
    hiddenSubscriberExcluded,
    quotaUsed,
    fetchedAt: new Date().toISOString(),
  };
}
