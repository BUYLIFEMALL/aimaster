// v1.24: 「배경 어둡기」 추천 — 글자가 놓이는 자리의 배경 밝기와 글자색으로 대비(WCAG)를 계산해
// 4.5:1 이상이 되는 가장 작은 어둡기(5% 단위)를 찾는다. 순수 함수(시험 대상)
import type { Design } from "./config";

export type RGB = [number, number, number];
export const TARGET_CONTRAST = 4.5;

/** 글자 구역(위/가운데/아래)의 세로 범위(0~1) — drawQuote의 글자 배치와 맞춘 대략값 */
export function textBand(position: Design["position"]): [number, number] {
  return position === "top" ? [0.12, 0.45] : position === "bottom" ? [0.55, 0.88] : [0.3, 0.7];
}

export function hexToRgb(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** WCAG 상대 휘도 */
export function luminance([r, g, b]: RGB): number {
  const f = (v: number) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrastRatio(a: RGB, b: RGB): number {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** drawQuote처럼 검은 막(overlay%)을 씌운 배경색 */
export function darken([r, g, b]: RGB, overlay: number): RGB {
  const k = 1 - Math.max(0, Math.min(100, overlay)) / 100;
  return [r * k, g * k, b * k];
}

export interface OverlayAdvice {
  /** 지금 어둡기에서의 대비(소수 첫째 자리) */
  contrast: number;
  ok: boolean;
  /** 4.5:1이 되는 가장 작은 어둡기(5% 단위, 지금보다 큼). 어둡게 해도 안 되면 null */
  recommended: number | null;
  /** 글자가 어두운 색이라 어둡게 할수록 대비가 떨어지는 경우 */
  darkText: boolean;
}

export function adviseOverlay(bg: RGB, textHex: string, current: number, max = 75): OverlayAdvice | null {
  const text = hexToRgb(textHex);
  if (!text) return null;
  const now = contrastRatio(text, darken(bg, current));
  const contrast = Math.round(now * 10) / 10;
  const darkText = luminance(text) < 0.4;
  if (now >= TARGET_CONTRAST) return { contrast, ok: true, recommended: null, darkText };
  if (darkText) return { contrast, ok: false, recommended: null, darkText };
  for (let o = Math.ceil((current + 1) / 5) * 5; o <= max; o += 5) {
    if (contrastRatio(text, darken(bg, o)) >= TARGET_CONTRAST) return { contrast, ok: false, recommended: o, darkText };
  }
  return { contrast, ok: false, recommended: null, darkText };
}
