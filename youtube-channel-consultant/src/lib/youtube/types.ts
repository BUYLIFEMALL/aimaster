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

export type TargetPeriod = "30d" | "90d" | "365d";

export interface TargetSearchParams {
  keyword: string;
  /** 이 구독자 수 이하 채널만 */
  maxSubscribers: number;
  /** 채널 전체 평균 조회수(총 조회수 ÷ 영상 수)가 이 값 이상인 채널만 */
  minAverageViews: number;
  period: TargetPeriod;
  /** true 이면 4분 미만의 짧은 영상만 검색 (쇼츠 포함) */
  shortVideosOnly: boolean;
  region: SearchRegion;
  pages: 1 | 2;
}

export interface TargetChannel {
  id: string;
  title: string;
  handle?: string;
  thumbnailUrl: string;
  publishedAt: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  /** 채널 전체 누적 조회수 ÷ 영상 수 (최근 영상 평균이 아니다) */
  averageViews: number;
  /** 평균 조회수 ÷ 구독자 수 (구독자 대비 파괴력 배수) */
  powerRatio: number;
  /** 이번 검색에서 잡힌 이 채널의 가장 조회수 높은 영상 */
  bestVideo: { id: string; title: string; viewCount: number; publishedAt: string; thumbnailUrl: string };
  /** 이번 검색에서 잡힌 이 채널의 영상 수 */
  matchedVideos: number;
}

export interface TargetChannelsResult {
  keyword: string;
  channels: TargetChannel[];
  scannedVideos: number;
  scannedChannels: number;
  /** 구독자 수를 비공개한 채널 수(계산 불가라 제외) */
  hiddenSubscriberExcluded: number;
  quotaUsed: number;
  fetchedAt: string;
}
