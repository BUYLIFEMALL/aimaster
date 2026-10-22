// F5(v1.27): 원본↔생성 비교 슬라이더 위치 계산 — 순수 함수(시험 대상)

/** 화면 x 좌표를 상자 안 비율(0~100, 소수 첫째 자리)로 바꾼다. 상자 밖이면 끝에 붙인다 */
export function percentAt(clientX: number, left: number, width: number): number {
  if (!(width > 0)) return 50;
  const p = ((clientX - left) / width) * 100;
  return Math.round(Math.min(100, Math.max(0, p)) * 10) / 10;
}

/** 키보드 이동: ←/→ 2칸, Shift와 함께 10칸, Home/End 끝으로. 해당 키가 아니면 null */
export function percentForKey(current: number, key: string, shift = false): number | null {
  const step = shift ? 10 : 2;
  if (key === "ArrowLeft") return Math.max(0, current - step);
  if (key === "ArrowRight") return Math.min(100, current + step);
  if (key === "Home") return 0;
  if (key === "End") return 100;
  return null;
}

/**
 * v1.29 색 집게: 틀(frameW×frameH) 안 비율 위치(xPct·yPct, 0~100)를, 틀 안에 잘리지 않게 맞춰 그린(object-contain)
 * 이미지(imgW×imgH)의 픽셀 좌표로 바꾼다. 그림이 없는 여백이면 null
 */
export function containPoint(frameW: number, frameH: number, imgW: number, imgH: number, xPct: number, yPct: number): { x: number; y: number } | null {
  if (!(frameW > 0 && frameH > 0 && imgW > 0 && imgH > 0)) return null;
  const scale = Math.min(frameW / imgW, frameH / imgH);
  const drawW = imgW * scale;
  const drawH = imgH * scale;
  const fx = (xPct / 100) * frameW - (frameW - drawW) / 2;
  const fy = (yPct / 100) * frameH - (frameH - drawH) / 2;
  if (fx < 0 || fy < 0 || fx > drawW || fy > drawH) return null;
  return { x: Math.min(imgW - 1, Math.floor(fx / scale)), y: Math.min(imgH - 1, Math.floor(fy / scale)) };
}

/** RGB → #RRGGBB(대문자) */
export function toHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();
}

/** 두 색의 차이(0 = 같음, 100 = 검정↔흰색), 소수 첫째 자리 */
export function colorDiffPercent(a: [number, number, number], b: [number, number, number]): number {
  const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  return Math.round((d / Math.hypot(255, 255, 255)) * 1000) / 10;
}
