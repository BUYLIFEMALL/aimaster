// 메이커 P1(2026-11-13) 「🛍 상품 대표사진 합성」 — 메인+서브 배치 계산(순수 함수, 시험 대상). 그리기는 compositeRender.ts.
// 화면 계약: agy 시안(docs/IMPROVEMENT_HANDOFF_20261113_MAKER_BATCH.md) — 1000×1000 바탕, 서브는 9곳 위치·크기 15~50%(기본 32%)·여백·둥근 모서리·외곽선·그림자.
import { ANCHORS, type Anchor } from "./layout";

export interface CompositeSettings {
  width: number;
  height: number;
  background: string;
  /** 메인 사진: contain = 안에 맞춤(여백 생김), cover = 꽉 채움(잘림) */
  fit: "contain" | "cover";
  /** 메인 사진 둘레 여백(px) */
  padding: number;
  subAnchor: Anchor;
  /** 서브 한 장의 긴 변 = 바탕 짧은 변의 % */
  subRatio: number;
  /** 서브 맞춤: cover = 정사각으로 잘라 채움(기본, 긴 사진도 띠가 되지 않음), contain = 원본 비율 그대로 */
  subFit: "contain" | "cover";
  /** 서브와 가장자리·서브끼리 간격(px) */
  subMargin: number;
  subRadius: number;
  subOutline: boolean;
  subShadow: boolean;
  format: "jpg" | "png";
  quality: number;
  prefix: string;
  template: string;
}

export const COMPOSITE_PRESETS = [
  { id: "1000", label: "1000×1000(기본)", width: 1000, height: 1000 },
  { id: "1200", label: "1200×1200", width: 1200, height: 1200 },
  { id: "800", label: "800×800", width: 800, height: 800 },
] as const;

export const DEFAULT_COMPOSITE: CompositeSettings = {
  width: 1000, height: 1000, background: "#ffffff", fit: "contain", padding: 0,
  subAnchor: "br", subRatio: 32, subFit: "cover", subMargin: 24, subRadius: 12, subOutline: true, subShadow: true,
  format: "jpg", quality: 92, prefix: "", template: "{prefix}_{code}_{option}_{role}",
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);

