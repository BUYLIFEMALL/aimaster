// v1.14 인스타 자동 포스팅 1차: 브라우저·서버 공용 순수 함수(테스트 대상).

/** 인스타그램 한 번에 올릴 수 있는 사진 수(캐러셀 최대 10장) */
export const MAX_INSTA_PHOTOS = 10;
/** 인스타그램 캡션 한도 */
export const MAX_INSTA_CAPTION = 2200;

// 인스타 피드가 받는 비율: 세로 4:5 ~ 가로 1.91:1. 벗어나면 게시가 거부되므로 가운데 기준으로 잘라 맞춘다.
const MIN_RATIO = 4 / 5;
const MAX_RATIO = 1.91;

/** 원본 크기에서 피드 허용 비율로 잘라낼 영역(가운데 기준). 이미 범위 안이면 원본 전체 */
export function feedCrop(w: number, h: number): { sx: number; sy: number; sw: number; sh: number } {
  const ratio = w / h;
  if (ratio < MIN_RATIO) {
    const sh = Math.round(w / MIN_RATIO);
    return { sx: 0, sy: Math.round((h - sh) / 2), sw: w, sh };
  }
  if (ratio > MAX_RATIO) {
    const sw = Math.round(h * MAX_RATIO);
    return { sx: Math.round((w - sw) / 2), sy: 0, sw, sh: h };
  }
  return { sx: 0, sy: 0, sw: w, sh: h };
}

/** 게시할 사진 고르기: 이미 고른 것이면 빼고, 아니면 끝에 붙인다(최대 10장). 고른 순서가 캐러셀 순서 */
export function togglePick(picked: string[], id: string): string[] {
  if (picked.includes(id)) return picked.filter((x) => x !== id);
  return picked.length >= MAX_INSTA_PHOTOS ? picked : [...picked, id];
}

/** 서버가 받을 임시 사진 경로: 회원 본인 폴더 `{userId}/influencer-insta/` 아래 .jpg, 1~10장 */
export function validInstaPaths(userId: string, paths: string[]): boolean {
  const prefix = `${userId}/influencer-insta/`;
  return (
    paths.length >= 1 &&
    paths.length <= MAX_INSTA_PHOTOS &&
    paths.every((p) => p.startsWith(prefix) && !p.includes("..") && /^[\w\-/]+\.jpg$/.test(p))
  );
}
