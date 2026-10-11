import type { TargetChannel, TargetSearchParams } from "./types";

export interface TargetCandidate {
  id: string;
  title: string;
  handle?: string;
  thumbnailUrl: string;
  publishedAt: string;
  /** 구독자 비공개이면 null */
  subscriberCount: number | null;
  viewCount: number;
  videoCount: number;
  bestVideo: TargetChannel["bestVideo"];
  matchedVideos: number;
}

/**
 * 공략 채널 선별: 구독자가 적은데(상한 이하) 채널 평균 조회수가 높은(하한 이상) 채널을 골라
 * 구독자 대비 파괴력 배수(평균 조회수 ÷ 구독자) 순으로 정렬한다.
 * 구독자 비공개 채널은 배수를 계산할 수 없어 제외하고 개수만 돌려준다(0명으로 보지 않는다).
 */
export function selectTargetChannels(
  candidates: TargetCandidate[],
  params: Pick<TargetSearchParams, "maxSubscribers" | "minAverageViews">,
  limit = 30
): { channels: TargetChannel[]; hiddenSubscriberExcluded: number } {
  let hiddenSubscriberExcluded = 0;
  const channels: TargetChannel[] = [];

  for (const c of candidates) {
    if (c.subscriberCount === null) {
      hiddenSubscriberExcluded += 1;
      continue;
    }
    if (c.subscriberCount > params.maxSubscribers || c.videoCount <= 0) continue;
    const averageViews = Math.round(c.viewCount / c.videoCount);
    if (averageViews < params.minAverageViews) continue;
    channels.push({
      id: c.id,
      title: c.title,
      handle: c.handle,
      thumbnailUrl: c.thumbnailUrl,
      publishedAt: c.publishedAt,
      subscriberCount: c.subscriberCount,
      viewCount: c.viewCount,
      videoCount: c.videoCount,
      averageViews,
      powerRatio: Math.round((averageViews / Math.max(c.subscriberCount, 1)) * 10) / 10,
      bestVideo: c.bestVideo,
      matchedVideos: c.matchedVideos,
    });
  }

  channels.sort((a, b) => b.powerRatio - a.powerRatio || b.averageViews - a.averageViews);
  return { channels: channels.slice(0, limit), hiddenSubscriberExcluded };
}
