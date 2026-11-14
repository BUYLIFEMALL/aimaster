// 2026-11-15 주인님 결정 「상품 등록 = 발행으로 봐」 — 「바로 등록」 성공 때 「포스팅됨」으로 표시할 사진 경로 고르기(순수 함수, 시험용).
// 대표(합성 대표사진 우선)·추가(참고 사진 최대 9장)·상세 섹션 사진 중 회원 본인 폴더(`<회원>/`) 경로만, 중복 없이.

const BUCKET = "shop-detail-images";
const PATH_RE = new RegExp(`/storage/v1/object/(?:public|sign|authenticated)/${BUCKET}/([^?#]+)`);

function pathOf(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(PATH_RE);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

export function registeredPostedPaths(
  userId: string,
  product: { main_image_url?: string | null; source_image_url?: string | null; reference_image_urls?: string[] | null },
  sectionImageUrls: (string | null)[],
): string[] {
  const own = (p: string | null): p is string => Boolean(p && p.startsWith(`${userId}/`));
  const main = pathOf(product.main_image_url || product.source_image_url);
  const extras = (product.reference_image_urls ?? []).map(pathOf).filter(own).slice(0, 9);
  const sections = sectionImageUrls.map(pathOf);
  return Array.from(new Set([main, ...extras, ...sections].filter(own)));
}
