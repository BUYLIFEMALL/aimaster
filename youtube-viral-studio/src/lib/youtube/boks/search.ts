import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { QuotaMeter, YouTubeDataError, youtubeRequest } from "@/lib/youtube/youtubeData";
import {
  BASELINE_FETCH_PER_CHANNEL,
  BASELINE_FLOOR,
  SHORTS_MAX_SEC,
  buildFinderVideo,
  calculatePublishedRange,
  computeChannelBaseline,
  decodeEntities,
  isReligious,
  isReligiousQuery,
  mapVideoItem,
  parseIsoDuration,
  relevanceIssue,
  round1,
  toInt,
  type ExcludeReason,
  type FinderFormat,
  type FinderVideo,
  type RawFinderVideo,
  type UploadRow,
} from "./core";
import { SEARCH_LIMIT, UNIT_LIMIT, nextResetMs, quotaDay, type UsageSnapshot } from "./quota";

/**
 * 떡상 시장 탐색 — 서버 쪽 YouTube 호출(검색·인기 차트·채널 평소 조회수).
 *
 * 출처: boks-youtube-finder (https://github.com/boksajang/boks-youtube-finder, 커밋 3aacecf) services/youtube.js —
 *       searchYouTube, fetchPopularChart, buildVideos, fetchChannelUploads, fetchVideoDetails, fetchChannelDetails
 *       MIT License © 2026 복사장 (Boksajang) — 전문은 youtube-viral-studio/NOTICE.md
 * 이식(2026-11-16 영상 담당)에서 바꾼 점:
 *   - HTTP는 원본 apiGet 대신 AIMaster 공용 기준 코드 youtubeData.ts(시간 제한·재시도·키 가리기·한국어 오류)를 거친다.
 *   - 사용량은 PC 파일 대신 회원별 DB 표 yvs_youtube_usage, 채널 업로드 통계 캐시는 yvs_channel_uploads_cache(24시간).
 *     표가 없거나 읽지 못하면 캐시·미리 막기만 건너뛰고 검색은 계속한다.
 *   - 업로드 재생목록 ID는 채널 ID에서 바로 만든다(UC… → UU…, 채널 조회 part는 statistics만).
 */

const BASELINE_CONCURRENCY = 8;
const CHANNEL_CACHE_TTL_MS = 24 * 3600 * 1000;
const CHART_PAGES = 2; // 최대 100개

// 보충 검색 기준: 버킷별 분석 대상이 이 수보다 적으면 다음 단계 검색을 더 한다
const TOPUP_TARGET: Record<FinderFormat, number> = { all: 20, long: 25, shorts: 40 };
// 형식별 search.list 버킷(검색 1회 = 100유닛)
const SEARCH_PLAN: Record<FinderFormat, string[]> = {
  all: ["short", "medium", "long"],
  long: ["medium", "long"],
  shorts: ["short"],
};

export class FinderError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(message: string, code: string, status = 400) {
    super(message);
    this.name = "FinderError";
    this.code = code;
    this.status = status;
  }
}

export interface ExcludedItem { id: string; reason: ExcludeReason; title: string; channelTitle: string; viewCount: number }
export interface BaselineStats { channels: number; cached: number; fetched: number; failed: number; quotaHit: boolean; channelFailed?: boolean }
export interface FinderResult {
  videos: FinderVideo[];
  excluded: Record<ExcludeReason, number>;
  excludedItems: ExcludedItem[];
  baseline: BaselineStats;
  format: FinderFormat;
  searchCalls: number;
  searchInfo: { calls: number; order: string; topupStopped: boolean; source: "search" | "chart"; chartPages?: number };
  unitsUsed: number;
}

const emptyExcluded = (): Record<ExcludeReason, number> => ({ live: 0, format: 0, spam: 0, language: 0, offtopic: 0, religion: 0 });
const emptyBaselineStats = (): BaselineStats => ({ channels: 0, cached: 0, fetched: 0, failed: 0, quotaHit: false });

