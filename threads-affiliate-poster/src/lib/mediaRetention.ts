/**
 * 미디어(이미지, 동영상) 보관 기간 및 정리 유틸
 * - 보관 기간: 등록(생성/업로드) 시점 기준 30일
 * - 30일 후 자동 정리(Cleanup) 및 사용자 수동 삭제 지원
 */

export const MEDIA_RETENTION_DAYS = 30;

export function getMediaRetentionCutoff(): Date {
  return new Date(Date.now() - MEDIA_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * post-images 버킷 공개 URL에서 storage path (예: userId/uuid.jpg) 추출
 */
export function extractStoragePathFromUrl(url: string, bucketName = "post-images"): string | null {
  if (!url) return null;
  const regex = new RegExp(`\\/storage\\/v1\\/object\\/public\\/${bucketName}\\/([^?#]+)`, "i");
  const match = url.match(regex);
  if (match && match[1]) {
    return decodeURIComponent(match[1]);
  }
  return null;
}

/**
 * URL이 동영상 파일인지 판별
 */
export function isVideoUrl(url: string): boolean {
  if (!url) return false;
  return Boolean(url.match(/\.(mp4|mov|webm)(\?.*)?$/i));
}

/**
 * 등록 시점으로부터 30일 자동 삭제까지 남은 시점 텍스트 계산
 */
export function getRemainingRetentionTime(createdAt: string | Date): {
  text: string;
  days: number;
  hours: number;
  isUrgent: boolean;
} {
  const createdTime = new Date(createdAt).getTime();
  const expiresTime = createdTime + MEDIA_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const diff = expiresTime - Date.now();

  if (diff <= 0) {
    return { text: "삭제 예정", days: 0, hours: 0, isUrgent: true };
  }

  const totalHours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days > 0) {
    return {
      text: `남은 시점: ${days}일 ${hours}시간`,
      days,
      hours,
      isUrgent: days <= 3,
    };
  }

  return {
    text: `남은 시점: ${totalHours}시간`,
    days: 0,
    hours: totalHours,
    isUrgent: true,
  };
}
