import "server-only";
import {
  fetchChannelsDetails,
  fetchVideosDetails,
  youtubeGet,
} from "./client";
import {
  calculateViralScore,
  calculateVPH,
  calculateVsRatio,
  isShortsVideo,
  parseDuration,
} from "./metrics";
import type { ShortsSearchParams, YouTubeVideoItem } from "./types";
import type { YouTubeSearchItem } from "./types";


export async function searchViralShorts(
  params: ShortsSearchParams,
  apiKey: string
): Promise<{
  items: YouTubeVideoItem[];
  nextPageToken?: string;
  totalResults?: number;
  fallbackNotice?: string;
}> {
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

  // 2. 검색 쿼리 구성: 한국어 쇼츠 및 키워드 최적화
  const trimmedKw = keyword.trim();
  const searchQuery = trimmedKw.toLowerCase().includes("shorts") || trimmedKw.includes("쇼츠")
    ? trimmedKw
    : `${trimmedKw} #shorts`;

  // v1.18: 공용 기준 코드(youtubeData.ts)로 호출 — 한도·키 오류를 한국어로 안내, 2분 재사용
  const searchQuery_: Record<string, string> = {
    part: "snippet",
    q: searchQuery,
    type: "video",
    videoDuration: "short", // 4분 미만 영상
    regionCode: "KR", // 대한민국 지역 우선
    relevanceLanguage: "ko", // 한국어 관련성 우선
    maxResults: "50", // 넉넉히 수집 후 필터링
    order: sortBy === "date" ? "date" : "viewCount",
  };
  if (publishedAfter) searchQuery_.publishedAfter = publishedAfter;
  if (pageToken) searchQuery_.pageToken = pageToken;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- YouTube 응답 원본
  const searchData: any = await youtubeGet("search", searchQuery_, apiKey, { revalidateSeconds: 120 });

  const videoIds = (searchData.items || [])
    .map((item: YouTubeSearchItem) => item.id?.videoId)
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
  const allParsedVideos: YouTubeVideoItem[] = [];

  for (const videoId of videoIds) {
    const videoDetail = videoDetailsMap.get(videoId);
    if (!videoDetail) continue;

    const durationStr = videoDetail.contentDetails?.duration;
    const durationSeconds = parseDuration(durationStr);
    const title = videoDetail.snippet?.title || "";
    const description = videoDetail.snippet?.description || "";

    // 180초(최신 유튜브 3분 쇼츠 규격) 초과이면 제외
    const isShort = durationSeconds <= 180 || isShortsVideo(durationStr, title, description);
    if (!isShort) continue;

    const channelId = videoDetail.snippet?.channelId;
    const channelDetail = channelDetailsMap.get(channelId);
    const subCountStr = channelDetail?.statistics?.subscriberCount;
    const subCount = subCountStr ? parseInt(subCountStr, 10) : undefined;

    const views = parseInt(videoDetail.statistics?.viewCount || "0", 10);
    const likes = videoDetail.statistics?.likeCount
      ? parseInt(videoDetail.statistics.likeCount, 10)
      : undefined;
    const comments = videoDetail.statistics?.commentCount
      ? parseInt(videoDetail.statistics.commentCount, 10)
      : undefined;

    const publishedAt = videoDetail.snippet?.publishedAt || new Date().toISOString();
    const vph = calculateVPH(views, publishedAt);
    const vsRatio = calculateVsRatio(views, subCount);
    const { score: viralScore, badge: viralBadge } = calculateViralScore({
      views,
      subscribers: subCount,
      likes,
      publishedAt,
    });

    allParsedVideos.push({
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

  // 6. 엄격 필터링 적용 (구독자수 & 조회수)
  let filtered = allParsedVideos.filter((v) => {
    if (maxSubscribers && v.channelSubscriberCount && v.channelSubscriberCount > maxSubscribers) {
      return false;
    }
    if (minViews && v.viewCount < minViews) return false;
    if (maxViews && v.viewCount > maxViews) return false;
    return true;
  });

  let fallbackNotice: string | undefined;

  // 스마트 폴백: 만약 엄격 필터 통과 영상이 3개 미만이면,
  // 소형 채널이 적은 테크/전문 키워드이므로 필터를 자동 완화하여 떡상 쇼츠들을 함께 표시
  if (filtered.length < 3 && allParsedVideos.length > 0) {
    fallbackNotice = "지정하신 소형 채널 필터 기준에 맞는 영상이 적어, 연관 인기 떡상 쇼츠를 함께 표시합니다.";
    filtered = allParsedVideos; // 전체 파싱된 쇼츠 목록 제공
  }

  // 7. 정렬
  filtered.sort((a, b) => {
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
    items: filtered.slice(0, maxResults),
    nextPageToken: searchData.nextPageToken,
    totalResults: filtered.length,
    fallbackNotice,
  };
}