/** 회원 1명·이번 요청 1건의 호출 문맥: 키·쿼터 계량·사용량·캐시 */
export class FinderContext {
  readonly meter = new QuotaMeter();
  searchCalls = 0;
  otherUnits = 0;
  readonly userId: string;
  readonly apiKey: string;
  readonly keyHash: string;
  constructor(userId: string, apiKey: string) {
    this.userId = userId;
    this.apiKey = apiKey;
    this.keyHash = createHash("sha256").update(apiKey.trim()).digest("hex").slice(0, 16);
  }

  /** YouTube 읽기 호출 1회 — 공용 기준 코드로 보내고 사용량을 센다(실패한 호출도 할당량을 쓴다) */
  async get(endpoint: string, query: Record<string, string>) {
    if (endpoint === "search") this.searchCalls++;
    else this.otherUnits++;
    try {
      return await youtubeRequest(endpoint, query, this.apiKey, { meter: this.meter });
    } catch (e) {
      if (e instanceof YouTubeDataError && (e.reason === "videoChartNotFound" || /chart.*not.*found/i.test(e.message))) {
        throw new FinderError("이 국가에서는 선택한 주제의 인기 차트를 제공하지 않습니다. 다른 주제를 고르거나 키워드로 검색해 주세요.", "CHART_NOT_FOUND", 404);
      }
      throw e;
    }
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < array.length; i += size) out.push(array.slice(i, i + size));
  return out;
}

const errCode = (e: unknown) => (e as { code?: string })?.code ?? "";
const errStatus = (e: unknown) => (e as { status?: number })?.status ?? 0;

// --- 사용량(DB) ---

/** 오늘 사용량. 표가 없거나 읽지 못하면 0으로 본다(미리 막기만 꺼짐). */
export async function loadUsage(userId: string, keyHash: string, now: Date = new Date()): Promise<UsageSnapshot & { tracked: boolean }> {
  const day = quotaDay(now);
  const base = { day, search: 0, searchLimit: SEARCH_LIMIT, units: 0, unitLimit: UNIT_LIMIT, resetAt: nextResetMs(now) };
  try {
    const { data, error } = await createAdminClient()
      .from("yvs_youtube_usage")
      .select("search_calls, units")
      .eq("user_id", userId)
      .eq("key_hash", keyHash)
      .eq("quota_day", day)
      .maybeSingle();
    if (error) return { ...base, tracked: false };
    return { ...base, search: data?.search_calls ?? 0, units: data?.units ?? 0, tracked: true };
  } catch {
    return { ...base, tracked: false };
  }
}

/** 이번 요청에서 쓴 사용량을 더한다(실패해도 검색 결과는 그대로 돌려준다). */
export async function recordUsage(ctx: FinderContext, now: Date = new Date()): Promise<void> {
  if (ctx.searchCalls === 0 && ctx.otherUnits === 0) return;
  try {
    await createAdminClient().rpc("yvs_add_youtube_usage", {
      p_user: ctx.userId, p_key: ctx.keyHash, p_day: quotaDay(now), p_search: ctx.searchCalls, p_units: ctx.otherUnits,
    });
  } catch {
    /* 표가 아직 없으면 기록만 건너뜀 */
  }
}

// --- 채널 업로드 통계 캐시(DB, 회원별) ---

async function cacheGet(userId: string, channelIds: string[]): Promise<Map<string, { t: number; u: UploadRow[] }>> {
  const map = new Map<string, { t: number; u: UploadRow[] }>();
  if (!channelIds.length) return map;
  try {
    const since = new Date(Date.now() - CHANNEL_CACHE_TTL_MS).toISOString();
    const { data, error } = await createAdminClient()
      .from("yvs_channel_uploads_cache")
      .select("channel_id, fetched_at, uploads")
      .eq("user_id", userId)
      .in("channel_id", channelIds)
      .gt("fetched_at", since);
    if (error) return map;
    for (const r of data ?? []) {
      const u = Array.isArray(r.uploads) ? (r.uploads as UploadRow[]) : null;
      const t = Date.parse(r.fetched_at);
      if (u && Number.isFinite(t)) map.set(r.channel_id, { t, u });
    }
  } catch {
    /* 표가 없으면 캐시 없이 */
  }
  return map;
}

