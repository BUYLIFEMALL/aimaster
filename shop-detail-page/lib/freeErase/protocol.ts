// 공용 기준 코드 `browser-free-erase` — 화면·작업자 공용 형식과 순수 함수(시험 대상)
// 근거: banana-canvas/docs/IMPROVEMENT_HANDOFF_20261024_CLEARPIC.md §7(사전 검증 페이지 결과)
// 모델은 공개 오픈소스(Apache-2.0)를 커밋 고정 주소에서 회원 브라우저가 직접 받아 Cache API에 저장한다(서버·키·비용 없음).

const LAMA_COMMIT = "c3c0c9e468934d62e79c329e35d82dd09ff8c444";
const OCR_COMMIT = "1cfba2e90fc938db55889873735088de210cc173";
export const FREE_ERASE_MODELS = {
  lama: {
    url: `https://huggingface.co/Carve/LaMa-ONNX/resolve/${LAMA_COMMIT}/lama_fp32.onnx`,
    bytes: 208_044_816,
    license: "Apache-2.0 · LaMa(Samsung Research) · ONNX 변환 Carve",
    page: "https://huggingface.co/Carve/LaMa-ONNX",
  },
  det: {
    url: `https://huggingface.co/SWHL/RapidOCR/resolve/${OCR_COMMIT}/PP-OCRv4/ch_PP-OCRv4_det_infer.onnx`,
    bytes: 4_745_517,
    license: "Apache-2.0 · PaddleOCR PP-OCRv4(Baidu) · ONNX 변환 RapidOCR",
    page: "https://huggingface.co/SWHL/RapidOCR",
  },
} as const;
/** 캐시 이름에 모델 커밋을 넣어, 모델을 바꾸면 새로 받게 한다 */
export const FREE_ERASE_CACHE = `free-erase-${LAMA_COMMIT.slice(0, 7)}-${OCR_COMMIT.slice(0, 7)}`;
export const LAMA_SIZE = 512;
/** 마스크 넓히기 기본값(512 기준 픽셀) — 가장자리가 남으면 LaMa가 형체를 다시 그린다(§7 ③-1) */
export const MASK_DILATE = 3;
/** 한 번에 계산할 칠한 덩어리의 최대 변(원본 픽셀) — 여유 0.3배를 더해도 작업 영역이 약 600px로 512에 가깝다 */
export const MAX_PIECE = 384;
/** 글자 확률맵에서 글자로 보는 기준·너무 작은 덩어리 제외·상자 넓히기(원본 픽셀) */
export const DET_THRESHOLD = 0.3;
export const DET_MIN_AREA = 20;
export const DET_LIMIT_SIDE = 960;

export type ModelKind = keyof typeof FREE_ERASE_MODELS;
export type Backend = "webgpu" | "wasm";
export interface Box { x: number; y: number; w: number; h: number }

export type WorkerIn =
  | { type: "load"; model: ModelKind; threads: number }
  | { type: "erase"; id: number; threads: number; image: Float32Array; mask: Float32Array }
  | { type: "detect"; id: number; threads: number; input: Float32Array; width: number; height: number };
export type WorkerOut =
  | { type: "progress"; model: ModelKind; loaded: number; total: number }
  | { type: "ready"; model: ModelKind; backend: Backend }
  | { type: "erased"; id: number; rgb: Float32Array }
  | { type: "detected"; id: number; prob: Float32Array; width: number; height: number }
  | { type: "error"; id?: number; model?: ModelKind; message: string };

/** 그림 알파(또는 회색값) → 0/1 마스크. 0보다 크면 지울 곳(흐린 가장자리 포함) */
export function binarizeMask(values: ArrayLike<number>, stride = 1, offset = 0): Uint8Array {
  const n = Math.floor((values.length - offset + stride - 1) / stride);
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = values[offset + i * stride] > 0 ? 1 : 0;
  return out;
}

/** 마스크를 r픽셀 넓힌다(정사각 이웃, 가로·세로 두 번에 나눠 계산) */
export function dilateMask(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
  if (r <= 0) return mask.slice();
  const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    let last = -1e9;
    for (let x = 0; x < w; x++) { if (mask[y * w + x]) last = x; if (x - last <= r) tmp[y * w + x] = 1; }
    last = 1e9;
    for (let x = w - 1; x >= 0; x--) { if (mask[y * w + x]) last = x; if (last - x <= r) tmp[y * w + x] = 1; }
  }
  for (let x = 0; x < w; x++) {
    let last = -1e9;
    for (let y = 0; y < h; y++) { if (tmp[y * w + x]) last = y; if (y - last <= r) out[y * w + x] = 1; }
    last = 1e9;
    for (let y = h - 1; y >= 0; y--) { if (tmp[y * w + x]) last = y; if (last - y <= r) out[y * w + x] = 1; }
  }
  return out;
}