export function normalizeComposite(raw: Partial<CompositeSettings> | null | undefined): CompositeSettings {
  const s = { ...DEFAULT_COMPOSITE, ...(raw ?? {}) };
  return {
    width: clamp(Math.round(num(s.width, 1000)), 200, 3000),
    height: clamp(Math.round(num(s.height, 1000)), 200, 3000),
    background: /^#[0-9a-f]{6}$/i.test(String(s.background)) ? String(s.background) : "#ffffff",
    fit: s.fit === "cover" ? "cover" : "contain",
    padding: clamp(Math.round(num(s.padding, 0)), 0, 200),
    subAnchor: ANCHORS.includes(s.subAnchor) ? s.subAnchor : "br",
    subRatio: clamp(Math.round(num(s.subRatio, 32)), 15, 50),
    subFit: s.subFit === "contain" ? "contain" : "cover",
    subMargin: clamp(Math.round(num(s.subMargin, 24)), 0, 60),
    subRadius: clamp(Math.round(num(s.subRadius, 12)), 0, 30),
    subOutline: !!s.subOutline,
    subShadow: !!s.subShadow,
    format: s.format === "png" ? "png" : "jpg",
    quality: clamp(Math.round(num(s.quality, 92)), 60, 100),
    prefix: String(s.prefix ?? "").replace(/[\\/:*?"<>|]/g, "").slice(0, 40),
    template: /\{(code|sku)\}/.test(String(s.template ?? "")) ? String(s.template).slice(0, 80) : DEFAULT_COMPOSITE.template,
  };
}

export interface Rect { x: number; y: number; w: number; h: number }
export interface DrawRect { sx: number; sy: number; sw: number; sh: number; dx: number; dy: number; dw: number; dh: number }

/** 원본(srcW×srcH)을 상자에 맞춰 그릴 위치. contain=전체가 보이게, cover=상자를 꽉 채우게(가운데 기준 잘라냄) */
export function fitRect(srcW: number, srcH: number, box: Rect, mode: "contain" | "cover"): DrawRect {
  const sW = Math.max(1, srcW), sH = Math.max(1, srcH);
  if (mode === "cover") {
    const scale = Math.max(box.w / sW, box.h / sH);
    const sw = box.w / scale, sh = box.h / scale;
    return { sx: (sW - sw) / 2, sy: (sH - sh) / 2, sw, sh, dx: box.x, dy: box.y, dw: box.w, dh: box.h };
  }
  const scale = Math.min(box.w / sW, box.h / sH);
  const dw = sW * scale, dh = sH * scale;
  return { sx: 0, sy: 0, sw: sW, sh: sH, dx: box.x + (box.w - dw) / 2, dy: box.y + (box.h - dh) / 2, dw, dh };
}

/** 메인 사진 상자(여백 안쪽) */
export function mainBox(s: Pick<CompositeSettings, "width" | "height" | "padding">): Rect {
  const p = Math.min(s.padding, Math.floor(Math.min(s.width, s.height) / 4));
  return { x: p, y: p, w: s.width - p * 2, h: s.height - p * 2 };
}

/**
 * 서브 사진들의 자리. 각 서브는 긴 변이 (짧은 변 × 비율%)인 상자에 비율 유지로 들어간다.
 * 위·아래 줄 위치면 가로로, 가운데 줄이면 세로로 나란히 놓는다(지정 위치에서 안쪽으로).
 */
export function subRects(aspects: number[], s: Pick<CompositeSettings, "width" | "height" | "subAnchor" | "subRatio" | "subMargin"> & { subFit?: "contain" | "cover" }): Rect[] {
  if (!aspects.length) return [];
  const side = Math.round((Math.min(s.width, s.height) * s.subRatio) / 100);
  const sizes = aspects.map((a) => {
    if (s.subFit === "cover") return { w: side, h: side };
    const r = a > 0 && Number.isFinite(a) ? a : 1;
    return r >= 1 ? { w: side, h: Math.max(1, Math.round(side / r)) } : { w: Math.max(1, Math.round(side * r)), h: side };
  });
  const m = s.subMargin;
  const row = s.subAnchor[0], col = s.subAnchor[1];
  const horizontal = row !== "m";
  const totalW = horizontal ? sizes.reduce((t, z) => t + z.w, 0) + m * (sizes.length - 1) : Math.max(...sizes.map((z) => z.w));
  const totalH = horizontal ? Math.max(...sizes.map((z) => z.h)) : sizes.reduce((t, z) => t + z.h, 0) + m * (sizes.length - 1);
  const x0 = col === "l" ? m : col === "c" ? (s.width - totalW) / 2 : s.width - totalW - m;
  const y0 = row === "t" ? m : row === "m" ? (s.height - totalH) / 2 : s.height - totalH - m;
  const out: Rect[] = [];
  let cx = x0, cy = y0;
  for (const z of sizes) {
    const x = horizontal ? cx : x0 + (col === "r" ? totalW - z.w : col === "c" ? (totalW - z.w) / 2 : 0);
    const y = horizontal ? y0 + (row === "b" ? totalH - z.h : 0) : cy;
    out.push({ x: Math.round(x), y: Math.round(y), w: z.w, h: z.h });
    if (horizontal) cx += z.w + m; else cy += z.h + m;
  }
  return out;
}

/** 설정 버전 — 같은 설정이면 같은 값(결과표·반환 기록용 짧은 해시) */
export function settingsVersion(s: CompositeSettings): string {
  const keys = Object.keys(s).sort() as (keyof CompositeSettings)[];
  const text = keys.map((k) => `${k}=${String(s[k])}`).join("&");
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return `c1-${h.toString(36)}`;
}