async function cacheSet(userId: string, rows: { channelId: string; uploads: UploadRow[] }[]): Promise<void> {
  if (!rows.length) return;
  try {
    const at = new Date().toISOString();
    await createAdminClient()
      .from("yvs_channel_uploads_cache")
      .upsert(rows.map((r) => ({ user_id: userId, channel_id: r.channelId, fetched_at: at, uploads: r.uploads })), { onConflict: "user_id,channel_id" });
  } catch {
    /* 표가 없으면 저장 건너뜀 */
  }
}

// --- YouTube 호출 ---

async function fetchVideoDetails(videoIds: string[], ctx: FinderContext): Promise<Record<string, RawFinderVideo>> {
  const result: Record<string, RawFinderVideo> = {};
  for (const chunk of chunkArray(videoIds, 50)) {
    const data = await ctx.get("videos", { part: "snippet,contentDetails,statistics", id: chunk.join(",") });
    for (const v of data.items || []) result[v.id] = mapVideoItem(v);
  }
  return result;
}

async function fetchChannelDetails(channelIds: string[], ctx: FinderContext): Promise<Record<string, { subscriberCount: number | null; uploadsPlaylistId: string }>> {
  const result: Record<string, { subscriberCount: number | null; uploadsPlaylistId: string }> = {};
  for (const chunk of chunkArray(channelIds, 50)) {
    const data = await ctx.get("channels", { part: "statistics", id: chunk.join(",") });
    for (const c of data.items || []) {
      const st = c.statistics || {};
      result[c.id] = {
        subscriberCount: st.hiddenSubscriberCount || st.subscriberCount === undefined ? null : toInt(st.subscriberCount),
        // 업로드 재생목록 = 채널 ID의 UC를 UU로(YouTube 규칙). 원본은 contentDetails.relatedPlaylists.uploads를 읽음
        uploadsPlaylistId: /^UC/.test(c.id) ? `UU${c.id.slice(2)}` : "",
      };
    }
  }
  return result;
}

/**
 * 채널별 최근 업로드 통계 수집: uploads 재생목록(playlistItems) → videos.list(통계·길이).
 * 24시간 캐시를 먼저 쓰고, 쿼터 초과 시 나머지 채널은 건너뛴다.
 */
