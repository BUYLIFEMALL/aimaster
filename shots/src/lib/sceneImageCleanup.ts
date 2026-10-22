// v1.36 장면 이미지 30일 정리 — 저장소 파일을 지운 뒤 장면 기록에서 그 주소를 빼는 계산(순수 함수, 시험: tests/sceneImageCleanup.test.mjs).
// 파일: shorts-images `<회원 id>/<영상 id>-<장면>-<uuid>.<확장자>`(회원 폴더 바로 아래, 릴스 표지 `covers/`는 하위 폴더라 대상 아님).

export interface SegmentImages {
  image_url: string | null;
  image_urls: string[] | null;
}

/** 지운 주소를 이력에서 빼고, 선택된 이미지였으면 비운다. 바뀐 게 없으면 null */
export function pruneSegmentImages(seg: SegmentImages, removed: Set<string>): { image_url: string | null; image_urls: string[] } | null {
  const urls = seg.image_urls ?? [];
  const nextUrls = urls.filter((u) => !removed.has(u));
  const nextSelected = seg.image_url && removed.has(seg.image_url) ? null : seg.image_url;
  if (nextUrls.length === urls.length && nextSelected === seg.image_url) return null;
  return { image_url: nextSelected, image_urls: nextUrls };
}
