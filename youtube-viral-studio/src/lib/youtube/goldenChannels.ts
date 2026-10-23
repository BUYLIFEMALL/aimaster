import "server-only";
import { youtubeCall } from "./client";
import { runGoldenSearch, type GoldenSearchParams } from "./goldenEngine";
import type { YouTubeChannelItem } from "./types";

/**
 * 황금 채널 발굴: 계산은 공용 엔진(goldenEngine.ts — youtube-channel-consultant 「공략 채널 찾기」와 같은 파일)이 한다.
 * 이 프로그램은 결과를 카드(떡상 지수·대표 영상)로 바꿔 보여 준다. 2026-10-17 v1.17.
 */
export async function findGoldenChannels(
  params: GoldenSearchParams,
  apiKey: string
): Promise<{ items: YouTubeChannelItem[]; quotaUsed: number; scannedVideos: number; hiddenSubscriberExcluded: number }> {
  const result = await runGoldenSearch(params, (endpoint, query) => youtubeCall(endpoint, query, apiKey), 20);
  const items: YouTubeChannelItem[] = result.channels.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description ?? "",
    customUrl: c.handle,
    thumbnailUrl: c.thumbnailUrl,
    publishedAt: c.publishedAt,
    subscriberCount: c.subscriberCount,
    videoCount: c.videoCount,
    viewCount: c.viewCount,
    averageViews: c.averageViews,
    // 떡상 지수(0~100) = 구독자 대비 파괴력 배수 × 10 (예전 계산식과 같음)
    viralIndex: Math.min(100, Math.round(c.powerRatio * 10)),
    topVideo: { id: c.bestVideo.id, title: c.bestVideo.title, viewCount: c.bestVideo.viewCount, thumbnailUrl: c.bestVideo.thumbnailUrl },
  }));
  return { items, quotaUsed: result.quotaUsed, scannedVideos: result.scannedVideos, hiddenSubscriberExcluded: result.hiddenSubscriberExcluded };
}
