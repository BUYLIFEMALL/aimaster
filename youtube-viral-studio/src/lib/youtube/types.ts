export interface YouTubeVideoItem {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  channelId: string;
  channelTitle: string;
  channelSubscriberCount?: number;
  channelThumbnailUrl?: string;
  channelPublishedAt?: string;
  viewCount: number;
  likeCount?: number;
  commentCount?: number;
  duration?: string; // ISO 8601 duration (e.g. PT45S)
  durationSeconds?: number;
  isShort: boolean;
  
  // 계산된 바이럴 지표
  vph: number; // Views Per Hour (시간당 조회수)
  vsRatio: number; // View to Subscriber Ratio (구독자 대비 조회수 배수)
  viralScore: number; // 0 ~ 100점
  viralBadge: "SUPER_VIRAL" | "VIRAL" | "RISING" | "NORMAL"; // 초대박 / 대박 / 떡상 / 일반
}

export interface YouTubeChannelItem {
  id: string;
  title: string;
  description: string;
  customUrl?: string;
  thumbnailUrl: string;
  publishedAt: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  averageViews?: number;
  viralIndex?: number; // 채널 떡상 지수
  topVideo?: {
    id: string;
    title: string;
    viewCount: number;
    thumbnailUrl: string;
  };
}

export interface ShortsSearchParams {
  keyword: string;
  uploadPeriod?: "7d" | "30d" | "90d" | "365d" | "all";
  maxSubscribers?: number; // e.g. 10000 (1만 이하)
  minViews?: number; // e.g. 50000
  maxViews?: number;
  sortBy?: "viralScore" | "vsRatio" | "vph" | "viewCount" | "date";
  maxResults?: number;
  pageToken?: string;
}

export interface GoldenChannelsParams {
  keyword?: string;
  maxSubscribers?: number; // 기본 10000 이하
  minAverageViews?: number; // 기본 50000 이상
  category?: string;
  maxResults?: number;
}

export interface TrendingParams {
  type: "shorts" | "long" | "all";
  regionCode?: string; // 기본 KR
  maxResults?: number;
}
