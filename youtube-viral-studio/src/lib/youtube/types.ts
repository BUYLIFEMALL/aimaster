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

export interface TrendingParams {
  type: "shorts" | "long" | "all";
  regionCode?: string; // 기본 KR
  maxResults?: number;
}

/** v1.15: search.list 결과 항목 — 코드에서 실제로 쓰는 칸만(any 대신) */
export interface YouTubeSearchItem {
  id?: { videoId?: string };
  snippet?: { channelId?: string };
}

/** v1.15: 영상 페이지 안 자막 트랙 정보(쓰는 칸만) */
export interface CaptionTrack {
  languageCode?: string;
  vssId?: string;
  baseUrl?: string;
}
export interface CaptionsData {
  playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] };
}

/** v1.15: videos.list / channels.list 원본 응답(코드에서 실제로 쓰는 칸만, any 대신). 숫자 통계는 API가 문자열로 준다 */
interface RawThumb { url?: string }
interface RawThumbnails { default?: RawThumb; medium?: RawThumb; high?: RawThumb; maxres?: RawThumb }
export interface RawVideoResource {
  id: string;
  snippet: { title?: string; description?: string; channelId: string; channelTitle?: string; publishedAt?: string; thumbnails?: RawThumbnails };
  contentDetails?: { duration?: string };
  statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
}
export interface RawChannelResource {
  id: string;
  snippet: { title?: string; description?: string; customUrl?: string; publishedAt?: string; thumbnails?: RawThumbnails };
  statistics: { viewCount?: string; subscriberCount?: string; videoCount?: string };
}
