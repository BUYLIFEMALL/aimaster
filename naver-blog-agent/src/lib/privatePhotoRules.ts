export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
export const MAX_REVIEW_PHOTOS = 6;
export const PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function photoFileProblem(file: { size: number; type: string }): string | null {
  if (!PHOTO_MIME_TYPES.some(type => type === file.type)) return "JPEG, PNG, WebP 사진만 선택해 주세요.";
  if (file.size < 1 || file.size > MAX_PHOTO_BYTES) return "사진은 한 장에 4MB 이하로 선택해 주세요.";
  return null;
}
