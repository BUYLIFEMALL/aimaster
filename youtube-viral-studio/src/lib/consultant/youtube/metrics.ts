import type { AnalyzedVideo, UploadStats } from "./types";

/** ISO 8601 영상 길이(PT1M15S 등)를 초로 변환 */
export function parseDuration(durationStr?: string): number {
  if (!durationStr) return 0;
  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return (
    parseInt(match[1] || "0", 10) * 3600 +
    parseInt(match[2] || "0", 10) * 60 +
    parseInt(match[3] || "0", 10)
  );
}

/**
 * 쇼츠 판정(YouTube API는 쇼츠 여부를 따로 알려주지 않으므로 추정):
 * 60초 이하이거나, 3분(180초) 이하이면서 제목·설명·태그에 #shorts가 있으면 쇼츠로 본다.
 */
export function isShortsVideo(durationSeconds: number, text: string): boolean {
  if (durationSeconds <= 0) return false;
  if (durationSeconds <= 60) return true;
  return durationSeconds <= 180 && /#shorts?\b/i.test(text);
}

/**
 * 인기 점수(0~100): 조회수 60% + 좋아요 25% + 댓글 15%를,
 * 조회된 영상 안에서 각 항목의 최고값 대비 비율로 환산해 합친다.
 * 모든 영상이 좋아요(또는 댓글)를 비공개라서 최고값이 0이면 그 항목은 빼고 나머지 비중을 다시 나눈다.
 * 조회된 영상끼리의 상대 점수이므로 다른 검색 결과와 직접 비교하지 않는다.
 */
export function applyPopularity<T extends Omit<AnalyzedVideo, "popularity">>(videos: T[]): (T & { popularity: number })[] {
  const maxOf = (pick: (v: T) => number | null) =>
    videos.reduce((m, v) => Math.max(m, pick(v) ?? 0), 0);
  const maxViews = maxOf((v) => v.viewCount);
  const maxLikes = maxOf((v) => v.likeCount);
  const maxComments = maxOf((v) => v.commentCount);

  const parts = [
    { weight: 0.6, max: maxViews, pick: (v: T) => v.viewCount },
    { weight: 0.25, max: maxLikes, pick: (v: T) => v.likeCount ?? 0 },
    { weight: 0.15, max: maxComments, pick: (v: T) => v.commentCount ?? 0 },
  ].filter((p) => p.max > 0);
  const totalWeight = parts.reduce((s, p) => s + p.weight, 0);

  return videos.map((v) => {
    const raw =
      totalWeight > 0
        ? parts.reduce((s, p) => s + (p.weight / totalWeight) * (p.pick(v) / p.max), 0) * 100
        : 0;
    return { ...v, popularity: Math.round(raw * 10) / 10 };
  });
}

/** 업로드 간격 통계 (분석에 쓴 영상 기준) */
export function calculateUploadStats(videos: { publishedAt: string }[]): UploadStats {
  if (videos.length === 0) {
    return { averageIntervalHours: null, sinceLastUploadHours: null, oldestPublishedAt: null };
  }
  const times = videos.map((v) => new Date(v.publishedAt).getTime()).sort((a, b) => b - a);
  const newest = times[0];
  const oldest = times[times.length - 1];
  return {
    averageIntervalHours: times.length >= 2 ? (newest - oldest) / (times.length - 1) / 3600000 : null,
    sinceLastUploadHours: Math.max(0, (Date.now() - newest) / 3600000),
    oldestPublishedAt: new Date(oldest).toISOString(),
  };
}

/** 한국어 숫자 축약 (예: 3.5천, 16만, 1.2억) */
export function formatNumber(num?: number | null): string {
  if (num === undefined || num === null) return "비공개";
  if (num >= 100000000) return `${(num / 100000000).toFixed(1)}억`;
  if (num >= 10000) return `${(num / 10000).toFixed(num >= 1000000 ? 0 : 1)}만`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}천`;
  return num.toLocaleString();
}

/** 시간(소수)을 "3일 16시간" 형태로 */
export function formatHours(hours: number | null): string {
  if (hours === null) return "-";
  const total = Math.round(hours * 60);
  const d = Math.floor(total / 1440);
  const h = Math.floor((total % 1440) / 60);
  const m = total % 60;
  if (d > 0) return `${d}일 ${h}시간`;
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}`;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
