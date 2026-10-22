// v1.36 장면 이미지 30일 정리 — 저장소 파일을 지운 뒤 장면 기록에서 그 주소를 빼는 계산(순수 함수, 시험: tests/sceneImageCleanup.test.mjs).
// 파일: shorts-images `<회원 id>/<영상 id>-<장면>-<uuid>.<확장자>`(회원 폴더 바로 아래, 릴스 표지 `covers/`는 하위 폴더라 대상 아님).

/** v1.37 정리 결과 기록(usage_logs.action) — 회원별 1건, 메타데이터에 지운 개수·정리된 장면 번호 */
export const CLEANUP_ACTION = "cleanup_expired";

export interface CleanupCounts { videos: number; voices: number; covers: number; images: number; segments: string[] }

/** 저장소 경로(`<회원 id>/…`)를 회원별 개수로 묶는다 */
export function countByOwner(paths: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of paths) {
    const owner = p.split("/")[0];
    if (owner) out[owner] = (out[owner] ?? 0) + 1;
  }
  return out;
}

/** 종류별 회원 개수 + 회원별 정리된 장면 번호 → 회원별 기록 내용(아무것도 없는 회원은 빠짐) */
export function cleanupByOwner(parts: { videos: string[]; voices: string[]; covers: string[]; images: string[] }, segmentsByOwner: Record<string, string[]>): Record<string, CleanupCounts> {
  const c = { videos: countByOwner(parts.videos), voices: countByOwner(parts.voices), covers: countByOwner(parts.covers), images: countByOwner(parts.images) };
  const owners = new Set([...Object.keys(c.videos), ...Object.keys(c.voices), ...Object.keys(c.covers), ...Object.keys(c.images), ...Object.keys(segmentsByOwner)]);
  const out: Record<string, CleanupCounts> = {};
  for (const o of owners) {
    out[o] = { videos: c.videos[o] ?? 0, voices: c.voices[o] ?? 0, covers: c.covers[o] ?? 0, images: c.images[o] ?? 0, segments: segmentsByOwner[o] ?? [] };
  }
  return out;
}

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
