import "server-only";
import { fetchChannelsDetails, YouTubeApiError } from "./client";
import {
  calculateViralScore,
  calculateVPH,
  calculateVsRatio,
  isShortsVideo,
  parseDuration,
} from "./metrics";
import type { TrendingParams, YouTubeVideoItem } from "./types";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

export async function getTrendingVideos(
  params: TrendingParams,
  apiKey: string
): Promise<YouTubeVideoItem[]> {
  const { type = "shorts", regionCode = "KR", maxResults = 30 } = params;

  const url = new URL(`${YOUTUBE_API_BASE}/videos`);
  url.searchParams.set("part", "snippet,contentDetails,statistics");
  url.searchParams.set("chart", "mostPopular");
  url.searchParams.set("regionCode", regionCode);
  url.searchParams.set("maxResults", "50");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString(), { next: { revalidate: 120 } });
  const data = await res.json();

  if (!res.ok) {
    throw new YouTubeApiError(
      data?.error?.message || "급상승 동영상 조회에 실패했습니다.",
      data?.error?.errors?.[0]?.reason || "POPULAR_ERROR",
      res.status
    );
  }

  const items = data.items || [];
  if (items.length === 0) return [];

  // 채널 정보 일괄 조회
  const channelIds = items
    .map((item: any) => item.snippet?.channelId)
    .filter(Boolean);
  const channelsMap = await fetchChannelsDetails(channelIds, apiKey);

  const processedList: YouTubeVideoItem[] = [];

  for (const item of items) {
    const durationStr = item.contentDetails?.duration;
    const durationSeconds = parseDuration(durationStr);
    const title = item.snippet?.title || "";
    const description = item.snippet?.description || "";
    const isShort = durationSeconds <= 60 || isShortsVideo(durationStr, title, description);

    // 필터링: 쇼츠 탭이면 쇼츠만, 롱폼 탭이면 롱폼만
    if (type === "shorts" && !isShort) continue;
    if (type === "long" && isShort) continue;

    const channelId = item.snippet?.channelId;
    const channelDetail = channelsMap.get(channelId);
    const subCountStr = channelDetail?.statistics?.subscriberCount;
    const subCount = subCountStr ? parseInt(subCountStr, 10) : undefined;

    const views = parseInt(item.statistics?.viewCount || "0", 10);
    const likes = item.statistics?.likeCount
      ? parseInt(item.statistics.likeCount, 10)
      : undefined;
    const comments = item.statistics?.commentCount
      ? parseInt(item.statistics.commentCount, 10)
      : undefined;

    const publishedAt = item.snippet?.publishedAt || new Date().toISOString();
    const vph = calculateVPH(views, publishedAt);
    const vsRatio = calculateVsRatio(views, subCount);
    const { score: viralScore, badge: viralBadge } = calculateViralScore({
      views,
      subscribers: subCount,
      likes,
      publishedAt,
    });

    processedList.push({
      id: item.id,
      title,
      description,
      thumbnailUrl:
        item.snippet?.thumbnails?.maxres?.url ||
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.medium?.url ||
        "",
      publishedAt,
      channelId,
      channelTitle: item.snippet?.channelTitle || "",
      channelSubscriberCount: subCount,
      channelThumbnailUrl: channelDetail?.snippet?.thumbnails?.default?.url,
      viewCount: views,
      likeCount: likes,
      commentCount: comments,
      duration: durationStr,
      durationSeconds,
      isShort,
      vph,
      vsRatio,
      viralScore,
      viralBadge,
    });
  }

  // 실시간 터진 영상은 VPH(시간당 조회수 속도) 높은 순으로 정렬!
  processedList.sort((a, b) => b.vph - a.vph);

  return processedList.slice(0, maxResults);
}
