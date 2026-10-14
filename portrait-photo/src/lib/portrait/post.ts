// 생성 결과 후처리의 순수 계산(캔버스 없이 테스트 가능). 실제 그리기는 canvas.ts(클라이언트)가 한다.

export interface WhitenResult { changed: number; ratio: number }

/**
 * 가장자리에서 시작해 밝고 채도가 낮은 픽셀로 이어진 영역(= 배경)만 순백(255,255,255)으로 칠한다.
 * 안쪽의 밝은 옷·피부는 가장자리와 이어지지 않으면 건드리지 않는다.
 * data는 RGBA(Uint8ClampedArray)이며 제자리에서 바뀐다.
 */
export function whitenBackground(data: Uint8ClampedArray, width: number, height: number, threshold = 205, maxSat = 0.35): WhitenResult {
  const total = width * height;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const isBg = (idx: number): boolean => {
    const o = idx * 4;
    const r = data[o], g = data[o + 1], b = data[o + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    const max = Math.max(r, g, b);
    const sat = max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
    return luma >= threshold && sat <= maxSat;
  };
  const push = (idx: number) => {
    if (!visited[idx] && isBg(idx)) { visited[idx] = 1; queue[tail++] = idx; }
  };

  for (let x = 0; x < width; x++) { push(x); push((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { push(y * width); push(y * width + width - 1); }

  while (head < tail) {
    const cur = queue[head++];
    const cx = cur % width;
    const cy = (cur - cx) / width;
    if (cx > 0) push(cur - 1);
    if (cx < width - 1) push(cur + 1);
    if (cy > 0) push(cur - width);
    if (cy < height - 1) push(cur + width);
  }

  for (let i = 0; i < tail; i++) {
    const o = queue[i] * 4;
    data[o] = 255; data[o + 1] = 255; data[o + 2] = 255; data[o + 3] = 255;
  }
  return { changed: tail, ratio: total ? tail / total : 0 };
}

export interface CropRect { sx: number; sy: number; sw: number; sh: number }

/** 목표 비율로 꽉 채우도록 자를 영역(가로가 넓으면 좌우를, 세로가 길면 아래쪽을 더 잘라 머리 여백을 지킨다) */
export function coverCrop(srcW: number, srcH: number, targetW: number, targetH: number, topBias = 0.15): CropRect {
  const tr = targetW / targetH;
  const sr = srcW / srcH;
  if (sr > tr) {
    const sw = Math.round(srcH * tr);
    return { sx: Math.round((srcW - sw) / 2), sy: 0, sw, sh: srcH };
  }
  const sh = Math.round(srcW / tr);
  return { sx: 0, sy: Math.round((srcH - sh) * topBias), sw: srcW, sh };
}

/** 긴 변이 maxEdge를 넘지 않게 줄인 크기(확대는 하지 않는다) */
export function fitWithin(w: number, h: number, maxEdge: number): { width: number; height: number } {
  const longest = Math.max(w, h);
  if (longest <= maxEdge) return { width: w, height: h };
  const k = maxEdge / longest;
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) };
}

/** 해상도 이름 → 다운로드 긴 변(px) */
export function edgeFor(resolution: "1K" | "2K" | "4K"): number {
  return resolution === "1K" ? 1024 : resolution === "2K" ? 2048 : 4096;
}

/** 밝기·노출·대비(−50~50)를 CSS/canvas filter 문자열로 */
export function toneFilter(brightness: number, exposure: number, contrast: number): string {
  const clamp = (n: number) => Math.max(-50, Math.min(50, Number.isFinite(n) ? n : 0));
  return `brightness(${(100 + clamp(brightness) + clamp(exposure)) / 100}) contrast(${(100 + clamp(contrast)) / 100})`;
}

export const LICENSE = { width: 413, height: 531, maxBytes: 250 * 1024 } as const;

export interface SizePreset { id: string; label: string; width: number; height: number; maxBytes: number; note: string }

/** 자주 쓰는 증명사진 규격(300dpi 환산 픽셀). 제출 기관의 요구 사항이 우선이므로 통과를 보장하지 않는다. */
export const SIZE_PRESETS: SizePreset[] = [
  { id: "passport", label: "여권·주민등록증·운전면허 (3.5×4.5cm)", width: 413, height: 531, maxBytes: 250 * 1024, note: "413×531px · 250KB 이하" },
  { id: "resume", label: "이력서·반명함 증명사진 (3×4cm)", width: 354, height: 472, maxBytes: 250 * 1024, note: "354×472px · 250KB 이하" },
  { id: "china-visa", label: "중국 비자 (33×48mm, 자료 간 차이 있음)", width: 380, height: 553, maxBytes: 120 * 1024, note: "380×553px · 120KB 이하" },
  { id: "us-visa", label: "미국 비자 (2×2인치 정사각)", width: 600, height: 600, maxBytes: 240 * 1024, note: "600×600px · 240KB 이하" },
  { id: "print-hires", label: "인화용 고해상도 (3×4cm, 600dpi)", width: 709, height: 945, maxBytes: 400 * 1024, note: "709×945px · 400KB 이하" },
]

export function sizePresetById(id: string): SizePreset {
  return SIZE_PRESETS.find((p) => p.id === id) ?? SIZE_PRESETS[0];
}

/** 같은 시간에 만드는 후보 수의 범위(비용·시간 때문에 4장까지) */
export const MAX_CANDIDATES = 4;
export function clampCandidates(n: number): number {
  return Math.max(1, Math.min(MAX_CANDIDATES, Math.round(Number.isFinite(n) ? n : 1)));
}
