import type { ShortVideo, ViralGrade } from "@/types/svs";

/** ISO 8601 길이(PT1M30S) → 초 */
export function parseIsoDuration(value: string | undefined): number {
  if (!value) return 0;
  const m = value.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
}

export function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || Number.isNaN(totalSeconds)) return "0:00";
  const m = Math.floor(totalSeconds / 60);
  const s = Math.round(totalSeconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return "비공개";
  if (num >= 100000000) return `${(num / 100000000).toFixed(1)}억`;
  if (num >= 10000) return `${(num / 10000).toFixed(1)}만`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}천`;
  return num.toLocaleString();
}

/** 조회수 ÷ 구독자 기준 등급 (구독자 비공개/0이면 판정불가) */
export function gradeOf(vsRatio: number | null): ViralGrade {
  if (vsRatio === null) return "판정불가";
  if (vsRatio >= 10) return "초대박";
  if (vsRatio >= 5) return "대박";
  if (vsRatio >= 3) return "떡상";
  if (vsRatio >= 1) return "양호";
  return "보통";
}

export const GRADE_STYLE: Record<ViralGrade, string> = {
  초대박: "bg-rose-600 text-white",
  대박: "bg-orange-500 text-white",
  떡상: "bg-amber-400 text-amber-950",
  양호: "bg-emerald-100 text-emerald-800",
  보통: "bg-neutral-100 text-neutral-600",
  판정불가: "bg-neutral-100 text-neutral-400",
};

interface RawVideo {
  id: string;
  snippet: {
    title: string;
    channelId: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails?: { medium?: { url: string }; default?: { url: string } };
  };
  statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
  contentDetails?: { duration?: string };
}

interface RawChannel {
  statistics?: {
    subscriberCount?: string;
    viewCount?: string;
    videoCount?: string;
    hiddenSubscriberCount?: boolean;
  };
}

/** 영상 + 채널 실측값으로 떡상 지표를 계산합니다. (가짜 값 없음) */
export function buildShortVideo(video: RawVideo, channel: RawChannel | undefined, now = new Date()): ShortVideo {
  const stats = video.statistics ?? {};
  const chStats = channel?.statistics;

  const views = Number(stats.viewCount || 0);
  const likes = Number(stats.likeCount || 0);
  const comments = Number(stats.commentCount || 0);

  const subsHidden = !chStats || chStats.hiddenSubscriberCount === true;
  const subsNum = Number(chStats?.subscriberCount || 0);
  const subs = subsHidden || subsNum <= 0 ? null : subsNum;
  const vsRatio = subs ? views / subs : null;

  const chViews = Number(chStats?.viewCount || 0);
  const chVideoCount = Math.max(Number(chStats?.videoCount || 1), 1);
  const chAvg = chViews / chVideoCount;
  const outlier = chAvg > 0 ? views / chAvg : 1;

  const publishedAt = new Date(video.snippet.publishedAt);
  const hours = Math.max((now.getTime() - publishedAt.getTime()) / 3600000, 1);
  const viewsPerDay = (views / hours) * 24;
  const engRate = views > 0 ? ((likes + comments) / views) * 100 : 0;

  const normOutlier = Math.min(outlier / 10, 1) * 100;
  const normVs = Math.min((vsRatio ?? 0) / 5, 1) * 100;
  const normVelocity = Math.min(viewsPerDay / 100000, 1) * 100;
  const normEng = Math.min(engRate / 10, 1) * 100;
  const normFresh = Math.max(100 - (hours / 24) * 2, 0);
  const viralScore = Math.round(
    normOutlier * 0.3 + normVs * 0.25 + normVelocity * 0.2 + normEng * 0.15 + normFresh * 0.1,
  );

  return {
    id: video.id,
    title: video.snippet.title,
    channelId: video.snippet.channelId,
    channelName: video.snippet.channelTitle,
    thumbnail: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url || "",
    publishedAt: video.snippet.publishedAt,
    durationSec: parseIsoDuration(video.contentDetails?.duration),
    views,
    likes,
    comments,
    subs,
    vsRatio,
    viewsPerDay,
    outlier,
    engRate,
    viralScore,
    grade: gradeOf(vsRatio),
  };
}
