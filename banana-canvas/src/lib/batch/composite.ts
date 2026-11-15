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
  /** 서브 틀 모양(M1 2026-11-15): rounded = 둥근 사각(기존), circle = 원(상자를 정사각으로 고정) */
  subShape: "rounded" | "circle";
  subOutline: boolean;
  /** 테두리 굵기(px, 0이면 안 그림)·색 */
  subOutlineWidth: number;
  subOutlineColor: string;
  /** 틀 배경: 흰색 기본, "transparent" 또는 #rrggbb — contain일 때 빈 곳 색 */
  subFrameBg: string;
  /** 틀 안 사진 확대(100~200%)·초점 위치(0~100, 50 = 가운데) — 전체 공통 값 */
  subZoom: number;
  subFocusX: number;
  subFocusY: number;
  /** 서브 면적 참고 기준(%) — 넘으면 안내만(저장은 막지 않음). 공식 규정이 아니라 참고 기준 */
  subAreaWarn: number;
  subShadow: boolean;
  /** 저장 크기: fixed = width×height, original = 상품마다 메인 원본 크기(200~3000으로 제한) */
  sizeMode: "fixed" | "original";
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
  subAnchor: "br", subRatio: 32, subFit: "cover", subMargin: 24, subRadius: 12,
  subShape: "rounded", subOutline: true, subOutlineWidth: 2, subOutlineColor: "#ffffff", subFrameBg: "#ffffff",
  subZoom: 100, subFocusX: 50, subFocusY: 50, subAreaWarn: 20, subShadow: true, sizeMode: "fixed",
  format: "jpg", quality: 92, prefix: "", template: "{prefix}_{code}_{option}_{role}",
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);
const HEX = /^#[0-9a-f]{6}$/i;

