// 서명 그림 처리(순수 함수 — RGBA 픽셀 배열 기준). 화면에서는 canvas ImageData를 넘긴다.

/** 밝은(흰) 바탕을 투명하게. threshold 이상 밝은 픽셀은 투명, 그 아래는 남긴다. */
export function whiteToTransparent(data: Uint8ClampedArray, threshold = 230): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data);
  for (let i = 0; i < out.length; i += 4) {
    const light = (out[i] + out[i + 1] + out[i + 2]) / 3;
    if (light >= threshold) out[i + 3] = 0;
  }
  return out;
}

/** 투명하지 않은 픽셀이 있는 영역(여백 잘라내기용). 아무것도 없으면 null. */
export function opaqueBounds(data: Uint8ClampedArray, width: number, height: number, pad = 4): { x: number; y: number; w: number; h: number } | null {
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  const x = Math.max(0, minX - pad);
  const y = Math.max(0, minY - pad);
  return { x, y, w: Math.min(width, maxX + pad + 1) - x, h: Math.min(height, maxY + pad + 1) - y };
}

/** 서명 상자를 페이지 안(0~1)에 머물게 한다. */
export function clampPlace(p: { x: number; y: number; w: number; h: number }) {
  const w = Math.min(1, Math.max(0.02, p.w));
  const h = Math.min(1, Math.max(0.01, p.h));
  return { w, h, x: Math.min(1 - w, Math.max(0, p.x)), y: Math.min(1 - h, Math.max(0, p.y)) };
}
