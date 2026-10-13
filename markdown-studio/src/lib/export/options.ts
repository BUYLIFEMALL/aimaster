// PDF·DOCX 공용 용지 옵션 (같은 값으로 두 형식의 용지 크기가 일치한다)
export interface PageOptions {
  size: "A4" | "LETTER";
  orientation: "portrait" | "landscape";
  margin: "narrow" | "normal" | "wide";
  fontSize: number; // pt
}
export const DEFAULT_PAGE_OPTIONS: PageOptions = { size: "A4", orientation: "portrait", margin: "normal", fontSize: 11 };
export const FONT_SIZES = [10, 11, 12, 14] as const;
export const MARGIN_LABELS = { narrow: "좁게(약 10mm)", normal: "보통(약 15mm)", wide: "넓게(약 20mm)" } as const;

/** 여백(pt) */
export const marginPt = (m: PageOptions["margin"]) => ({ narrow: 28, normal: 42, wide: 57 })[m];
/** 용지 크기(pt, 세로 기준) */
export const PAGE_PT = { A4: { w: 595.28, h: 841.89 }, LETTER: { w: 612, h: 792 } } as const;

export function normalizePageOptions(o: Partial<PageOptions> | undefined): PageOptions {
  const d = DEFAULT_PAGE_OPTIONS;
  return {
    size: o?.size === "LETTER" ? "LETTER" : "A4",
    orientation: o?.orientation === "landscape" ? "landscape" : "portrait",
    margin: o?.margin === "narrow" || o?.margin === "wide" ? o.margin : "normal",
    fontSize: FONT_SIZES.includes(o?.fontSize as 10) ? (o!.fontSize as number) : d.fontSize,
  };
}
