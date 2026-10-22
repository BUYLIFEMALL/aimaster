// v1.35 릴스 표지 이미지(cover_url) — 회원이 올린 세로 JPG를 릴스 표지로 보낸다(예: AI 썸네일·SEO 자동화에서 받은 9:16 JPG).
// Meta 공식 조건(2026-10-22 확인): JPEG, 8MB 이하, 9:16 권장(다른 비율은 가운데 9:16만 남김), 공개 주소. cover_url이 thumb_offset보다 우선.
// shots-videos 버킷은 MP4만 허용이라, 장면 이미지와 같은 공개 버킷 shorts-images의 `<회원 id>/covers/<영상 id>.jpg`에 둔다(DB 칸 없음).
// 30일 지난 표지는 /api/cron/cleanup-videos가 지운다.

export const REEL_COVER_BUCKET = "shorts-images";
export const REEL_COVER_MAX_BYTES = 8 * 1024 * 1024;

export function reelCoverFolder(userId: string): string {
  return `${userId}/covers`;
}

export function reelCoverPath(userId: string, videoId: string): string {
  return `${reelCoverFolder(userId)}/${videoId}.jpg`;
}

/** 올리기 전 파일 확인 — 문제가 있으면 안내 문장, 괜찮으면 null */
export function checkReelCoverFile(file: { type: string; size: number }): string | null {
  if (file.type !== "image/jpeg") return "릴스 표지는 JPG 파일만 쓸 수 있습니다.";
  if (file.size <= 0) return "빈 파일입니다.";
  if (file.size > REEL_COVER_MAX_BYTES) return `릴스 표지는 8MB 이하여야 합니다. (지금 ${(file.size / 1048576).toFixed(1)}MB)`;
  return null;
}

/** 9:16이 아니면 안내(인스타가 가운데 9:16만 남김). 9:16에 가까우면 null */
export function reelCoverRatioNote(width: number, height: number): string | null {
  if (!width || !height) return null;
  return Math.abs(width / height - 9 / 16) > 0.02 ? "세로 9:16 이미지가 아니라서 인스타그램이 가운데 9:16 부분만 표지로 씁니다." : null;
}
