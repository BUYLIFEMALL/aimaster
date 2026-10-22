// F3(v1.12): 게시처 규격 프리셋·회전·반전·비율 자르기 — DOM 없는 순수 계산(시험 대상). 그리기는 engine.ts
export type Rotation = 0 | 90 | 180 | 270;
export const ROTATIONS: Rotation[] = [0, 90, 180, 270];

export type CropRatioId = "original" | "1:1" | "4:5" | "3:4" | "9:16" | "16:9";
export const CROP_RATIOS: { id: CropRatioId; label: string; ratio: number | null }[] = [
  { id: "original", label: "원본", ratio: null },
  { id: "1:1", label: "1:1", ratio: 1 },
  { id: "4:5", label: "4:5", ratio: 4 / 5 },
  { id: "3:4", label: "3:4", ratio: 3 / 4 },
  { id: "9:16", label: "9:16", ratio: 9 / 16 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
];

/** 게시처 규격: 고르면 그 비율로 가운데 자르기 + 정확한 크기로 맞춤 */
export interface PostPreset { id: string; label: string; width: number; height: number }
export const POST_PRESETS: PostPreset[] = [
  { id: "insta-feed", label: "인스타 피드 1:1", width: 1080, height: 1080 },
  { id: "insta-portrait", label: "인스타 세로 4:5", width: 1080, height: 1350 },
  { id: "story", label: "스토리·릴스 9:16", width: 1080, height: 1920 },
  { id: "youtube-thumb", label: "유튜브 썸네일 16:9", width: 1280, height: 720 },
  { id: "share-og", label: "블로그·카톡 공유 1200×630", width: 1200, height: 630 },
  { id: "store-product", label: "스마트스토어 상품 1:1", width: 1000, height: 1000 },
];
export function presetById(id: string | null | undefined): PostPreset | null {
  return POST_PRESETS.find((p) => p.id === id) ?? null;
}

export function normalizeRotation(deg: number): Rotation {
  const r = ((Math.round(deg / 90) * 90) % 360 + 360) % 360;
  return r as Rotation;
}

/** 회전한 뒤의 가로·세로 */
export function rotatedSize(w: number, h: number, rotate: Rotation): { width: number; height: number } {
  return rotate === 90 || rotate === 270 ? { width: h, height: w } : { width: w, height: h };
}

/** 가운데 기준으로 ratio(가로/세로)에 맞게 자를 영역. ratio가 없으면 전체 */
export function centerCrop(w: number, h: number, ratio: number | null): { x: number; y: number; width: number; height: number } {
  if (!ratio || !(ratio > 0)) return { x: 0, y: 0, width: w, height: h };
  let cw = w, ch = Math.round(w / ratio);
  if (ch > h) { ch = h; cw = Math.round(h * ratio); }
  cw = Math.max(1, Math.min(w, cw));
  ch = Math.max(1, Math.min(h, ch));
  return { x: Math.floor((w - cw) / 2), y: Math.floor((h - ch) / 2), width: cw, height: ch };
}

export interface TransformInput { rotate?: Rotation; cropRatio?: number | null; preset?: PostPreset | null }
export interface TransformPlan {
  /** 회전 후 크기 */
  rotW: number; rotH: number;
  /** 회전 후 좌표계에서 자를 영역 */
  crop: { x: number; y: number; width: number; height: number };
  /** 규격 프리셋이면 정확한 출력 크기 */
  exact: { width: number; height: number } | null;
  /** 회전·반전·자르기 없이 원본 그대로인지 */
  identity: boolean;
}

/** 프리셋이 있으면 프리셋 비율이 자르기 비율보다 우선 */
export function planTransform(srcW: number, srcH: number, t: TransformInput & { flipH?: boolean; flipV?: boolean }): TransformPlan {
  const rotate = t.rotate ?? 0;
  const { width: rotW, height: rotH } = rotatedSize(srcW, srcH, rotate);
  const ratio = t.preset ? t.preset.width / t.preset.height : t.cropRatio ?? null;
  const crop = centerCrop(rotW, rotH, ratio);
  const exact = t.preset ? { width: t.preset.width, height: t.preset.height } : null;
  const identity = rotate === 0 && !t.flipH && !t.flipV && crop.width === rotW && crop.height === rotH;
  return { rotW, rotH, crop, exact, identity };
}
