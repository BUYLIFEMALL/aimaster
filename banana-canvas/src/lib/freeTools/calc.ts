// E5 「🧰 무료 이미지 도구」 계산(순수 함수, 시험 tests/freeTools.test.mjs) — 배경 지우기 전·후처리, 얼굴 상자, 모자이크 칸, 사진 나누기 좌표.
// 그리기·모델 실행은 브라우저(render.ts·공용 컴포넌트 browser-free-erase의 runModel)에서 한다.

export interface Rect { x: number; y: number; w: number; h: number }

/* ───────── 배경 지우기 (U²-Net 경량판, 입력 1×3×320×320) ───────── */
export const BG_SIZE = 320;
const MEAN = [0.485, 0.456, 0.406], STD = [0.229, 0.224, 0.225];

/** 320×320 RGBA → 모델 입력(채널 분리·ImageNet 정규화) */
export function bgInput(rgba: ArrayLike<number>, size = BG_SIZE): Float32Array {
  const n = size * size, out = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) out[c * n + i] = (rgba[i * 4 + c] / 255 - MEAN[c]) / STD[c];
  return out;
}

/** 모델 확률맵 → 0~255 알파(가장 낮은 값 0·가장 높은 값 255로 펼침, rembg와 같은 방식) */
export function probToAlpha(prob: ArrayLike<number>): Uint8ClampedArray {
  let mn = Infinity, mx = -Infinity;
  for (let i = 0; i < prob.length; i++) { const v = prob[i]; if (v < mn) mn = v; if (v > mx) mx = v; }
  const out = new Uint8ClampedArray(prob.length), span = mx - mn;
  if (!(span > 1e-6)) return out; // 모두 같은 값 → 찾은 물체 없음
  for (let i = 0; i < prob.length; i++) out[i] = Math.round(((prob[i] - mn) / span) * 255);
  return out;
}

/* ───────── 얼굴 찾기 (UltraFace RFB-320, 입력 1×3×240×320) ───────── */
export const FACE_W = 320, FACE_H = 240;
export const FACE_THRESHOLD = 0.7;

/** 320×240 RGBA → 모델 입력((값-127)/128) */
export function faceInput(rgba: ArrayLike<number>, w = FACE_W, h = FACE_H): Float32Array {
  const n = w * h, out = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) out[c * n + i] = (rgba[i * 4 + c] - 127) / 128;
  return out;
}

const iou = (a: Rect, b: Rect) => {
  const x0 = Math.max(a.x, b.x), y0 = Math.max(a.y, b.y), x1 = Math.min(a.x + a.w, b.x + b.w), y1 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
  return inter / (a.w * a.h + b.w * b.h - inter || 1);
};

/**
 * 점수(N×2, [배경, 얼굴])·상자(N×4, 0~1 비율의 x0,y0,x1,y1) → 원본 좌표 얼굴 상자(점수 높은 순, 겹침 제거).
 * 얼굴 주변(머리·턱)까지 가리도록 grow배만큼 넓힌다.
 */
export function faceBoxes(scores: ArrayLike<number>, boxes: ArrayLike<number>, imgW: number, imgH: number,
  { threshold = FACE_THRESHOLD, overlap = 0.3, grow = 0.15 } = {}): Rect[] {
  const cand: { s: number; r: Rect }[] = [];
  const n = Math.floor(scores.length / 2);
  for (let i = 0; i < n; i++) {
    const s = scores[i * 2 + 1];
    if (s < threshold) continue;
    const x0 = boxes[i * 4] * imgW, y0 = boxes[i * 4 + 1] * imgH, x1 = boxes[i * 4 + 2] * imgW, y1 = boxes[i * 4 + 3] * imgH;
    if (x1 <= x0 || y1 <= y0) continue;
    cand.push({ s, r: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } });
  }
  cand.sort((a, b) => b.s - a.s);
  const keep: Rect[] = [];
  for (const c of cand) if (keep.every((k) => iou(k, c.r) <= overlap)) keep.push(c.r);
  return keep.map((r) => clampRect({ x: r.x - r.w * grow, y: r.y - r.h * grow, w: r.w * (1 + 2 * grow), h: r.h * (1 + 2 * grow) }, imgW, imgH));
}

/** 그림 밖으로 나간 부분을 자르고 정수로 맞춘다 */
export function clampRect(r: Rect, w: number, h: number): Rect {
  const x0 = Math.max(0, Math.floor(Math.min(r.x, r.x + r.w))), y0 = Math.max(0, Math.floor(Math.min(r.y, r.y + r.h)));
  const x1 = Math.min(w, Math.ceil(Math.max(r.x, r.x + r.w))), y1 = Math.min(h, Math.ceil(Math.max(r.y, r.y + r.h)));
  return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
}

/** 모자이크 칸 크기(원본 픽셀) — 강도 1~10, 가릴 영역의 긴 변 기준. 너무 작으면 알아볼 수 있어 최소 6px */
export function mosaicCell(r: Rect, strength: number): number {
  const s = Math.min(10, Math.max(1, Math.round(strength)));
  return Math.max(6, Math.round((Math.max(r.w, r.h) * (s + 2)) / 60));
}

