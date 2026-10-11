import "server-only";
import {
  QuotaMeter,
  YouTubeApiError,
  fetchChannelByHandle,
  fetchChannelById,
  fetchChannelByUsername,
  fetchChannelsDetails,
  fetchRecentUploadIds,
  fetchVideosDetails,
  searchChannels,
  searchVideos,
  type RawChannel,
} from "./client";
import { applyPopularity, calculateUploadStats, isShortsVideo, parseDuration } from "./metrics";
import type {
  AnalyzedVideo,
  ChannelAnalysisResult,
  ChannelCandidate,
  ChannelInfo,
  KeywordAnalysisResult,
  KeywordSearchParams,
} from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const CHANNEL_ID_RE = /^UC[\w-]{22}$/;

function subscriberOf(stats: any): number | null {
  return stats?.hiddenSubscriberCount === true || stats?.subscriberCount === undefined ? null : Number(stats.subscriberCount);
}

function toChannelInfo(raw: RawChannel): ChannelInfo {
  return {
    id: raw.id,
    title: raw.snippet?.title ?? "",
    handle: raw.snippet?.customUrl,
    description: raw.snippet?.description ?? "",
    thumbnailUrl: raw.snippet?.thumbnails?.medium?.url ?? raw.snippet?.thumbnails?.default?.url ?? "",
    publishedAt: raw.snippet?.publishedAt ?? "",
    subscriberCount: subscriberOf(raw.statistics),
    viewCount: Number(raw.statistics?.viewCount ?? 0),
    videoCount: Number(raw.statistics?.videoCount ?? 0),
  };
}

function toVideo(item: any, channelSubs?: Map<string, number | null>): Omit<AnalyzedVideo, "popularity"> {
  const snippet = item.snippet ?? {};
  const stats = item.statistics ?? {};
  const durationSeconds = parseDuration(item.contentDetails?.duration);
  const tags: string[] = Array.isArray(snippet.tags) ? snippet.tags.slice(0, 8) : [];
  const text = `${snippet.title ?? ""} ${snippet.description ?? ""} ${tags.join(" ")}`;
  return {
    id: item.id,
    title: snippet.title ?? "",
    description: snippet.description ?? "",
    thumbnailUrl: snippet.thumbnails?.medium?.url ?? snippet.thumbnails?.default?.url ?? "",
    publishedAt: snippet.publishedAt ?? "",
    channelId: snippet.channelId ?? "",
    channelTitle: snippet.channelTitle ?? "",
    channelSubscriberCount: channelSubs?.get(snippet.channelId),
    viewCount: Number(stats.viewCount ?? 0),
    likeCount: stats.likeCount === undefined ? null : Number(stats.likeCount),
    commentCount: stats.commentCount === undefined ? null : Number(stats.commentCount),
    durationSeconds,
    isShort: isShortsVideo(durationSeconds, text),
    tags,
  };
}

/** 입력(채널 ID·@핸들·채널 주소·이름)으로 채널을 찾는다. 이름 검색은 100유닛이 든다. */
async function resolveChannel(
  input: string,
  apiKey: string,
  meter: QuotaMeter
): Promise<{ raw: RawChannel; candidates: ChannelCandidate[] }> {
  const text = input.trim();
  let raw: RawChannel | null = null;

  if (CHANNEL_ID_RE.test(text)) {
    raw = await fetchChannelById(text, apiKey, meter);
  } else if (/^https?:\/\//i.test(text) || /^(www\.|m\.)?youtube\.com\//i.test(text)) {
    let url: URL | null = null;
    try {
      url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    } catch {
      url = null;
    }
    if (!url || !/(^|\.)youtube\.com$/i.test(url.hostname)) {
      throw new YouTubeApiError("유튜브 채널 주소(youtube.com)만 입력할 수 있습니다.", "BAD_INPUT", 400);
    }
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0]?.startsWith("@")) {
      raw = await fetchChannelByHandle(decodeURIComponent(parts[0]), apiKey, meter);
    } else if (parts[0] === "channel" && parts[1]) {
      raw = await fetchChannelById(parts[1], apiKey, meter);
    } else if (parts[0] === "user" && parts[1]) {
      raw = await fetchChannelByUsername(parts[1], apiKey, meter);
    } else if (parts[0] === "c" && parts[1]) {
      const found = await searchChannels(decodeURIComponent(parts[1]), apiKey, meter);
      raw = found[0] ? await fetchChannelById(found[0].id, apiKey, meter) : null;
    } else {
      throw new YouTubeApiError("채널 주소 형식을 알 수 없습니다. @핸들이나 /channel/ 주소를 입력해주세요.", "BAD_INPUT", 400);
    }
  } else if (text.startsWith("@")) {
    raw = await fetchChannelByHandle(text, apiKey, meter);
  } else {
    const found = await searchChannels(text, apiKey, meter);
    if (found.length > 0) {
      raw = await fetchChannelById(found[0].id, apiKey, meter);
      if (raw) {
        const chosenId = raw.id;
        return { raw, candidates: found.filter((c: ChannelCandidate) => c.id !== chosenId) };
      }
    }
  }

  if (!raw) {
    throw new YouTubeApiError("채널을 찾지 못했습니다. 채널 이름·@핸들·채널 주소를 다시 확인해주세요.", "CHANNEL_NOT_FOUND", 404);
  }
  return { raw, candidates: [] };
}

