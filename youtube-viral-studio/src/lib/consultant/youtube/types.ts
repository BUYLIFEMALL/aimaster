export interface ChannelInfo {
  id: string;
  title: string;
  handle?: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  /** 구독자 수 비공개 채널은 null (0으로 계산하지 않는다) */
  subscriberCount: number | null;
  viewCount: number;
  videoCount: number;
}

export interface AnalyzedVideo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  channelId: string;
  channelTitle: string;
  channelSubscriberCount?: number | null;
  viewCount: number;
  /** 좋아요·댓글이 비공개/막힘이면 null */
  likeCount: number | null;
  commentCount: number | null;
  durationSeconds: number;
  isShort: boolean;
  tags: string[];
  /** 조회된 영상 안에서 최고값 대비 0~100으로 환산한 점수 (calculatePopularity) */
  popularity: number;
}

export interface UploadStats {
  /** 분석에 쓴 영상 사이의 평균 업로드 간격(시간). 영상이 2개 미만이면 null */
  averageIntervalHours: number | null;
  /** 가장 최근 영상이 올라온 뒤 경과 시간(시간) */
  sinceLastUploadHours: number | null;
  oldestPublishedAt: string | null;
}

export interface ChannelCandidate {
  id: string;
  title: string;
  thumbnailUrl: string;
}

export interface ChannelAnalysisResult {
  channel: ChannelInfo;
  videos: AnalyzedVideo[];
  uploadStats: UploadStats;
  /** 이름 검색으로 찾았을 때 같이 나온 다른 채널 후보 (추가 쿼터 없음) */
  candidates: ChannelCandidate[];
  quotaUsed: number;
  fetchedAt: string;
}

export interface KeywordChannelShare {
  channelId: string;
  title: string;
  videoCount: number;
  viewCount: number;
}

export interface KeywordAnalysisResult {
  keyword: string;
  videos: AnalyzedVideo[];
  totals: { views: number; likes: number; comments: number };
  channelShare: KeywordChannelShare[];
  quotaUsed: number;
  fetchedAt: string;
}

export type SearchRegion = "all" | "kr" | "global";
export type SearchOrder = "viewCount" | "relevance" | "date";

export interface KeywordSearchParams {
  keyword: string;
  region: SearchRegion;
  order: SearchOrder;
  categoryId?: string;
  /** 검색 페이지 수(1페이지 = 영상 50개 = 약 100유닛) */
  pages: 1 | 2;
}

// 2026-10-17 v1.08: 공략 채널 타입은 공용 엔진(goldenEngine.ts — youtube-viral-studio와 같은 파일)과 같다.
export type {
  GoldenPeriod as TargetPeriod,
  GoldenSearchParams as TargetSearchParams,
  GoldenChannel as TargetChannel,
  GoldenSearchResult as TargetChannelsResult,
} from "@/lib/youtube/goldenEngine";