/* ───────── 사진 나누기 ───────── */
export type SplitLayout = "2v" | "2h" | "3v" | "3h" | "4" | "6" | "8" | "9" | "16";
/** 나누기 배치 → 세로선 수(cols)·가로선 수(rows). v=세로로 쌓기(위아래로 나눔), h=가로로 나란히 */
export const SPLIT_LAYOUTS: Record<SplitLayout, { label: string; cols: number; rows: number }> = {
  "2v": { label: "위아래 2", cols: 1, rows: 2 },
  "2h": { label: "좌우 2", cols: 2, rows: 1 },
  "3v": { label: "위아래 3", cols: 1, rows: 3 },
  "3h": { label: "좌우 3", cols: 3, rows: 1 },
  "4": { label: "4 (2×2)", cols: 2, rows: 2 },
  "6": { label: "6 (2×3)", cols: 2, rows: 3 },
  "8": { label: "8 (2×4)", cols: 2, rows: 4 },
  "9": { label: "9 (3×3)", cols: 3, rows: 3 },
  "16": { label: "16 (4×4)", cols: 4, rows: 4 },
};

/** n칸으로 고르게 나눈 안쪽 선 위치(0~1, n-1개) */
export const evenCuts = (n: number): number[] => Array.from({ length: Math.max(0, n - 1) }, (_, i) => (i + 1) / n);

/** 선 하나를 옮길 때 이웃 선과 최소 간격(gap) 안으로 막는다(선끼리 교차 불가) */
export function moveCut(cuts: number[], i: number, to: number, gap = 0.05): number[] {
  const lo = (i > 0 ? cuts[i - 1] : 0) + gap, hi = (i < cuts.length - 1 ? cuts[i + 1] : 1) - gap;
  const next = cuts.slice();
  next[i] = Math.min(hi, Math.max(lo, to));
  return next;
}

/** 선 위치 → 조각 상자(왼쪽 위부터 줄 순서, 원본 정수 픽셀, 틈·겹침 없음) */
export function splitRects(w: number, h: number, xs: number[], ys: number[]): Rect[] {
  const ex = [0, ...xs.map((v) => Math.round(v * w)), w], ey = [0, ...ys.map((v) => Math.round(v * h)), h];
  const out: Rect[] = [];
  for (let j = 0; j < ey.length - 1; j++) for (let i = 0; i < ex.length - 1; i++) out.push({ x: ex[i], y: ey[j], w: ex[i + 1] - ex[i], h: ey[j + 1] - ey[j] });
  return out;
}

/** 조각 파일 이름: 원래이름_01.png … (조각이 10개 이상이면 두 자리) */
export function pieceNames(base: string, count: number, ext: string): string[] {
  const stem = (base.replace(/\.[^.]+$/, "") || "사진").replace(/[\\/:*?"<>|]/g, "_");
  return Array.from({ length: count }, (_, i) => `${stem}_${String(i + 1).padStart(2, "0")}.${ext}`);
}

/* ───────── 숫자 자리만 가리기 (E5-3, PP-OCRv4 글자 읽기, 입력 1×3×48×W) ───────── */
export const REC_H = 48;
/** 모델 글자 목록(`character` 메타데이터)에서 숫자 0~9의 위치 + 1(출력 0번은 빈칸) — 2026-10-26 모델 파일에서 직접 뽑음 */
export const REC_DIGIT_CLASSES: ReadonlySet<number> = new Set([25, 92, 24, 93, 631, 630, 932, 28, 26, 1108].map((i) => i + 1));

/** 글자 자리 상자 → 읽기 입력 폭(높이 48 기준 비율 유지, 8의 배수, 32~960) */
export function recWidth(w: number, h: number): number {
  const raw = Math.round((REC_H * w) / Math.max(1, h));
  return Math.min(960, Math.max(32, Math.ceil(raw / 8) * 8));
}

/** 48×W RGBA → 읽기 입력((값/255-0.5)/0.5) */
export function recInput(rgba: ArrayLike<number>, w: number, h = REC_H): Float32Array {
  const n = w * h, out = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) out[c * n + i] = (rgba[i * 4 + c] / 255 - 0.5) / 0.5;
  return out;
}

/** 읽기 출력(T×C 점수) → 글자 수·숫자 수(같은 글자 연속·빈칸은 합침, 공백 칸은 셈에서 뺌) */
export function countDigits(scores: ArrayLike<number>, T: number, C: number, spaceClass = C - 1): { chars: number; digits: number } {
  let prev = -1, chars = 0, digits = 0;
  for (let t = 0; t < T; t++) {
    let best = 0, bv = -Infinity;
    for (let c = 0; c < C; c++) { const v = scores[t * C + c]; if (v > bv) { bv = v; best = c; } }
    if (best !== prev && best !== 0 && best !== spaceClass) { chars++; if (REC_DIGIT_CLASSES.has(best)) digits++; }
    prev = best;
  }
  return { chars, digits };
}

/** 숫자가 많은 자리인가 — 숫자 4개 이상이면서 글자의 절반 이상이 숫자(전화번호·송장·주문번호). 「500ml」 같은 짧은 숫자는 제외 */
export const isNumberish = (r: { chars: number; digits: number }) => r.digits >= 4 && r.digits * 2 >= r.chars;
