// 공용 기준 코드 product-photo-handoff (기준: banana-canvas/src/lib/productPhotoHandoff.ts, 사본: shop-detail-page/lib/productPhotoHandoff.ts).
// 사본은 직접 고치지 말고 기준만 고친 뒤 `node scripts/check-shared-modules.mjs --module product-photo-handoff --sync`.
// 메이커 P2(2026-11-13): 상세페이지 상품 목록 「대표사진 일괄 만들기」 → 바나나 「🛍 상품 대표사진 합성」 창으로 상품·사진을 넘기고,
// 합성 결과를 상품마다 상세페이지로 돌려보내는 약속(postMessage). nukki-handoff와 같은 방식 — 서버를 거치지 않고,
// 두 창 모두 상대 주소가 정확히 아래 주소이고 같은 작업 번호(jobId)일 때만 메시지를 받는다.

export const PRODUCT_SENDER_ORIGIN = "https://shop-detail-page.buylife.xyz";
export const PRODUCT_RECEIVER_ORIGIN = "https://banana-canvas.buylife.xyz";
/** 쇼핑몰 빌더(메이커 연계 M1, 2026-11-14) — 운영 주소만. Lab(dev-mall-builder.vercel.app)은 받지 않는다 */
export const PRODUCT_MALL_ORIGIN = "https://mall-builder.buylife.xyz";
/**
 * 바나나 창을 열 수 있는 곳: 주소 값 `from=` → 그 프로그램 주소.
 * 바나나 창 하나는 열린 주소의 `from`에 맞는 한 곳에서만 작업을 받고, 결과도 그곳으로만 보낸다.
 */
export const PRODUCT_SENDERS = {
  "shop-detail": PRODUCT_SENDER_ORIGIN,
  mall: PRODUCT_MALL_ORIGIN,
} as const;
export type ProductSender = keyof typeof PRODUCT_SENDERS;
/** 보내는 프로그램이 여는 바나나 주소(이 주소로 열렸을 때만 「준비됨」을 보낸다) */
export const productBatchUrl = (from: ProductSender) => `${PRODUCT_RECEIVER_ORIGIN}/batch?mode=product&from=${from}`;
export const PRODUCT_BATCH_URL = productBatchUrl("shop-detail");
/** 바나나 쪽: 주소 값 `from`이 정해 둔 곳이면 그 주소, 아니면 null(작업을 받지 않음) */
export function productSenderOrigin(from: string | null | undefined): string | null {
  return from && Object.prototype.hasOwnProperty.call(PRODUCT_SENDERS, from) ? PRODUCT_SENDERS[from as ProductSender] : null;
}

export const PRODUCT_MAX_PRODUCTS = 50;
export const PRODUCT_MAX_PHOTOS = 4; // 메인 1 + 서브 3
export const PRODUCT_PHOTO_MAX_BYTES = 25 * 1024 * 1024;
/** 상세페이지 직접 올리기 한도와 같다 */
export const PRODUCT_RESULT_MAX_BYTES = 10 * 1024 * 1024;

export const PRODUCT_MSG_READY = "aimaster-product-photos-ready";
export const PRODUCT_MSG_JOB = "aimaster-product-photos";
export const PRODUCT_MSG_RESULT = "aimaster-product-photos-result";
export const PRODUCT_MSG_SAVED = "aimaster-product-photos-saved";

const PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const RESULT_TYPES = ["image/png", "image/jpeg"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const shortText = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max) : "");

export interface HandoffPhoto { role: "main" | "sub"; ref: string; file: Blob }
export interface HandoffProduct { productId: string; label: string; baseRevision: string; photos: HandoffPhoto[] }
export interface HandoffJob { jobId: string; products: HandoffProduct[] }

export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

/** 받는 창(바나나)이 보낸 「준비됨」인지(상세페이지 쪽 검사) */
export function isProductReady(origin: string, data: unknown): boolean {
  return origin === PRODUCT_RECEIVER_ORIGIN && isRecord(data) && data.type === PRODUCT_MSG_READY;
}

/**
 * 바나나 쪽: 보낸 프로그램(기본 상세페이지, `expectedOrigin`으로 쇼핑몰 등)의 작업 메시지 검사.
 * 맞으면 작업, 형식이 틀리면 오류 문구, 다른 사이트에서 온 메시지나 다른 종류면 null(조용히 무시).
 */
