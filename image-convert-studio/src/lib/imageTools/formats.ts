// 이미지 변환·콜라주의 순수 계산 함수(브라우저·서버·테스트 어디서나 동작). 화면·캔버스에 의존하지 않는다.

export type OutputFormat = "webp" | "png" | "jpeg" | "avif";
export type ResampleFilter = "lanczos3" | "lanczos2" | "mks2013" | "mitchell" | "hamming" | "box";
export type CollageLayout = "grid" | "horizontal" | "vertical";
export type CollageFit = "cover" | "contain";

export const OUTPUT_FORMATS: OutputFormat[] = ["webp", "png", "jpeg", "avif"];
export const FORMAT_LABEL: Record<OutputFormat, string> = { webp: "WebP", png: "PNG", jpeg: "JPEG", avif: "AVIF" };
export const FORMAT_MIME: Record<OutputFormat, string> = { webp: "image/webp", png: "image/png", jpeg: "image/jpeg", avif: "image/avif" };
export const RESAMPLE_FILTERS: ResampleFilter[] = ["lanczos3", "lanczos2", "mks2013", "mitchell", "hamming", "box"];
export const SCALE_OPTIONS = [0.5, 1, 1.5, 2, 3, 4] as const;

/** 브라우저 캔버스가 안정적으로 다루는 한계(한 변·전체 픽셀). 넘으면 변환·콜라주를 막고 안내한다. */
export const MAX_CANVAS_SIDE = 16384;
export const MAX_CANVAS_PIXELS = 120_000_000;
/** 한 번에 올릴 수 있는 이미지 수(메모리 보호) */
export const MAX_FILES = 300;
/** 이 수를 넘기면 메모리 부담 안내를 보여 준다 */
export const MANY_FILES_WARN = 100;

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

/** 원본 파일 이름의 확장자를 출력 형식으로 바꾼다(JPEG → .jpg) */
export function outputFileName(name: string, format: OutputFormat): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  return `${base}.${format === "jpeg" ? "jpg" : format}`;
}

/** ZIP 안에서 같은 이름이 겹치면 `이름_1.확장자`, `이름_2.확장자`처럼 구분한다 */
export function dedupeNames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const count = seen.get(name) ?? 0;
    seen.set(name, count + 1);
    if (count === 0) return name;
    const dot = name.lastIndexOf(".");
    return dot > 0 ? `${name.slice(0, dot)}_${count}${name.slice(dot)}` : `${name}_${count}`;
  });
}

export interface ResizeLimits {
  scale?: number;
  maxWidth?: number;
  maxHeight?: number;
}

/** 배율 → 최대 너비·높이 순으로 적용한 출력 크기(가로세로 비율 유지, 최소 1px) */
export function targetSize(width: number, height: number, limits: ResizeLimits): { width: number; height: number } {
  let w = width;
  let h = height;
  if (limits.scale && limits.scale > 0 && limits.scale !== 1) {
    w = Math.max(1, Math.round(width * limits.scale));
    h = Math.max(1, Math.round(height * limits.scale));
  }
  if (limits.maxWidth && w > limits.maxWidth) {
    h = Math.round((h * limits.maxWidth) / w);
    w = limits.maxWidth;
  }
  if (limits.maxHeight && h > limits.maxHeight) {
    w = Math.round((w * limits.maxHeight) / h);
    h = limits.maxHeight;
  }
  return { width: Math.max(1, w), height: Math.max(1, h) };
}

export function exceedsCanvasLimit(width: number, height: number): boolean {
  return width > MAX_CANVAS_SIDE || height > MAX_CANVAS_SIDE || width * height > MAX_CANVAS_PIXELS;
}

/** 이 품질 값이 의미 있는 형식인가(PNG는 무손실이라 품질을 쓰지 않는다) */
export function usesQuality(format: OutputFormat): boolean {
  return format !== "png";
}

export function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function collageGrid(layout: CollageLayout, count: number, columns: number): { cols: number; rows: number } {
  const n = Math.max(0, count);
  if (layout === "horizontal") return { cols: Math.max(1, n), rows: 1 };
  if (layout === "vertical") return { cols: 1, rows: Math.max(1, n) };
  const cols = Math.min(Math.max(1, Math.round(columns)), Math.max(1, n));
  return { cols, rows: Math.max(1, Math.ceil(n / cols)) };
}

export interface CollageSpec {
  cols: number;
  rows: number;
  cellW: number;
  cellH: number;
  gap: number;
  padding: number;
}

export function collageSize(spec: CollageSpec): { width: number; height: number } {
  return {
    width: 2 * spec.padding + spec.cols * spec.cellW + (spec.cols - 1) * spec.gap,
    height: 2 * spec.padding + spec.rows * spec.cellH + (spec.rows - 1) * spec.gap,
  };
}

/** i번째 칸의 왼쪽 위 좌표 */
export function cellOrigin(spec: CollageSpec, index: number): { x: number; y: number } {
  const col = index % spec.cols;
  const row = Math.floor(index / spec.cols);
  return { x: spec.padding + col * (spec.cellW + spec.gap), y: spec.padding + row * (spec.cellH + spec.gap) };
}

export interface DrawRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

/** 칸 안에 원본을 그리는 위치 — cover: 칸을 꽉 채우고 넘치는 부분은 잘림, contain: 전체를 보이고 남는 곳은 배경 */
export function fitRect(srcW: number, srcH: number, cellX: number, cellY: number, cellW: number, cellH: number, fit: CollageFit): DrawRect {
  if (fit === "cover") {
    const ratio = Math.max(cellW / srcW, cellH / srcH);
    const sw = cellW / ratio;
    const sh = cellH / ratio;
    return { sx: (srcW - sw) / 2, sy: (srcH - sh) / 2, sw, sh, dx: cellX, dy: cellY, dw: cellW, dh: cellH };
  }
  const ratio = Math.min(cellW / srcW, cellH / srcH);
  const dw = srcW * ratio;
  const dh = srcH * ratio;
  return { sx: 0, sy: 0, sw: srcW, sh: srcH, dx: cellX + (cellW - dw) / 2, dy: cellY + (cellH - dh) / 2, dw, dh };
}
