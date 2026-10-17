import "server-only";
import { fetchChannelsDetails, fetchVideosDetails, youtubeGet } from "./client";
import {
  calculateViralScore,
  calculateVPH,
  calculateVsRatio,
  isShortsVideo,
  parseDuration,
} from "./metrics";
import type { TrendingParams, YouTubeVideoItem } from "./types";
import type { YouTubeSearchItem } from "./types";


export async function getTrendingVideos(
  params: TrendingParams,
  apiKey: string
): Promise<YouTubeVideoItem[]> {
  const { type = "shorts", regionCode = "KR", maxResults = 30 } = params;

  // 1. 쇼츠 탭의 경우: 대한민국 실시간 떡상 쇼츠 검색 (최근 48시간 내 VPH 급상승)
  if (type === "shorts") {
    // v1.18: 공용 기준 코드(youtubeData.ts)로 호출 — 한도·키 오류를 한국어로 안내, 2분 재사용
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- YouTube 응답 원본
    const sData: any = await youtubeGet(
      "search",
      {
        part: "snippet",
        q: "#shorts",
        type: "video",
        videoDuration: "short",
        regionCode,
        relevanceLanguage: "ko",
        order: "viewCount",
        publishedAfter: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
        maxResults: "50",
      },
      apiKey,
      { revalidateSeconds: 120 }
    );

    const videoIds = (sData.items || []).map((i: YouTubeSearchItem) => i.id?.videoId).filter(Boolean);
    if (videoIds.length === 0) return [];

    const videosMap = await fetchVideosDetails(videoIds, apiKey);
    const channelIds: string[] = [];
    videosMap.forEach((v) => {
      if (v.snippet?.channelId) channelIds.push(v.snippet.channelId);
    });
    const channelsMap = await fetchChannelsDetails(channelIds, apiKey);

    const processedList: YouTubeVideoItem[] = [];

    for (const vId of videoIds) {
      const v = videosMap.get(vId);
      if (!v) continue;

      const durationStr = v.contentDetails?.duration;
      const durationSeconds = parseDuration(durationStr);
      const title = v.snippet?.title || "";
      const description = v.snippet?.description || "";
      const isShort = durationSeconds <= 180 || isShortsVideo(durationStr, title, description);
      if (!isShort) continue;

      const channelId = v.snippet?.channelId;
      const channelDetail = channelsMap.get(channelId);
      const subCountStr = channelDetail?.statistics?.subscriberCount;
      const subCount = subCountStr ? parseInt(subCountStr, 10) : undefined;

      const views = parseInt(v.statistics?.viewCount || "0", 10);
      const likes = v.statistics?.likeCount ? parseInt(v.statistics.likeCount, 10) : undefined;
      const comments = v.statistics?.commentCount ? parseInt(v.statistics.commentCount, 10) : undefined;

      const publishedAt = v.snippet?.publishedAt || new Date().toISOString();
      const vph = calculateVPH(views, publishedAt);
      const vsRatio = calculateVsRatio(views, subCount);
      const { score: viralScore, badge: viralBadge } = calculateViralScore({
        views,
        subscribers: subCount,
        likes,
        publishedAt,
      });

      processedList.push({
        id: vId,
        title,
        description,
        thumbnailUrl:
          v.snippet?.thumbnails?.maxres?.url ||
          v.snippet?.thumbnails?.high?.url ||
          v.snippet?.thumbnails?.medium?.url ||
          "",
        publishedAt,
        channelId,
        channelTitle: v.snippet?.channelTitle || "",
        channelSubscriberCount: subCount,
        channelThumbnailUrl: channelDetail?.snippet?.thumbnails?.default?.url,
        viewCount: views,
        likeCount: likes,
        commentCount: comments,
        duration: durationStr,
        durationSeconds,
        isShort: true,
        vph,
        vsRatio,
        viralScore,
        viralBadge,
      });
    }

    processedList.sort((a, b) => b.vph - a.vph);
    return processedList.slice(0, maxResults);
  }

  // 2. 롱폼 또는 전체 동영상: mostPopular 차트 기반 조회
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- YouTube 응답 원본
  const data: any = await youtubeGet(
    "videos",
    { part: "snippet,contentDetails,statistics", chart: "mostPopular", regionCode, maxResults: "50" },
    apiKey,
    { revalidateSeconds: 120 }
  );

  const items = data.items || [];
  if (items.length === 0) return [];

  // 채널 정보 일괄 조회
  const channelIds = items
    .map((item: YouTubeSearchItem) => item.snippet?.channelId)
    .filter(Boolean);
  const channelsMap = await fetchChannelsDetails(channelIds, apiKey);

  const processedList: YouTubeVideoItem[] = [];

  for (const item of items) {
    const durationStr = item.contentDetails?.duration;
    const durationSeconds = parseDuration(durationStr);
    const title = item.snippet?.title || "";
    const description = item.snippet?.description || "";
    const isShort = durationSeconds <= 60 || isShortsVideo(durationStr, title, description);

    // 필터링: 롱폼 탭이면 롱폼만
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
