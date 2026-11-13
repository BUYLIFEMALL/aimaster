// 공용 기준 코드 reference-photo-handoff (기준: shop-detail-page/lib/referencePhotoHandoff.ts, 사본: trending-product-finder/lib/referencePhotoHandoff.ts).
// 사본은 직접 고치지 말고 기준만 고친 뒤 `node scripts/check-shared-modules.mjs --module reference-photo-handoff --sync`.
// 2026-11-13 주인님 지정(원본 사진 참고 수집): 상품소싱 화면이 회원 브라우저(확장)로 받은 상품 원본 사진 1~3장을
// 상세페이지 「새 상품」 창으로 넘기는 약속(postMessage). 서버를 거치지 않고, 두 창 모두 상대 주소가 정확히 아래 주소이고
// 같은 작업 번호(jobId)일 때만 메시지를 받는다. 받은 사진은 참고용(출처 collected) — 등록기는 등록 직전 경고를 띄운다.
// 플랜: trending-product-finder/docs/PLAN_20261113_REFERENCE_PHOTO_COLLECT.md

export const REFERENCE_SENDER_ORIGIN = "https://trending-product-finder.buylife.xyz";
export const REFERENCE_RECEIVER_ORIGIN = "https://shop-detail-page.buylife.xyz";

export const REFERENCE_MAX_PHOTOS = 3;
/** 상세페이지 대표이미지 직접 올리기 한도와 같다 */
export const REFERENCE_PHOTO_MAX_BYTES = 10 * 1024 * 1024;

export const REFERENCE_MSG_READY = "aimaster-reference-photos-ready";
export const REFERENCE_MSG_JOB = "aimaster-reference-photos";
export const REFERENCE_MSG_RECEIVED = "aimaster-reference-photos-received";

const PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const shortText = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max) : "");

export interface ReferencePhoto { file: Blob; sourceUrl: string }
export interface ReferenceJob { jobId: string; photos: ReferencePhoto[] }

export const isReferenceJobId = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

/** 상세페이지 주소(소싱이 여는 주소)에 붙이는 작업 번호 이름 */
export const REFERENCE_JOB_PARAM = "photoJob";

/** 소싱 쪽: 상세페이지 창이 보낸 「준비됨」인지 */
export function isReferenceReady(origin: string, data: unknown, jobId: string): boolean {
  return origin === REFERENCE_RECEIVER_ORIGIN && isRecord(data) && data.type === REFERENCE_MSG_READY && data.jobId === jobId;
}

/** 소싱 쪽: 상세페이지가 사진을 받았다는 알림 */
export function readReferenceReceived(origin: string, data: unknown, jobId: string): { ok: boolean; error: string } | null {
  if (origin !== REFERENCE_RECEIVER_ORIGIN || !isRecord(data) || data.type !== REFERENCE_MSG_RECEIVED || data.jobId !== jobId) return null;
  return { ok: data.ok === true, error: shortText(data.error, 200) };
}

/**
 * 상세페이지 쪽: 소싱이 보낸 사진 메시지 검사. 맞으면 작업, 형식이 틀리면 오류 문구,
 * 다른 사이트·다른 작업·다른 종류면 null(조용히 무시).
 */
export function readReferenceJob(origin: string, data: unknown, jobId: string): ReferenceJob | { error: string } | null {
  if (origin !== REFERENCE_SENDER_ORIGIN || !isRecord(data) || data.type !== REFERENCE_MSG_JOB || data.jobId !== jobId) return null;
  if (!Array.isArray(data.photos) || !data.photos.length) return { error: "받은 사진이 없습니다." };
  if (data.photos.length > REFERENCE_MAX_PHOTOS) return { error: `사진은 ${REFERENCE_MAX_PHOTOS}장까지 받을 수 있습니다.` };
  const photos: ReferencePhoto[] = [];
  for (const ph of data.photos) {
    if (!isRecord(ph) || !(ph.file instanceof Blob)) return { error: "사진을 받지 못했습니다." };
    if (!PHOTO_TYPES.includes(ph.file.type)) return { error: "PNG·JPG·WEBP 사진만 받을 수 있습니다." };
    if (ph.file.size === 0 || ph.file.size > REFERENCE_PHOTO_MAX_BYTES) return { error: "10MB 이하 사진만 받을 수 있습니다." };
    photos.push({ file: ph.file, sourceUrl: shortText(ph.sourceUrl, 500) });
  }
  return { jobId, photos };
}
