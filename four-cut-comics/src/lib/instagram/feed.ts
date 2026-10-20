// v1.17 인스타 직접 게시 — 순수 함수(자동 검사용). 플랜: docs/PLAN_20261020_INSTA_DIRECT_POST.md
// 인스타 피드는 세로 4:5 ~ 가로 1.91:1만 받는다. 4컷 그림은 자르면 컷·말풍선이 잘리므로 흰 여백을 붙여 비율 안으로 맞춘다.
export const MAX_INSTA_PHOTOS = 10;
export const MAX_INSTA_CAPTION = 2200;
export const MIN_FEED_RATIO = 4 / 5;
export const MAX_FEED_RATIO = 1.91;
/** 올릴 그림 긴 변 최대(px) — 인스타 권장 1080~1440 */
export const MAX_EDGE = 1440;

export interface FeedPad { width: number; height: number; dx: number; dy: number; dw: number; dh: number }

/** 원본 크기 → 여백을 붙인 판 크기와 그림 위치(긴 변 MAX_EDGE 이하로 줄임). 비율 안이면 여백 없음 */
export function feedPad(w: number, h: number): FeedPad {
  let W = w, H = h;
  const r = w / h;
  if (r < MIN_FEED_RATIO) W = Math.ceil(h * MIN_FEED_RATIO);      // 너무 세로로 김 → 좌우 여백
  else if (r > MAX_FEED_RATIO) H = Math.ceil(w / MAX_FEED_RATIO); // 너무 가로로 김 → 위아래 여백
  const s = Math.min(1, MAX_EDGE / Math.max(W, H));
  const width = Math.round(W * s), height = Math.round(H * s);
  const dw = Math.round(w * s), dh = Math.round(h * s);
  return { width, height, dx: Math.round((width - dw) / 2), dy: Math.round((height - dh) / 2), dw, dh };
}

/** 임시 경로는 회원 본인 fourcut-insta 폴더의 .jpg 1~10장만 */
export function validInstaPaths(userId: string, paths: string[]): boolean {
  const prefix = `${userId}/fourcut-insta/`;
  return paths.length >= 1 && paths.length <= MAX_INSTA_PHOTOS && paths.every((p) => p.startsWith(prefix) && !p.includes("..") && /\.jpg$/.test(p));
}
