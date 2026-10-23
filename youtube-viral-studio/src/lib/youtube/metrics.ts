/**
 * ISO 8601 영상 길이 문자열(PT1M15S, PT45S 등)을 초 단위 정수로 변환
 */
export function parseDuration(durationStr?: string): number {
  if (!durationStr) return 0;
  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * 영상 길이가 60초 이하이면 쇼츠로 판정
 */
export function isShortsVideo(durationStr?: string, title?: string, description?: string): boolean {
  const seconds = parseDuration(durationStr);
  if (seconds > 0 && seconds <= 60) return true;
  // 태그에 #shorts 가 포함된 경우 보조 판정
  const text = `${title ?? ""} ${description ?? ""}`.toLowerCase();
  if (text.includes("#shorts") || text.includes("#short")) {
    return seconds <= 90; // 90초 이내 쇼츠 확장 지원
  }
  return false;
}

/**
 * 업로드 후 경과 시간(시간 단위 소수점)
 */
export function getHoursSincePublished(publishedAt: string): number {
  const publishedDate = new Date(publishedAt).getTime();
  const now = Date.now();
  const diffHours = (now - publishedDate) / (1000 * 60 * 60);
  return Math.max(0.2, diffHours); // 최소 12분 보정
}

/**
 * 시간당 조회수 (VPH - Views Per Hour)
 */
export function calculateVPH(views: number, publishedAt: string): number {
  const hours = getHoursSincePublished(publishedAt);
  return Math.round(views / hours);
}

/**
 * 구독자 대비 조회수 배수 (vsRatio)
 */
export function calculateVsRatio(views: number, subscribers?: number): number {
  if (!subscribers || subscribers <= 0) {
    if (views >= 100000) return 50;
    if (views >= 10000) return 20;
    return 1;
  }
  return Number((views / subscribers).toFixed(1));
}

/**
 * 종합 떡상 점수 (Viral Score 0 ~ 100점)
 */
export function calculateViralScore(params: {
  views: number;
  subscribers?: number;
  likes?: number;
  publishedAt: string;
}): { score: number; badge: "SUPER_VIRAL" | "VIRAL" | "RISING" | "NORMAL" } {
  const { views, subscribers, likes, publishedAt } = params;
  const hours = getHoursSincePublished(publishedAt);
  const vph = calculateVPH(views, publishedAt);
  const vsRatio = calculateVsRatio(views, subscribers);

  // 1. 배수 점수 (최대 35점): 50배 이상이면 만점
  const ratioScore = Math.min(35, (vsRatio / 50) * 35);

  // 2. 속도 점수 (최대 30점): VPH 10,000 이상이면 만점
  const vphScore = Math.min(30, (vph / 10000) * 30);

  // 3. 최신성 점수 (최대 15점): 24시간 이내 만점, 30일 경과시 0점
  const freshnessScore = Math.max(0, 15 * (1 - Math.min(hours, 720) / 720));

  // 4. 참여도 점수 (최대 20점): 좋아요율 5% 이상이면 만점
  const likeRate = likes && views > 0 ? likes / views : 0.02;
  const engagementScore = Math.min(20, (likeRate / 0.05) * 20);

  const totalScore = Math.round(ratioScore + vphScore + freshnessScore + engagementScore);
  const score = Math.max(5, Math.min(100, totalScore));

  let badge: "SUPER_VIRAL" | "VIRAL" | "RISING" | "NORMAL" = "NORMAL";
  if (score >= 80 || vsRatio >= 50 || vph >= 10000) {
    badge = "SUPER_VIRAL";
  } else if (score >= 65 || vsRatio >= 20 || vph >= 3000) {
    badge = "VIRAL";
  } else if (score >= 45 || vsRatio >= 5 || vph >= 800) {
    badge = "RISING";
  }

  return { score, badge };
}

/**
 * 한국어 친화형 숫자 축약 포맷터 (예: 125.4만, 1.2억)
 */
export function formatNumber(num?: number): string {
  if (num === undefined || num === null) return "0";
  if (num >= 100000000) {
    return `${(num / 100000000).toFixed(1)}억`;
  }
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1)}만`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}천`;
  }
  return num.toLocaleString();
}

/**
 * 시간당 조회수 속도 포맷터 (예: +7.5만/h, +850/h)
 */
export function formatVPH(vph: number): string {
  if (vph >= 10000) {
    return `+${(vph / 10000).toFixed(1)}만/h`;
  }
  return `+${vph.toLocaleString()}/h`;
}

/**
 * 상대 시간 포맷터 (예: 방금 전, 3시간 전, 2일 전)
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return "방금 전";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}일 전`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}개월 전`;
  return `${Math.floor(diffMonths / 12)}년 전`;
}
