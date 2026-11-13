// 메이커 P2(2026-11-13) 상품 「대표사진」 칸 규칙 — 순수 함수(시험: tests/mainPhoto.test.mjs, `node --test tests/`).
// 대표사진 파일은 <회원id>/products/<상품id>/main/ 아래에만 둔다 → 30일 정리(cleanup-generated)가 상품과 함께 지운다.

export const MAIN_PHOTO_HISTORY_MAX = 10;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 대표사진 파일을 둘 폴더(버킷 안 경로) */
export function mainPhotoFolder(userId: string, productId: string): string {
  return `${userId}/products/${productId}/main/`;
}

/** 이 회원·이 상품의 대표사진 폴더 안 파일인지(다른 회원·다른 상품·상위 폴더 이동 거절) */
export function isOwnMainPhotoPath(path: string | null, userId: string, productId: string): boolean {
  if (!path || !UUID.test(userId) || !UUID.test(productId)) return false;
  const folder = mainPhotoFolder(userId, productId);
  if (!path.startsWith(folder)) return false;
  const name = path.slice(folder.length);
  return /^[0-9a-f-]{36}\.(jpg|jpeg|png)$/i.test(name);
}

/** 새 대표사진을 이력 맨 뒤에 넣고, 최대 개수를 넘으면 오래된 것부터 뺀다(뺀 것은 파일도 지움) */
export function nextMainHistory(prev: readonly string[] | null | undefined, url: string, max = MAIN_PHOTO_HISTORY_MAX): { list: string[]; dropped: string[] } {
  const list = [...(prev ?? []).filter((u) => u !== url), url];
  const cut = Math.max(0, list.length - max);
  return { list: list.slice(cut), dropped: list.slice(0, cut) };
}

/** 등록기·목록 화면이 쓸 대표사진: 합성 대표사진이 있으면 그것, 없으면 원본 사진 */
export function representativePhoto(p: { main_image_url?: string | null; source_image_url?: string | null }): string | null {
  return p.main_image_url || p.source_image_url || null;
}

/** 작업을 보낸 뒤 상품이 바뀌었는지(수정 시각 비교, 형식 차이는 시각으로 비교) */
export function isStale(baseRevision: string, currentUpdatedAt: string): boolean {
  const a = Date.parse(baseRevision), b = Date.parse(currentUpdatedAt);
  if (Number.isFinite(a) && Number.isFinite(b)) return a !== b;
  return baseRevision !== currentUpdatedAt;
}
