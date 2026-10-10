import "server-only";
import { fetchChannelsDetails, fetchVideosDetails, YouTubeApiError } from "./client";
import type { GoldenChannelsParams, YouTubeChannelItem } from "./types";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

export async function findGoldenChannels(
  params: GoldenChannelsParams,
  apiKey: string
): Promise<YouTubeChannelItem[]> {
  const {
    keyword = "이슈 쇼츠",
    maxSubscribers = 10000,
    minAverageViews = 30000,
    maxResults = 20,
  } = params;

  // 1. 최근 30일 이내 업로드된 인기 쇼츠 검색하여 잠재적 떡상 채널 수집
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const searchUrl = new URL(`${YOUTUBE_API_BASE}/search`);
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("q", `${keyword} #shorts`);
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("videoDuration", "short");
  searchUrl.searchParams.set("order", "viewCount");
  searchUrl.searchParams.set("publishedAfter", thirtyDaysAgo);
  searchUrl.searchParams.set("maxResults", "50");
  searchUrl.searchParams.set("key", apiKey);

  const res = await fetch(searchUrl.toString(), { next: { revalidate: 300 } });
  const searchData = await res.json();

  if (!res.ok) {
    throw new YouTubeApiError(
      searchData?.error?.message || "YouTube 검색 실패",
      searchData?.error?.errors?.[0]?.reason || "SEARCH_ERROR",
      res.status
    );
  }

  // 검색된 영상들로부터 고유 채널 ID 추출
  const channelIds = Array.from(
    new Set<string>(
      (searchData.items || [])
        .map((item: any) => item.snippet?.channelId)
        .filter(Boolean)
    )
  );

  if (channelIds.length === 0) return [];

  // 2. 채널 통계 일괄 조회
  const channelsMap = await fetchChannelsDetails(channelIds, apiKey);

  // 3. 각 채널별 조건 필터링 및 떡상 지수 계산
  const goldenChannels: YouTubeChannelItem[] = [];

  for (const channelId of channelIds) {
    const channel = channelsMap.get(channelId);
    if (!channel) continue;

    const subCount = parseInt(channel.statistics?.subscriberCount || "0", 10);
    const videoCount = parseInt(channel.statistics?.videoCount || "0", 10);
    const totalViews = parseInt(channel.statistics?.viewCount || "0", 10);

    // 구독자가 maxSubscribers를 초과하면 제외 (기본 1만 이하 소형 황금 채널 발굴)
    if (subCount > maxSubscribers) continue;
    if (videoCount <= 0) continue;

    const averageViews = Math.round(totalViews / videoCount);
    // 평균 조회수가 최소 기준 미만이면 제외
    if (averageViews < minAverageViews) continue;

    // 떡상 지수 = (평균 조회수 / 구독자수) 가중치 (구독자 대비 파괴력)
    const ratio = subCount > 0 ? averageViews / subCount : averageViews / 100;
    const viralIndex = Math.min(100, Math.round(ratio * 10));

    goldenChannels.push({
      id: channelId,
      title: channel.snippet?.title || "",
      description: channel.snippet?.description || "",
      customUrl: channel.snippet?.customUrl,
      thumbnailUrl:
        channel.snippet?.thumbnails?.high?.url ||
        channel.snippet?.thumbnails?.medium?.url ||
        channel.snippet?.thumbnails?.default?.url ||
        "",
      publishedAt: channel.snippet?.publishedAt || "",
      subscriberCount: subCount,
      videoCount,
      viewCount: totalViews,
      averageViews,
      viralIndex,
    });
  }

  // 떡상 지수 및 평균 조회수 높은 순으로 정렬
  goldenChannels.sort((a, b) => (b.viralIndex || 0) - (a.viralIndex || 0));

  return goldenChannels.slice(0, maxResults);
}
