// E4(2026-10-26) 「🖼 사진 일괄 손질」 — 크기·워터마크 위치·파일 이름 계산(순수 함수, 시험 대상).
// 그리기는 render.ts. 브라우저 밖(시험)에서도 돌도록 DOM을 쓰지 않는다.

export const BATCH_MAX_ITEMS = 50;
export const BATCH_MAX_BYTES = 25 * 1024 * 1024;
export const BATCH_MAX_SIDE = 4096;
export const DEFAULT_HEIGHT = 860;

export type Anchor = "tl" | "tc" | "tr" | "ml" | "mc" | "mr" | "bl" | "bc" | "br";
export const ANCHORS: Anchor[] = ["tl", "tc", "tr", "ml", "mc", "mr", "bl", "bc", "br"];
export const ANCHOR_LABELS: Record<Anchor, string> = {
  tl: "왼쪽 위", tc: "가운데 위", tr: "오른쪽 위",
  ml: "왼쪽 가운데", mc: "정가운데", mr: "오른쪽 가운데",
  bl: "왼쪽 아래", bc: "가운데 아래", br: "오른쪽 아래",
};

export interface BatchSettings {
  /** null = 원본 크기 그대로 */
  height: number | null;
  border: number;
  borderColor: string;
  wmKind: "none" | "text" | "logo";
  wmText: string;
  wmColor: string;
  wmBold: boolean;
  /** 워터마크 크기: 문자는 글자 높이, 로고는 너비 — 사진 너비 대비 % */
  wmSizePct: number;
  /** 0~100 */
  wmOpacity: number;
  wmAnchor: Anchor;
  /** 가장자리 여백(px, 결과 크기 기준) */
  wmMargin: number;
  format: "jpg" | "png";
  /** 60~100 */
  quality: number;
  prefix: string;
}

export const DEFAULT_SETTINGS: BatchSettings = {
  height: DEFAULT_HEIGHT,
  border: 0,
  borderColor: "#ffffff",
  wmKind: "none",
  wmText: "",
  wmColor: "#ffffff",
  wmBold: true,
  wmSizePct: 6,
  wmOpacity: 60,
  wmAnchor: "br",
  wmMargin: 24,
  format: "jpg",
  quality: 92,
  prefix: "",
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** 저장된 설정을 안전한 범위로 맞춘다(이 브라우저 저장값이 깨져도 화면이 망가지지 않게) */
export function normalizeSettings(raw: Partial<BatchSettings> | null | undefined): BatchSettings {
  const s = { ...DEFAULT_SETTINGS, ...(raw ?? {}) };
  return {
    ...s,
    height: s.height == null ? null : clamp(Math.round(Number(s.height) || DEFAULT_HEIGHT), 100, BATCH_MAX_SIDE),
    border: clamp(Math.round(Number(s.border) || 0), 0, 50),
    wmKind: s.wmKind === "text" || s.wmKind === "logo" ? s.wmKind : "none",
    wmText: String(s.wmText ?? "").slice(0, 60),
    wmSizePct: clamp(Number(s.wmSizePct) || DEFAULT_SETTINGS.wmSizePct, 1, 40),
    wmOpacity: clamp(Number(s.wmOpacity), 0, 100),
    wmAnchor: ANCHORS.includes(s.wmAnchor) ? s.wmAnchor : "br",
    wmMargin: clamp(Math.round(Number(s.wmMargin) || 0), 0, 400),
    format: s.format === "png" ? "png" : "jpg",
    quality: clamp(Math.round(Number(s.quality) || 92), 60, 100),
    prefix: String(s.prefix ?? "").replace(/[\\/:*?"<>|]/g, "").slice(0, 40),
  };
}

export interface OutputSize {
  /** 사진 부분(테두리 안) */
  w: number;
  h: number;
  /** 테두리 포함 전체 */
  totalW: number;
  totalH: number;
  /** 가로가 4096px을 넘어 이 사진은 처리하지 않음 */
  tooWide: boolean;
}

/** 세로 높이 맞춤(비율 유지) + 테두리 */
export function outputSize(srcW: number, srcH: number, s: Pick<BatchSettings, "height" | "border">): OutputSize {
  const h = s.height == null ? srcH : s.height;
  const w = s.height == null ? srcW : Math.max(1, Math.round((srcW * s.height) / Math.max(1, srcH)));
  const totalW = w + s.border * 2;
  const totalH = h + s.border * 2;
  return { w, h, totalW, totalH, tooWide: totalW > BATCH_MAX_SIDE || totalH > BATCH_MAX_SIDE };
}

/** 워터마크 상자의 왼쪽 위 좌표(결과 전체 크기 기준) */
export function anchorPosition(anchor: Anchor, canvasW: number, canvasH: number, boxW: number, boxH: number, margin: number) {
  const col = anchor[1] === "l" ? 0 : anchor[1] === "c" ? 1 : 2;
  const row = anchor[0] === "t" ? 0 : anchor[0] === "m" ? 1 : 2;
  const x = col === 0 ? margin : col === 1 ? (canvasW - boxW) / 2 : canvasW - boxW - margin;
  const y = row === 0 ? margin : row === 1 ? (canvasH - boxH) / 2 : canvasH - boxH - margin;
  return { x: Math.round(x), y: Math.round(y) };
}

/** 로고 워터마크 크기(사진 너비의 %, 로고 비율 유지) */
export function logoSize(canvasW: number, logoW: number, logoH: number, sizePct: number) {
  const w = Math.max(1, Math.round((canvasW * sizePct) / 100));
  return { w, h: Math.max(1, Math.round((w * logoH) / Math.max(1, logoW))) };
}

/** 문자 워터마크 글자 크기(사진 너비의 %) */
export function textFontPx(canvasW: number, sizePct: number) {
  return Math.max(8, Math.round((canvasW * sizePct) / 100));
}

/** 결과 파일 이름: 앞붙임이 있으면 「앞붙임_001」, 없으면 「원래이름」. 같은 이름은 (2)(3)… */
export function outputNames(names: string[], prefix: string, format: "jpg" | "png"): string[] {
  const ext = format === "png" ? "png" : "jpg";
  const digits = Math.max(3, String(names.length).length);
  const used = new Set<string>();
  return names.map((n, i) => {
    const base = prefix ? `${prefix}_${String(i + 1).padStart(digits, "0")}` : n.replace(/\.[^.]+$/, "") || "image";
    let name = `${base}.${ext}`;
    for (let k = 2; used.has(name); k++) name = `${base}(${k}).${ext}`;
    used.add(name);
    return name;
  });
}
