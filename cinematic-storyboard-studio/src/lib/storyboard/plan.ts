// 장면 길이 배분·자르기 좌표·파일명 등 순수 계산 (서버·브라우저 공용, 테스트 대상)
import { KEYFRAME_COUNT } from "./types";

/**
 * 총 길이(초)를 키프레임 N개의 장면 길이로 나눈다. 합이 총 길이와 정확히 같다.
 * 장면 1은 업로드 이미지가 시작 이미지로 안정적으로 쓰이도록 가장 길게(총 길이의 약 30%, 최소 2초) 잡고,
 * 나머지는 0.5초 단위로 균등하게 나누며 남는 단위는 앞쪽 장면부터 하나씩 얹는다.
 */
export function planDurations(totalSeconds: number, count = KEYFRAME_COUNT): number[] {
  // 0.5초 단위(units)로 나눠 계산하면 합계가 항상 정확하다
  const totalUnits = Math.max(count, Math.round(totalSeconds * 2));
  const firstUnits = Math.min(totalUnits - (count - 1), Math.max(4, Math.round(totalUnits * 0.3)));
  const rem = totalUnits - firstUnits;
  const base = Math.floor(rem / (count - 1));
  const extra = rem % (count - 1);
  const units = [firstUnits, ...Array.from({ length: count - 1 }, (_, i) => base + (i < extra ? 1 : 0))];
  return units.map((u) => u / 2);
}

export const formatSeconds = (s: number) => `${Number.isInteger(s) ? s : s.toFixed(1)}s`;

/** "2.5s", "3 sec", "4초" 같은 문자열에서 초 단위 숫자를 뽑는다. 실패하면 null */
export function parseSeconds(v: string | number | undefined | null): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const m = String(v ?? "").match(/\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

export interface Crop {
  left: number;
  right: number;
}
export interface Band {
  top: number;
  bottom: number;
}
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 이미지 높이에서 3개 행의 기본 경계(상·중·하 약 1/3씩)를 만든다 */
export function defaultBands(height: number): [Band, Band, Band] {
  return [
    { top: 0, bottom: Math.floor(height * 0.33) },
    { top: Math.floor(height * 0.333), bottom: Math.floor(height * 0.66) },
    { top: Math.floor(height * 0.666), bottom: height },
  ];
}

/** 경계값을 이미지 안으로 보정한다(top < bottom 유지) */
export function clampBand(b: Band, height: number): Band {
  const top = Math.min(Math.max(0, Math.round(b.top)), height - 1);
  const bottom = Math.min(Math.max(top + 1, Math.round(b.bottom)), height);
  return { top, bottom };
}

export function clampCrop(c: Crop, width: number): Crop {
  const left = Math.min(Math.max(0, Math.round(c.left)), Math.floor(width / 2));
  const right = Math.min(Math.max(0, Math.round(c.right)), Math.floor(width / 2));
  return { left, right };
}

/** 가로 자르기와 3개 행 경계로 9개 컷의 사각형을 계산한다(왼쪽→오른쪽, 위→아래 순서) */
export function cellRects(width: number, crop: Crop, bands: Band[]): Rect[] {
  const usable = width - crop.left - crop.right;
  const cellW = usable / 3;
  const out: Rect[] = [];
  for (const b of bands) {
    const h = b.bottom - b.top;
    if (h <= 0 || cellW <= 0) continue;
    for (let c = 0; c < 3; c++) out.push({ x: Math.round(crop.left + cellW * c), y: b.top, w: Math.round(cellW), h });
  }
  return out;
}

export const keyframeFileName = (index: number) => `keyframe_${String(index + 1).padStart(2, "0")}.jpg`;

/** 파일 이름·제목에 쓸 수 없는 문자를 바꾼다 */
export function safeName(name: string, max = 40): string {
  return name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").trim().slice(0, max).trim() || "storyboard";
}