export function normalizeComposite(raw: Partial<CompositeSettings> | null | undefined): CompositeSettings {
  const s = { ...DEFAULT_COMPOSITE, ...(raw ?? {}) };
  return {
    width: clamp(Math.round(num(s.width, 1000)), 200, 3000),
    height: clamp(Math.round(num(s.height, 1000)), 200, 3000),
    background: HEX.test(String(s.background)) ? String(s.background) : "#ffffff",
    fit: s.fit === "cover" ? "cover" : "contain",
    padding: clamp(Math.round(num(s.padding, 0)), 0, 200),
    subAnchor: ANCHORS.includes(s.subAnchor) ? s.subAnchor : "br",
    subRatio: clamp(Math.round(num(s.subRatio, 32)), 15, 50),
    subFit: s.subFit === "contain" ? "contain" : "cover",
    subMargin: clamp(Math.round(num(s.subMargin, 24)), 0, 60),
    subRadius: clamp(Math.round(num(s.subRadius, 12)), 0, 30),
    subShape: s.subShape === "circle" ? "circle" : "rounded",
    subOutline: !!s.subOutline,
    subOutlineWidth: clamp(Math.round(num(s.subOutlineWidth, 2)), 0, 12),
    subOutlineColor: HEX.test(String(s.subOutlineColor)) ? String(s.subOutlineColor) : "#ffffff",
    subFrameBg: s.subFrameBg === "transparent" ? "transparent" : HEX.test(String(s.subFrameBg)) ? String(s.subFrameBg) : "#ffffff",
    subZoom: clamp(Math.round(num(s.subZoom, 100)), 100, 200),
    subFocusX: clamp(Math.round(num(s.subFocusX, 50)), 0, 100),
    subFocusY: clamp(Math.round(num(s.subFocusY, 50)), 0, 100),
    subAreaWarn: clamp(Math.round(num(s.subAreaWarn, 20)), 10, 50),
    subShadow: !!s.subShadow,
    sizeMode: s.sizeMode === "original" ? "original" : "fixed",
    format: s.format === "png" ? "png" : "jpg",
    quality: clamp(Math.round(num(s.quality, 92)), 60, 100),
    prefix: String(s.prefix ?? "").replace(/[\\/:*?"<>|]/g, "").slice(0, 40),
    template: /\{(code|sku)\}/.test(String(s.template ?? "")) ? String(s.template).slice(0, 80) : DEFAULT_COMPOSITE.template,
  };
}

export interface Rect { x: number; y: number; w: number; h: number }
export interface DrawRect { sx: number; sy: number; sw: number; sh: number; dx: number; dy: number; dw: number; dh: number }

/**
 * 원본(srcW×srcH)을 상자에 맞춰 그릴 위치. contain=전체가 보이게, cover=상자를 꽉 채우게(가운데 기준 잘라냄).
 * zoom(%)·focusX/Y(0~100)를 주면 그만큼 키우고 초점 쪽을 남겨 상자 밖은 잘라낸다(M1 틀 안 사진 확대·위치).
 */
export function fitRect(srcW: number, srcH: number, box: Rect, mode: "contain" | "cover", zoom = 100, focusX = 50, focusY = 50): DrawRect {
  const sW = Math.max(1, srcW), sH = Math.max(1, srcH);
  if (zoom !== 100 || focusX !== 50 || focusY !== 50) {
    const base = mode === "cover" ? Math.max(box.w / sW, box.h / sH) : Math.min(box.w / sW, box.h / sH);
    const scale = base * Math.max(1, zoom / 100);
    const fullW = sW * scale, fullH = sH * scale;
    // 원본을 키운 그림의 왼쪽 위(상자보다 크면 초점 쪽이 남도록, 작으면 초점 비율대로 놓음)
    const ox = box.x + (box.w - fullW) * (focusX / 100);
    const oy = box.y + (box.h - fullH) * (focusY / 100);
    const dx = Math.max(box.x, ox), dy = Math.max(box.y, oy);
    const dw = Math.min(box.x + box.w, ox + fullW) - dx, dh = Math.min(box.y + box.h, oy + fullH) - dy;
    return { sx: (dx - ox) / scale, sy: (dy - oy) / scale, sw: dw / scale, sh: dh / scale, dx, dy, dw, dh };
  }
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
export function subRects(aspects: number[], s: Pick<CompositeSettings, "width" | "height" | "subAnchor" | "subRatio" | "subMargin"> & { subFit?: "contain" | "cover"; subShape?: "rounded" | "circle" }): Rect[] {
  if (!aspects.length) return [];
  const side = Math.round((Math.min(s.width, s.height) * s.subRatio) / 100);
  const sizes = aspects.map((a) => {
    if (s.subFit === "cover" || s.subShape === "circle") return { w: side, h: side }; // 원형은 항상 정사각 상자
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

/**
 * 서브가 차지하는 면적 ÷ 바탕 면적(%) — 소수 첫째 자리. 원형은 원 면적, 둥근 사각은 모서리 깎인 만큼 뺀다.
 * 화면 안내용 참고 수치(마켓 공식 규정 아님).
 */
export function subAreaPercent(aspects: number[], s: Pick<CompositeSettings, "width" | "height" | "subAnchor" | "subRatio" | "subMargin" | "subFit" | "subShape" | "subRadius">): number {
  const rects = subRects(aspects, s);
  const total = Math.max(1, s.width * s.height);
  let area = 0;
  for (const r of rects) {
    if (s.subShape === "circle") area += Math.PI * (r.w / 2) ** 2;
    else {
      const rr = Math.max(0, Math.min(s.subRadius, r.w / 2, r.h / 2));
      area += r.w * r.h - (4 - Math.PI) * rr * rr;
    }
  }
  return Math.round((area / total) * 1000) / 10;
}

/** 실제 저장 크기 — sizeMode가 original이면 메인 원본 크기(긴 변 3000·짧은 변 200 제한, 비율 유지) */
export function resolveSize(s: Pick<CompositeSettings, "width" | "height" | "sizeMode">, mainW: number, mainH: number): { width: number; height: number } {
  if (s.sizeMode !== "original" || !(mainW > 0) || !(mainH > 0)) return { width: s.width, height: s.height };
  const down = Math.min(1, 3000 / Math.max(mainW, mainH));
  let w = mainW * down, h = mainH * down;
  const up = Math.max(1, 200 / Math.min(w, h));
  w = Math.min(3000, w * up); h = Math.min(3000, h * up);
  return { width: Math.round(w), height: Math.round(h) };
}

/** 설정 버전 — 같은 설정이면 같은 값(결과표·반환 기록용 짧은 해시) */
export function settingsVersion(s: CompositeSettings): string {
  const keys = Object.keys(s).sort() as (keyof CompositeSettings)[];
  const text = keys.map((k) => `${k}=${String(s[k])}`).join("&");
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return `c2-${h.toString(36)}`; // M1(2026-11-15) 칸 추가로 c1→c2
}
