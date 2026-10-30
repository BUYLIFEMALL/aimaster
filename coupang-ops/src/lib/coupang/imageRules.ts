// 쿠팡 이미지 규격 판정(외부 호출 없음 — tests/imageRules.test.mjs).
// 명세 /ko/api/products/product-creation(2026-10-31 확인): 대표 = JPG·PNG, 3MB 이하, 정사각형, 500~5000px.
// 기타(DETAIL)는 쿠팡 반려 문구(2026-10-31 실제): 「최대 10M, 최소 500&500, 최대 5000*5000」. 상세(contents) 이미지는 명세에 규격이 없어 판정하지 않는다.

export const IMAGE_MIN = 500;
export const IMAGE_MAX = 5000;
export const MAIN_MAX_BYTES = 3 * 1024 * 1024;
export const EXTRA_MAX_BYTES = 10 * 1024 * 1024;
/** 작은 대표 이미지를 보낼 때 맞추는 크기(원본은 그대로 둔다) */
export const UPSCALE_TO = 1000;

export type ImageInfo = { format: string; width: number; height: number; bytes: number };

const formatOk = (f: string) => f === "jpeg" || f === "jpg" || f === "png";
const size = (i: ImageInfo) => `${i.width}×${i.height}`;
const mb = (n: number) => `${(n / 1048576).toFixed(1)}MB`;

/** 정사각형인데 500보다 작으면 확대해서 보낼 수 있다 */
export const needsUpscale = (i: Pick<ImageInfo, "width" | "height">) => i.width === i.height && i.width > 0 && i.width < IMAGE_MIN;

export type MainJudge = { ok: true; upscale: boolean } | { ok: false; problem: string };

export function judgeMain(i: ImageInfo): MainJudge {
  if (!formatOk(i.format)) return { ok: false, problem: `대표 이미지 형식이 ${i.format}입니다. 쿠팡은 JPG·PNG만 받습니다.` };
  if (i.bytes > MAIN_MAX_BYTES) return { ok: false, problem: `대표 이미지가 ${mb(i.bytes)}입니다. 쿠팡 규격은 3MB 이하입니다.` };
  if (i.width !== i.height) return { ok: false, problem: `대표 이미지가 ${size(i)}로 정사각형이 아닙니다. 상세페이지 프로그램에서 정사각형으로 바꿔 주세요.` };
  if (i.width > IMAGE_MAX) return { ok: false, problem: `대표 이미지가 ${size(i)}입니다. 쿠팡 규격은 최대 5000×5000입니다.` };
  return { ok: true, upscale: needsUpscale(i) };
}

/** 추가 이미지: 규격을 벗어나면 빼는 사유를, 맞으면 null을 돌려준다 */
export function extraRejectReason(i: ImageInfo): string | null {
  if (!formatOk(i.format)) return `형식 ${i.format}`;
  if (i.bytes > EXTRA_MAX_BYTES) return `용량 ${mb(i.bytes)}`;
  if (i.width < IMAGE_MIN || i.height < IMAGE_MIN || i.width > IMAGE_MAX || i.height > IMAGE_MAX) return `크기 ${size(i)}`;
  return null;
}