async function fetchChannelUploads(channelMap: Record<string, { uploadsPlaylistId: string }>, ctx: FinderContext) {
  const stats = emptyBaselineStats();
  const uploadsByChannel: Record<string, { asOf: number; uploads: UploadRow[] }> = {};
  const pending: [string, string][] = [];
  const cached = await cacheGet(ctx.userId, Object.keys(channelMap));
  for (const [cid, ch] of Object.entries(channelMap)) {
    stats.channels++;
    const hit = cached.get(cid);
    if (hit) {
      uploadsByChannel[cid] = { asOf: hit.t, uploads: hit.u };
      stats.cached++;
    } else if (ch.uploadsPlaylistId) {
      pending.push([cid, ch.uploadsPlaylistId]);
    } else {
      stats.failed++;
    }
  }
  if (pending.length === 0) return { uploadsByChannel, stats };

  const onError = (err: unknown) => {
    if (errCode(err) === "QUOTA_EXCEEDED") stats.quotaHit = true;
  };

  // 1) 채널별 최근 업로드 영상 id
  const lists = await mapLimit(pending, BASELINE_CONCURRENCY, async ([, playlistId]) => {
    if (stats.quotaHit) return null;
    try {
      const data = await ctx.get("playlistItems", { part: "contentDetails", playlistId, maxResults: String(BASELINE_FETCH_PER_CHANNEL) });
      return ((data.items || []) as { contentDetails?: { videoId?: string } }[]).map((it) => it.contentDetails?.videoId).filter((x): x is string => !!x);
    } catch (err) {
      // 업로드 재생목록이 없는 채널(404)은 빈 목록으로 확정해 캐시한다
      if (errStatus(err) === 404) return [];
      onError(err);
      return null;
    }
  });

  // 2) 모은 영상의 조회수·길이·게시일
  const allIds = [...new Set(lists.filter((x): x is string[] => !!x).flat())];
  const statMap: Record<string, UploadRow> = {};
  const failedIds = new Set<string>();
  await mapLimit(chunkArray(allIds, 50), 4, async (chunk) => {
    if (stats.quotaHit) { chunk.forEach((id) => failedIds.add(id)); return; }
    try {
      const data = await ctx.get("videos", { part: "snippet,contentDetails,statistics", fields: "items(id,snippet/publishedAt,contentDetails/duration,statistics/viewCount)", id: chunk.join(",") });
      for (const it of data.items || []) {
        const vc = it.statistics?.viewCount;
        statMap[it.id] = [it.id, vc === undefined ? null : toInt(vc), parseIsoDuration(it.contentDetails?.duration), Date.parse(it.snippet?.publishedAt)];
      }
    } catch (err) {
      chunk.forEach((id) => failedIds.add(id));
      onError(err);
    }
  });

  const asOf = Date.now();
  const toCache: { channelId: string; uploads: UploadRow[] }[] = [];
  pending.forEach(([cid], i) => {
    const ids = lists[i];
    if (!ids) { stats.failed++; return; }
    const uploads = ids.map((id) => statMap[id]).filter(Boolean);
    uploadsByChannel[cid] = { asOf, uploads };
    // 통계 일부가 빠진 채널은 있는 만큼만 쓰고 캐시하지 않는다(다음 검색에서 다시 수집)
    if (ids.some((id) => failedIds.has(id))) { stats.failed++; return; }
    stats.fetched++;
    toCache.push({ channelId: cid, uploads });
  });
  await cacheSet(ctx.userId, toCache);
  return { uploadsByChannel, stats };
}

/** 거르기를 통과한 영상에 채널 구독자·평소 조회수를 붙여 떡상 지표를 계산한다(검색·인기 차트 공통) */
async function buildVideos(kept: string[], videoMap: Record<string, RawFinderVideo>, ctx: FinderContext) {
  const channelIds = [...new Set(kept.map((id) => videoMap[id].channelId).filter(Boolean))];
  // 채널 정보 조회가 실패해도(할당량·네트워크) 이미 쓴 검색 결과를 버리지 않는다 → 구독자·평소 조회수 없이 표시
  let channelMap: Record<string, { subscriberCount: number | null; uploadsPlaylistId: string }> = {};
  let channelError: unknown = null;
  try {
    channelMap = await fetchChannelDetails(channelIds, ctx);
  } catch (err) {
    channelError = err;
  }
  const { uploadsByChannel, stats: baseline } = await fetchChannelUploads(channelMap, ctx);
  if (channelError) {
    baseline.channelFailed = true;
    if (errCode(channelError) === "QUOTA_EXCEEDED") baseline.quotaHit = true;
  }
  const now = Date.now();
  const videos = kept.map((id) => {
    const v = videoMap[id];
    const ch = channelMap[v.channelId];
    return buildFinderVideo(id, v, ch ? ch.subscriberCount : null, uploadsByChannel[v.channelId] ?? null, now);
  });
  return { videos, baseline };
}

export interface SearchOptions {
  query?: string;
  regionCode?: string;
  relevanceLanguage?: string;
  langOnly?: boolean;
  videoCategoryId?: string;
  publishedPeriod?: string;
  customRange?: { from?: string; to?: string } | null;
  format?: FinderFormat;
  order?: "viewCount" | "relevance";
  /** 이번 검색에서 쓸 수 있는 search.list 호출 수(남은 일일 한도) */
  maxSearchCalls?: number;
  includeReligion?: boolean;
}

/**
 * 키워드로 영상을 검색하고 채널 구독자·영상 통계를 합쳐 떡상 지표를 계산한다.
 * search.list 의 제목은 HTML 이스케이프되어 오므로 videos.list 의 원문 snippet 을 사용한다.
 */