/** 마스크가 칠해진 범위. 없으면 null */
export function maskBounds(mask: Uint8Array, w: number, h: number): Box | null {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mask[y * w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/**
 * 지울 범위 주변을 넉넉히 포함한 정사각형 작업 영역(512로 줄여 계산).
 * 주변 배경을 충분히 봐야 자연스럽게 채우므로 범위의 절반(최소 32px)만큼 넓히고, 그림 밖으로는 나가지 않게 맞춘다.
 */
export function workRegion(b: Box, imgW: number, imgH: number): Box {
  // 여유를 크게 잡으면 큰 덩어리일 때 작업 영역이 그림 전체가 되어 512로 크게 줄어든다(큰 제목 잔상, 2026-10-24 운영 확인) → 0.3배
  const pad = Math.max(24, Math.round(Math.max(b.w, b.h) * 0.3));
  let side = Math.max(b.w, b.h) + pad * 2;
  side = Math.min(side, Math.max(imgW, imgH));
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const w = Math.min(side, imgW), h = Math.min(side, imgH);
  const x = Math.round(Math.min(Math.max(0, cx - w / 2), imgW - w));
  const y = Math.round(Math.min(Math.max(0, cy - h / 2), imgH - h));
  return { x, y, w: Math.round(w), h: Math.round(h) };
}

/**
 * 칠한 곳을 떨어진 덩어리로 나눈다(cell 픽셀 격자로 줄여 8방향으로 이어 붙임) — 덩어리마다 따로 512로 계산해야
 * 멀리 떨어진 글자 여러 곳을 한 번에 줄여 계산할 때보다 해상도가 덜 떨어진다
 */
export function maskClusters(mask: Uint8Array, w: number, h: number, cell = 16, maxPiece = MAX_PIECE): Box[] {
  const gw = Math.ceil(w / cell), gh = Math.ceil(h / cell), grid = new Uint8Array(gw * gh);
  for (let y = 0; y < h; y++) { const row = y * w, gy = ((y / cell) | 0) * gw; for (let x = 0; x < w; x++) if (mask[row + x]) grid[gy + ((x / cell) | 0)] = 1; }
  const seen = new Uint8Array(gw * gh), out: Box[] = [], st: number[] = [];
  for (let i = 0; i < grid.length; i++) {
    if (!grid[i] || seen[i]) continue;
    let x0 = gw, y0 = gh, x1 = -1, y1 = -1; st.push(i); seen[i] = 1;
    while (st.length) {
      const c = st.pop()!, cx = c % gw, cy = (c - cx) / gw;
      if (cx < x0) x0 = cx; if (cx > x1) x1 = cx; if (cy < y0) y0 = cy; if (cy > y1) y1 = cy;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
        const n = ny * gw + nx; if (grid[n] && !seen[n]) { seen[n] = 1; st.push(n); }
      }
    }
    const bx = x0 * cell, by = y0 * cell;
    out.push(...splitBox({ x: bx, y: by, w: Math.min(w, (x1 + 1) * cell) - bx, h: Math.min(h, (y1 + 1) * cell) - by }, maxPiece));
  }
  return out;
}

/** 긴 덩어리를 maxPiece 이하 조각으로 나눈다(가로·세로 각각 같은 크기로) — 조각마다 512에 가깝게 계산해 해상도를 지킨다 */
export function splitBox(b: Box, maxPiece = MAX_PIECE): Box[] {
  const nx = Math.max(1, Math.ceil(b.w / maxPiece)), ny = Math.max(1, Math.ceil(b.h / maxPiece));
  if (nx === 1 && ny === 1) return [b];
  const out: Box[] = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x0 = b.x + Math.round((b.w * i) / nx), x1 = b.x + Math.round((b.w * (i + 1)) / nx);
    const y0 = b.y + Math.round((b.h * j) / ny), y1 = b.y + Math.round((b.h * (j + 1)) / ny);
    out.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
  }
  return out;
}

