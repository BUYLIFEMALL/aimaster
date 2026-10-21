// v1.15(2026-10-21): shop-detail-images 버킷을 비공개로 바꾸면서, DB에 저장된 기존 공개 주소
// (`.../storage/v1/object/public/shop-detail-images/<경로>`)는 그대로 "식별자"로 두고
// 화면에는 본인 확인 후 서명 주소로 넘겨주는 /api/image 를 거쳐 보여준다(데이터 이전 없음).

export const SHOP_IMAGE_BUCKET = "shop-detail-images";

const STORAGE_PATH_RE = new RegExp(
  `/storage/v1/object/(?:public|sign|authenticated)/${SHOP_IMAGE_BUCKET}/([^?#]+)`,
);

/** 우리 버킷 주소면 버킷 안 경로(`<회원id>/products/...`)를, 아니면 null을 돌려준다. */
export function storagePathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(STORAGE_PATH_RE);
  return m ? decodeURIComponent(m[1]) : null;
}

/** <img src>에 넣을 주소. 우리 버킷 이미지는 /api/image 경유, 그 밖(data:, 외부 주소)은 그대로. */
export function imageSrc(url: string | null | undefined): string {
  if (!url) return "";
  const path = storagePathFromUrl(url);
  return path ? `/api/image?p=${encodeURIComponent(path)}` : url;
}
