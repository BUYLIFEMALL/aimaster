// 공용 기준 코드 `collected-photo`(기준: shop-detail-page/lib/collectedPhoto.ts) — 사본은 직접 고치지 말고 기준을 고친 뒤
// `node scripts/check-shared-modules.mjs --module collected-photo --sync`.
// 2026-11-13 주인님 결정: 상품소싱이 수집한 원본 사진(다른 판매자 상품 페이지의 사진)은 참고용이다.
// 등록기는 막지 않고, 대표로 쓸 사진이 수집 원본이면 등록 직전 경고를 보여 주고 회원이 고르게 한다.
// 플랜: trending-product-finder/docs/PLAN_20261113_REFERENCE_PHOTO_COLLECT.md

export type SourceImageOrigin = "member" | "collected";

/** DB 값 정리 — 모르는 값·빈 값은 회원 사진(member)으로 본다 */
export function sourceImageOrigin(v: unknown): SourceImageOrigin {
  return v === "collected" ? "collected" : "member";
}

/** 대표로 쓸 사진이 수집 원본인가 — 합성·편집 대표사진(main_image_url)이 있으면 그것을 쓰므로 아니다 */
export function usesCollectedPhoto(p: { main_image_url?: string | null; source_image_origin?: string | null }): boolean {
  return !p.main_image_url && sourceImageOrigin(p.source_image_origin) === "collected";
}

export const COLLECTED_PHOTO_WARNING_TITLE = "⚠ 수집한 원본 사진으로 등록하려고 합니다";

export const COLLECTED_PHOTO_WARNING =
  "이 상품의 대표 사진은 상품소싱에서 다른 판매자의 상품 페이지로부터 수집한 원본입니다. 원래 판매자의 허가 없이 그대로 등록하면 저작권 침해로 신고되거나 판매가 정지될 수 있습니다. 허가를 받았거나(공급사 제공 등) 직접 권리가 있는 사진일 때만 계속하세요. 바나나 합성이나 직접 찍은 사진으로 대표사진을 바꾸면 이 안내는 나오지 않습니다.";

export const COLLECTED_PHOTO_ACK_LABEL = "원래 판매자의 허가를 받았거나 직접 권리가 있는 사진입니다(책임은 등록하는 본인에게 있습니다).";

/** 서버가 확인 없이 온 요청을 거절할 때 쓰는 문구 */
export const COLLECTED_PHOTO_ACK_REQUIRED = "수집한 원본 사진은 「허가·권리 확인」에 체크해야 등록할 수 있습니다. 화면의 안내를 확인해 주세요.";