export async function searchYouTube(ctx: FinderContext, o: SearchOptions): Promise<FinderResult> {
  const query = String(o.query || "").trim();
  const { regionCode = "KR", relevanceLanguage = "ko", langOnly = true, videoCategoryId = "0", publishedPeriod = "all", customRange = null, includeReligion = false } = o;
  const maxSearchCalls = o.maxSearchCalls ?? Infinity;
  // 종교 영상 제외(기본). 검색어 자체가 종교 단어면 찾으려는 것이므로 빼지 않는다
  const dropReligion = !includeReligion && !isReligiousQuery(query);

  const params: Record<string, string> = { part: "snippet", type: "video", maxResults: "50" };
  if (query) params.q = query;
  if (regionCode && regionCode !== "ALL") params.regionCode = regionCode;
  if (relevanceLanguage && relevanceLanguage !== "ALL") params.relevanceLanguage = relevanceLanguage;
  if (videoCategoryId && videoCategoryId !== "0") params.videoCategoryId = videoCategoryId;
  let range;
  try {
    range = calculatePublishedRange(publishedPeriod, customRange);
  } catch (e) {
    throw new FinderError((e as Error).message, "BAD_RANGE", 400);
  }
  if (range.after) params.publishedAfter = range.after;
  if (range.before) params.publishedBefore = range.before;

  // 형식은 검색 단계에서 나눈다. 한 번에 섞어 검색하면 쇼츠가 상위를 차지해 롱폼이 몇 개밖에 남지 않는다.
  const fmt: FinderFormat = o.format && SEARCH_PLAN[o.format] ? o.format : "all";
  const primary = o.order === "relevance" ? "relevance" : "viewCount";
  const target = TOPUP_TARGET[fmt];
  type Step = { order: string; next?: boolean };
  const stepsFor = (): Step[] => primary === "viewCount"
    ? [{ order: "viewCount" }, ...(fmt === "shorts" ? [{ order: "viewCount", next: true }] : []), { order: "relevance" }]
    : [{ order: "relevance" }, { order: "relevance", next: true }];
  const buckets = SEARCH_PLAN[fmt].map((videoDuration) => ({ videoDuration, steps: stepsFor(), tokens: {} as Record<string, string | null>, kept: 0 }));
  type Bucket = (typeof buckets)[number];

  const excluded = emptyExcluded();
  const excludedItems: ExcludedItem[] = [];
  const kept: string[] = [];
  const videoMap: Record<string, RawFinderVideo> = {};
  const seen = new Set<string>();
  let topupStopped = false;
  const startSearch = ctx.searchCalls;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- search.list 항목 원본
  async function runStep(b: Bucket): Promise<any[]> {
    const step = b.steps.shift() as Step;
    const p: Record<string, string> = { ...params, videoDuration: b.videoDuration };
    if (step.order === "viewCount") p.order = "viewCount";
    if (step.next) {
      const token = b.tokens[step.order];
      if (!token) return [];
      p.pageToken = token;
    }
    const page = await ctx.get("search", p);
    b.tokens[step.order] = page.nextPageToken || null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- search.list 항목 원본
    return (page.items || []).filter((it: any) => it.id && it.id.videoId);
  }

  for (let round = 0; ; round++) {
    let active = buckets.filter((b) => b.steps.length > 0 && (round === 0 || b.kept < target));
    if (active.length === 0) break;
    // 남은 일일 검색 한도 안에서만 검색한다
    const budget = maxSearchCalls - (ctx.searchCalls - startSearch);
    if (round === 0 && budget < active.length) {
      throw new FinderError(`오늘 남은 검색 횟수(${Math.max(0, budget)}회)로는 이 조건을 검색할 수 없습니다(최소 ${active.length}회 필요). 형식을 롱폼·쇼츠로 좁히거나, 인기 차트(검색 횟수 0)로 찾아 주세요.`, "QUOTA_BUDGET", 429);
    }
    if (active.length > budget) {
      active = active.slice(0, Math.max(0, budget));
      topupStopped = true;
      if (active.length === 0) break;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- search.list 항목 원본
    let lists: any[][];
    try {
      lists = await Promise.all(active.map(runStep));
    } catch (err) {
      if (round === 0) throw err;
      topupStopped = true; // 보충 검색 실패(할당량 등)는 이미 모은 결과로 계속한다
      break;
    }
    // 버킷별 결과를 번갈아 합쳐 각 버킷 상위가 고르게 섞이도록 한다
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- search.list 항목 원본
    const fresh: { it: any; bucket: Bucket }[] = [];
    for (let i = 0; i < Math.max(0, ...lists.map((l) => l.length)); i++) {
      lists.forEach((l, k) => {
        const it = l[i];
        if (it && !seen.has(it.id.videoId)) { seen.add(it.id.videoId); fresh.push({ it, bucket: active[k] }); }
      });
    }
    if (fresh.length === 0) continue;

    let details: Record<string, RawFinderVideo>;
    try {
      details = await fetchVideoDetails(fresh.map((x) => x.it.id.videoId), ctx);
    } catch (err) {
      if (round === 0) throw err;
      topupStopped = true;
      break;
    }

    // 1차 거르기: 라이브·형식 불일치·해시태그 도배·언어·키워드 무관. 채널 조회 전에 걸러 유닛을 아낀다.
    for (const { it, bucket } of fresh) {
      const id = it.id.videoId as string;
      const v = details[id];
      if (!v) continue; // 삭제·비공개 전환된 영상
      const fb = it.snippet || {};
      v.channelId = v.channelId || fb.channelId || "";
      v.channelTitle = v.channelTitle || decodeEntities(fb.channelTitle);
      v.title = v.title || decodeEntities(fb.title);
      v.publishedAt = v.publishedAt || fb.publishedAt;
      if (!v.thumbnails || !Object.keys(v.thumbnails).length) v.thumbnails = fb.thumbnails || {};
      if (v.liveBroadcastContent === "live" || v.liveBroadcastContent === "upcoming") { excluded.live++; continue; }
      // 쇼츠는 최대 3분이므로 길이로만 판정한다
      v.isShorts = v.durationSec > 0 && v.durationSec <= SHORTS_MAX_SEC;
      if ((fmt === "shorts" && !v.isShorts) || (fmt === "long" && v.isShorts)) { excluded.format++; continue; }
      const reason = relevanceIssue(v, query, relevanceLanguage, langOnly) || (dropReligion && isReligious(v) ? "religion" : null);
      if (reason) {
        excluded[reason]++;
        excludedItems.push({ id, reason, title: v.title, channelTitle: v.channelTitle, viewCount: v.viewCount });
        continue;
      }
      videoMap[id] = v;
      kept.push(id);
      bucket.kept++;
    }
  }

  const searchCalls = ctx.searchCalls - startSearch;
  const searchInfo = { calls: searchCalls, order: primary, topupStopped, source: "search" as const };
  if (kept.length === 0) return { videos: [], excluded, excludedItems, baseline: emptyBaselineStats(), format: fmt, searchCalls, searchInfo, unitsUsed: ctx.meter.used };
  const { videos, baseline } = await buildVideos(kept, videoMap, ctx);
  return { videos, excluded, excludedItems, baseline, format: fmt, searchCalls, searchInfo, unitsUsed: ctx.meter.used };
}

export interface ChartOptions {
  regionCode?: string;
  videoCategoryId?: string;
  format?: FinderFormat;
  relevanceLanguage?: string;
  langOnly?: boolean;
  includeReligion?: boolean;
}

/**
 * 국가·주제별 인기 차트(videos.list chart=mostPopular)를 받아 검색과 같은 방식(형식·언어 거르기, 채널 평소 대비 배수)으로 분석한다.
 * search.list 를 쓰지 않아 검색 한도가 들지 않는다(페이지당 1유닛). 차트는 '지금 인기' 목록이라 기간 조건이 없다.
 */
export async function fetchPopularChart(ctx: FinderContext, o: ChartOptions): Promise<FinderResult> {
  const { regionCode = "KR", videoCategoryId = "0", relevanceLanguage = "ko", langOnly = true, includeReligion = false } = o;
  const fmt: FinderFormat = o.format && SEARCH_PLAN[o.format] ? o.format : "all";
  const params: Record<string, string> = { part: "snippet,contentDetails,statistics", chart: "mostPopular", maxResults: "50" };
  if (regionCode && regionCode !== "ALL") params.regionCode = regionCode;
  if (videoCategoryId && videoCategoryId !== "0") params.videoCategoryId = videoCategoryId;

  const excluded = emptyExcluded();
  const excludedItems: ExcludedItem[] = [];
  const kept: string[] = [];
  const videoMap: Record<string, RawFinderVideo> = {};
  let pageToken = "";
  let pages = 0;
  let stopped = false;
  while (pages < CHART_PAGES) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- videos.list 응답 원본
    let data: any;
    try {
      data = await ctx.get("videos", pageToken ? { ...params, pageToken } : params);
    } catch (err) {
      if (pages === 0) throw err;
      stopped = true; // 다음 페이지 실패는 받은 만큼으로 계속
      break;
    }
    pages++;
    for (const item of data.items || []) {
      if (!item || !item.id || videoMap[item.id]) continue;
      const v = mapVideoItem(item);
      if (v.liveBroadcastContent === "live" || v.liveBroadcastContent === "upcoming") { excluded.live++; continue; }
      v.isShorts = v.durationSec > 0 && v.durationSec <= SHORTS_MAX_SEC;
      if ((fmt === "shorts" && !v.isShorts) || (fmt === "long" && v.isShorts)) { excluded.format++; continue; }
      const reason = relevanceIssue(v, "", relevanceLanguage, langOnly) || (!includeReligion && isReligious(v) ? "religion" : null);
      if (reason) {
        excluded[reason]++;
        excludedItems.push({ id: item.id, reason, title: v.title, channelTitle: v.channelTitle, viewCount: v.viewCount });
        continue;
      }
      videoMap[item.id] = v;
      kept.push(item.id);
    }
    pageToken = data.nextPageToken || "";
    if (!pageToken) break;
  }

  const searchInfo = { calls: 0, order: "chart", topupStopped: stopped, source: "chart" as const, chartPages: pages };
  if (kept.length === 0) return { videos: [], excluded, excludedItems, baseline: emptyBaselineStats(), format: fmt, searchCalls: 0, searchInfo, unitsUsed: ctx.meter.used };
  const { videos, baseline } = await buildVideos(kept, videoMap, ctx);
  return { videos, excluded, excludedItems, baseline, format: fmt, searchCalls: 0, searchInfo, unitsUsed: ctx.meter.used };
}