/** 글자 찾기 입력 크기 — 긴 변을 limit 안으로 줄이고 32의 배수로 맞춘다 */
export function detInputSize(w: number, h: number, limit = DET_LIMIT_SIDE): { width: number; height: number } {
  const s = Math.min(1, limit / Math.max(w, h));
  const r = (v: number) => Math.max(32, Math.round((v * s) / 32) * 32);
  return { width: r(w), height: r(h) };
}

/** 글자 확률맵 → 상자 목록(맵 좌표). 기준 이상인 칸을 4방향으로 이어 덩어리마다 상자 하나 */
export function probToBoxes(prob: ArrayLike<number>, w: number, h: number, threshold = DET_THRESHOLD, minArea = DET_MIN_AREA): Box[] {
  const seen = new Uint8Array(w * h), boxes: Box[] = [], stack: number[] = [];
  for (let i = 0; i < w * h; i++) {
    if (seen[i] || prob[i] <= threshold) continue;
    let x0 = w, y0 = h, x1 = -1, y1 = -1, n = 0;
    stack.push(i); seen[i] = 1;
    while (stack.length) {
      const p = stack.pop()!, px = p % w, py = (p - px) / w; n++;
      if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
      if (px > 0 && !seen[p - 1] && prob[p - 1] > threshold) { seen[p - 1] = 1; stack.push(p - 1); }
      if (px < w - 1 && !seen[p + 1] && prob[p + 1] > threshold) { seen[p + 1] = 1; stack.push(p + 1); }
      if (py > 0 && !seen[p - w] && prob[p - w] > threshold) { seen[p - w] = 1; stack.push(p - w); }
      if (py < h - 1 && !seen[p + w] && prob[p + w] > threshold) { seen[p + w] = 1; stack.push(p + w); }
    }
    if (n >= minArea) boxes.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 });
  }
  return boxes;
}

/** 맵 좌표 상자 → 원본 좌표로 늘리고 둘레를 넓힌다. 이 모델은 글자보다 줄어든 영역을 내므로(원래 쓰는 곳은 1.5~2배로 넓힘) 높이의 절반씩 넓혀 테두리·그림자까지 덮는다 */
export function scaleBoxes(boxes: Box[], fromW: number, fromH: number, toW: number, toH: number, grow = 0.5): Box[] {
  const sx = toW / fromW, sy = toH / fromH;
  return boxes.map((b) => {
    const g = Math.max(4, Math.round(b.h * sy * grow));
    const x = Math.max(0, Math.floor(b.x * sx) - g), y = Math.max(0, Math.floor(b.y * sy) - g);
    return { x, y, w: Math.min(toW, Math.ceil((b.x + b.w) * sx) + g) - x, h: Math.min(toH, Math.ceil((b.y + b.h) * sy) + g) - y };
  });
}

/** 상자들을 마스크에 칠한다(제자리 수정, 그림 밖은 자름) — 「문구 찾기」 결과를 붓 자국에 더할 때 */
export function fillBoxes(mask: Uint8Array, w: number, h: number, boxes: Box[]): Uint8Array {
  for (const b of boxes) {
    const x0 = Math.max(0, Math.floor(b.x)), y0 = Math.max(0, Math.floor(b.y));
    const x1 = Math.min(w, Math.ceil(b.x + b.w)), y1 = Math.min(h, Math.ceil(b.y + b.h));
    for (let y = y0; y < y1; y++) mask.fill(1, y * w + x0, y * w + x1);
  }
  return mask;
}

/** 작업자 오류 → 회원에게 보여 줄 한국어 안내 */
export function freeEraseErrorText(message: string): string {
  if (/^download:|Failed to fetch|NetworkError|network/i.test(message)) return "무료 지우기 모델을 받지 못했습니다. 인터넷 연결을 확인하고 다시 시도하거나, 「AI로 다시 그리기」를 이용해 주세요.";
  if (/QuotaExceeded|quota/i.test(message)) return "브라우저 저장 공간이 부족해 모델을 저장하지 못했습니다. 이번에는 그대로 진행하지만 다음에 다시 받게 됩니다.";
  if (/memory|RangeError|Aborted|OOM|allocation/i.test(message)) return "이 기기의 메모리가 부족해 지우지 못했습니다. 다른 탭을 닫고 다시 시도하거나, 「AI로 다시 그리기」를 이용해 주세요.";
  return "무료 지우기에 실패했습니다. 다시 시도하거나, 「AI로 다시 그리기」를 이용해 주세요.";
}
