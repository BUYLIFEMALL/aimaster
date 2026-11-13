// v1.14 채널 로고·프레임(테두리) 계산 — 미리보기와 MP4가 같은 값을 쓰도록 그리기와 떼어 둔 순수 함수(시험 tests/overlay.test.ts).
// 값·모양은 이 프로그램용으로 새로 정했다(참고 앱의 값을 옮기지 않음).

/** 필름 띠 한 줄의 높이(화면 높이 비율) */
export const FILM_BAR = 0.045;

/** 필름 띠가 차지하는 위·아래 높이(픽셀). 다른 프레임은 0 */
export function filmBarHeight(frame: string, H: number): number {
  return frame === "film" ? Math.round(H * FILM_BAR) : 0;
}

/**
 * 로고를 그릴 자리. size = 화면 짧은 변 대비 로고 긴 변 비율(0.05~0.3), 비율은 원본 그대로.
 * 가장자리 여백은 짧은 변의 4%이고, 필름 띠가 있으면 띠 안쪽으로 들인다.
 */
export function logoRect(W: number, H: number, imgW: number, imgH: number, pos: number, size: number, frame = "none"): { x: number; y: number; w: number; h: number } | null {
  if (!(imgW > 0) || !(imgH > 0)) return null;
  const long = Math.min(W, H) * Math.min(0.3, Math.max(0.05, size));
  const k = long / Math.max(imgW, imgH), w = imgW * k, h = imgH * k;
  const p = Math.min(8, Math.max(0, Math.round(pos))), col = p % 3, row = Math.floor(p / 3);
  const mx = Math.min(W, H) * 0.04, my = mx + filmBarHeight(frame, H);
  const x = col === 0 ? mx : col === 1 ? (W - w) / 2 : W - mx - w;
  const y = row === 0 ? my : row === 1 ? (H - h) / 2 : H - my - h;
  return { x, y, w, h };
}