/**
 * 다른 화면(쇼츠 떡상 트리거)에서 쓰는 평소 조회수 보강: 영상 목록의 채널 업로드 통계를 모아(24시간 캐시)
 * 영상별 평소 조회수 중앙값 대비 배수를 돌려준다. 모르면 null.
 */
export async function baselineRatiosFor(
  ctx: FinderContext,
  videos: { id: string; channelId: string; viewCount: number; durationSeconds: number }[]
): Promise<{ ratios: Map<string, { ratio: number; median: number } | null>; stats: BaselineStats }> {
  const channelMap: Record<string, { uploadsPlaylistId: string }> = {};
  for (const v of videos) if (/^UC/.test(v.channelId)) channelMap[v.channelId] = { uploadsPlaylistId: `UU${v.channelId.slice(2)}` };
  const { uploadsByChannel, stats } = await fetchChannelUploads(channelMap, ctx);
  const ratios = new Map<string, { ratio: number; median: number } | null>();
  for (const v of videos) {
    const ch = uploadsByChannel[v.channelId];
    const isShorts = v.durationSeconds > 0 && v.durationSeconds <= SHORTS_MAX_SEC;
    const base = ch ? computeChannelBaseline(ch.uploads, { videoId: v.id, isShorts, now: ch.asOf }) : null;
    ratios.set(v.id, base ? { ratio: round1(v.viewCount / Math.max(base.median, BASELINE_FLOOR)), median: base.median } : null);
  }
  return { ratios, stats };
}