export function readProductJob(origin: string, data: unknown, expectedOrigin: string = PRODUCT_SENDER_ORIGIN): HandoffJob | { error: string } | null {
  if (origin !== expectedOrigin || !isRecord(data) || data.type !== PRODUCT_MSG_JOB) return null;
  if (!isUuid(data.jobId)) return { error: "작업 번호가 올바르지 않습니다." };
  if (!Array.isArray(data.products) || !data.products.length) return { error: "받은 상품이 없습니다." };
  if (data.products.length > PRODUCT_MAX_PRODUCTS) return { error: `한 번에 ${PRODUCT_MAX_PRODUCTS}개 상품까지 보낼 수 있습니다.` };
  const products: HandoffProduct[] = [];
  const seen = new Set<string>();
  for (const p of data.products) {
    if (!isRecord(p) || !isUuid(p.productId)) return { error: "상품 번호가 올바르지 않습니다." };
    if (seen.has(p.productId)) return { error: "같은 상품이 두 번 들어 있습니다." };
    seen.add(p.productId);
    const label = shortText(p.label, 100) || "상품";
    const baseRevision = shortText(p.baseRevision, 40);
    if (!baseRevision) return { error: `「${label}」의 수정 시각이 없습니다.` };
    if (!Array.isArray(p.photos) || !p.photos.length || p.photos.length > PRODUCT_MAX_PHOTOS) return { error: `「${label}」 사진은 1~${PRODUCT_MAX_PHOTOS}장이어야 합니다.` };
    const photos: HandoffPhoto[] = [];
    for (const ph of p.photos) {
      if (!isRecord(ph) || (ph.role !== "main" && ph.role !== "sub")) return { error: `「${label}」 사진 역할이 올바르지 않습니다.` };
      if (!(ph.file instanceof Blob)) return { error: `「${label}」 사진을 받지 못했습니다.` };
      if (!PHOTO_TYPES.includes(ph.file.type)) return { error: `「${label}」: PNG·JPG·WEBP 사진만 받을 수 있습니다.` };
      if (ph.file.size === 0 || ph.file.size > PRODUCT_PHOTO_MAX_BYTES) return { error: `「${label}」: 25MB 이하 사진만 넣을 수 있습니다.` };
      photos.push({ role: ph.role, ref: shortText(ph.ref, 300), file: ph.file });
    }
    if (photos.filter((x) => x.role === "main").length !== 1 || photos[0].role !== "main") return { error: `「${label}」: 메인 사진은 맨 앞 한 장이어야 합니다.` };
    products.push({ productId: p.productId, label, baseRevision, photos });
  }
  return { jobId: data.jobId, products };
}

/** 상세페이지 쪽: 바나나가 돌려보낸 결과 검사(같은 작업·보낸 상품만) */
export function readProductResult(origin: string, data: unknown, jobId: string, productIds: ReadonlySet<string>):
  { productId: string; file: Blob; settingsVersion: string } | { error: string; productId?: string } | null {
  if (origin !== PRODUCT_RECEIVER_ORIGIN || !isRecord(data) || data.type !== PRODUCT_MSG_RESULT || data.jobId !== jobId) return null;
  if (!isUuid(data.productId) || !productIds.has(data.productId)) return { error: "이번 작업에서 보낸 상품이 아닙니다." };
  const file = data.file;
  if (!(file instanceof Blob) || !RESULT_TYPES.includes(file.type)) return { error: "PNG·JPG 결과만 받을 수 있습니다.", productId: data.productId };
  if (file.size === 0 || file.size > PRODUCT_RESULT_MAX_BYTES) return { error: "결과가 10MB를 넘습니다.", productId: data.productId };
  return { productId: data.productId, file, settingsVersion: shortText(data.settingsVersion, 40) };
}

/** 바나나 쪽: 보낸 프로그램(기본 상세페이지)의 저장 결과 알림 검사 */
export function readProductSaved(origin: string, data: unknown, jobId: string, expectedOrigin: string = PRODUCT_SENDER_ORIGIN): { productId: string; ok: boolean; error: string } | null {
  if (origin !== expectedOrigin || !isRecord(data) || data.type !== PRODUCT_MSG_SAVED || data.jobId !== jobId || !isUuid(data.productId)) return null;
  return { productId: data.productId, ok: data.ok === true, error: shortText(data.error, 200) };
}
