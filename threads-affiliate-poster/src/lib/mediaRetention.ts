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
