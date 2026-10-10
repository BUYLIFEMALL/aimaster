import "server-only";
import {
  fetchChannelsDetails,
  fetchVideosDetails,
  YouTubeApiError,
} from "./client";
import {
  calculateViralScore,
  calculateVPH,
  calculateVsRatio,
  isShortsVideo,
  parseDuration,
} from "./metrics";
import type { ShortsSearchParams, YouTubeVideoItem } from "./types";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

export async function searchViralShorts(
  params: ShortsSearchParams,
  apiKey: string
): Promise<{ items: YouTubeVideoItem[]; nextPageToken?: string; totalResults?: number }> {
  const {
    keyword,
    uploadPeriod = "30d",
    maxSubscribers,
    minViews = 10000,
    maxViews,
    sortBy = "viralScore",
    maxResults = 25,
    pageToken,
  } = params;

  // 1. 기간 필터링 기준일 계산
  let publishedAfter: string | undefined;
  const now = new Date();
  if (uploadPeriod === "7d") {
    publishedAfter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  } else if (uploadPeriod === "30d") {
    publishedAfter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  } else if (uploadPeriod === "90d") {
    publishedAfter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
  } else if (uploadPeriod === "365d") {
    publishedAfter = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
  }

  // 2. 검색 쿼리: 쇼츠 검색 효과를 높이기 위해 #shorts 접미사 보강
  const searchQuery = keyword.toLowerCase().includes("shorts")
    ? keyword
    : `${keyword} #shorts`;

  const searchUrl = new URL(`${YOUTUBE_API_BASE}/search`);
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("q", searchQuery);
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("videoDuration", "short"); // 4분 미만 영상
  searchUrl.searchParams.set("maxResults", "50"); // 넉넉히 수집 후 필터링
  searchUrl.searchParams.set("key", apiKey);

  if (publishedAfter) {
    searchUrl.searchParams.set("publishedAfter", publishedAfter);
  }
  if (pageToken) {
    searchUrl.searchParams.set("pageToken", pageToken);
  }

  // 유튜브 API search 자체 정렬: 뷰 카운트 or 최신
  if (sortBy === "date") {
    searchUrl.searchParams.set("order", "date");
  } else {
    searchUrl.searchParams.set("order", "viewCount");
  }

  const res = await fetch(searchUrl.toString(), { next: { revalidate: 180 } });
  const searchData = await res.json();

  if (!res.ok) {
    throw new YouTubeApiError(
      searchData?.error?.message || "YouTube 영상 검색에 실패했습니다.",
      searchData?.error?.errors?.[0]?.reason || "SEARCH_ERROR",
      res.status
    );
  }

  const videoIds = (searchData.items || [])
    .map((item: any) => item.id?.videoId)
    .filter(Boolean);

  if (videoIds.length === 0) {
    return { items: [], totalResults: 0 };
  }

  // 3. 비디오 상세 정보 일괄 조회 (통계, 재생길이)
  const videoDetailsMap = await fetchVideosDetails(videoIds, apiKey);

  // 4. 채널 ID 추출 및 채널 상세 정보 일괄 조회 (구독자수)
  const channelIds: string[] = [];
  videoDetailsMap.forEach((v) => {
    if (v.snippet?.channelId) {
      channelIds.push(v.snippet.channelId);
    }
  });

  const channelDetailsMap = await fetchChannelsDetails(channelIds, apiKey);

  // 5. 영상 가공 및 필터링
  const processedVideos: YouTubeVideoItem[] = [];

  for (const videoId of videoIds) {
    const videoDetail = videoDetailsMap.get(videoId);
    if (!videoDetail) continue;

    const durationStr = videoDetail.contentDetails?.duration;
    const durationSeconds = parseDuration(durationStr);
    const title = videoDetail.snippet?.title || "";
    const description = videoDetail.snippet?.description || "";

    // 60초 초과이고 제목/설명에 shorts가 전혀 없으면 제외
    if (durationSeconds > 60 && !isShortsVideo(durationStr, title, description)) {
      continue;
    }

    const channelId = videoDetail.snippet?.channelId;
    const channelDetail = channelDetailsMap.get(channelId);
    const subCountStr = channelDetail?.statistics?.subscriberCount;
    const subCount = subCountStr ? parseInt(subCountStr, 10) : undefined;

    // 소형 채널 필터링 (maxSubscribers 설정 시)
    if (maxSubscribers && subCount && subCount > maxSubscribers) {
      continue;
    }

    const views = parseInt(videoDetail.statistics?.viewCount || "0", 10);
    const likes = videoDetail.statistics?.likeCount
      ? parseInt(videoDetail.statistics.likeCount, 10)
      : undefined;
    const comments = videoDetail.statistics?.commentCount
      ? parseInt(videoDetail.statistics.commentCount, 10)
      : undefined;

    // 최소 / 최대 조회수 필터링
    if (minViews && views < minViews) continue;
    if (maxViews && views > maxViews) continue;

    const publishedAt = videoDetail.snippet?.publishedAt || new Date().toISOString();
    const vph = calculateVPH(views, publishedAt);
    const vsRatio = calculateVsRatio(views, subCount);
    const { score: viralScore, badge: viralBadge } = calculateViralScore({
      views,
      subscribers: subCount,
      likes,
      publishedAt,
    });

    processedVideos.push({
      id: videoId,
      title,
      description,
      thumbnailUrl:
        videoDetail.snippet?.thumbnails?.maxres?.url ||
        videoDetail.snippet?.thumbnails?.high?.url ||
        videoDetail.snippet?.thumbnails?.medium?.url ||
        "",
      publishedAt,
      channelId,
      channelTitle: videoDetail.snippet?.channelTitle || "",
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

  // 6. 정렬
  processedVideos.sort((a, b) => {
    if (sortBy === "viralScore") return b.viralScore - a.viralScore;
    if (sortBy === "vsRatio") return b.vsRatio - a.vsRatio;
    if (sortBy === "vph") return b.vph - a.vph;
    if (sortBy === "viewCount") return b.viewCount - a.viewCount;
    if (sortBy === "date") {
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    }
    return b.viralScore - a.viralScore;
  });

  return {
    items: processedVideos.slice(0, maxResults),
    nextPageToken: searchData.nextPageToken,
    totalResults: processedVideos.length,
  };
}