/** 채널 분석: 최근 업로드 N개를 기준으로 채널 지표와 영상별 인기 점수를 계산한다. */
export async function analyzeChannel(input: string, videoLimit: number, apiKey: string): Promise<ChannelAnalysisResult> {
  const meter = new QuotaMeter();
  const { raw, candidates } = await resolveChannel(input, apiKey, meter);
  const channel = toChannelInfo(raw);

  const uploadsId: string | undefined = raw.contentDetails?.relatedPlaylists?.uploads;
  let videos: AnalyzedVideo[] = [];
  if (uploadsId) {
    const ids = await fetchRecentUploadIds(uploadsId, videoLimit, apiKey, meter);
    const details = await fetchVideosDetails(ids, apiKey, meter);
    const subs = new Map<string, number | null>([[channel.id, channel.subscriberCount]]);
    videos = applyPopularity(ids.filter((id) => details.has(id)).map((id) => toVideo(details.get(id), subs)));
  }

  return {
    channel,
    videos,
    uploadStats: calculateUploadStats(videos),
    candidates,
    quotaUsed: meter.used,
    fetchedAt: new Date().toISOString(),
  };
}

/** 키워드 분석: 검색 결과 영상과 소속 채널 정보를 모아 지표를 계산한다. */
export async function analyzeKeyword(params: KeywordSearchParams, apiKey: string): Promise<KeywordAnalysisResult> {
  const meter = new QuotaMeter();
  const regionParams =
    params.region === "kr"
      ? { regionCode: "KR", relevanceLanguage: "ko" }
      : params.region === "global"
        ? { regionCode: "US", relevanceLanguage: "en" }
        : {};

  const ids = await searchVideos(
    { q: params.keyword, order: params.order, videoCategoryId: params.categoryId, pages: params.pages, ...regionParams },
    apiKey,
    meter
  );
  const details = await fetchVideosDetails(ids, apiKey, meter);
  const channelIds = Array.from(details.values())
    .map((v: any) => v.snippet?.channelId)
    .filter(Boolean) as string[];
  const channels = await fetchChannelsDetails(channelIds, apiKey, meter);

  const subs = new Map<string, number | null>();
  channels.forEach((c: any, id: string) => subs.set(id, subscriberOf(c.statistics)));

  const videos = applyPopularity(ids.filter((id) => details.has(id)).map((id) => toVideo(details.get(id), subs)));

  const totals = videos.reduce(
    (t, v) => ({ views: t.views + v.viewCount, likes: t.likes + (v.likeCount ?? 0), comments: t.comments + (v.commentCount ?? 0) }),
    { views: 0, likes: 0, comments: 0 }
  );

  const shareMap = new Map<string, { channelId: string; title: string; videoCount: number; viewCount: number }>();
  for (const v of videos) {
    const cur = shareMap.get(v.channelId) ?? { channelId: v.channelId, title: v.channelTitle, videoCount: 0, viewCount: 0 };
    cur.videoCount += 1;
    cur.viewCount += v.viewCount;
    shareMap.set(v.channelId, cur);
  }

  return {
    keyword: params.keyword,
    videos,
    totals,
    channelShare: Array.from(shareMap.values()).sort((a, b) => b.viewCount - a.viewCount),
    quotaUsed: meter.used,
    fetchedAt: new Date().toISOString(),
  };
}
