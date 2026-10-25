// 수집 결과 표 정렬·거르기(2026-10-25, v1.29 확장 제안 F) — 표 글자를 숫자로 바꾸는 순수 함수(시험용).
// 표는 확장이 회원 PC 안에서 넘겨준 글자 배열이다(서버 미경유). 화면 안에서만 정렬·거른다.

/** 「10억 6,086」→106086, 「8억」→80000, 「6,000 / 190」(월세)→6000(보증금), 숫자 아님→null (만 원) */
export function priceNum(text: unknown): number | null {
  const s = String(text ?? "").split("/")[0].replace(/[,\s]/g, "");
  const m = s.match(/^(?:(\d+)억)?(\d+)?$/);
  if (!m || (!m[1] && !m[2])) return null;
  return Number(m[1] || 0) * 10000 + Number(m[2] || 0);
}

/** 「44/58」→44, 「저/57」→1, 「중/57」→28.5, 「고/57」→57, 모르면 null */
export function floorNum(text: unknown): number | null {
  const [a, b] = String(text ?? "").split("/");
  const top = Number(b);
  if (/^\d+$/.test(a ?? "")) return Number(a);
  if (a === "저") return 1;
  if (a === "중") return Number.isFinite(top) ? top / 2 : 2;
  if (a === "고") return Number.isFinite(top) ? top : 3;
  return null;
}

/** 「-12%」「+8%」「🔥 -12%」→ -12 / 8, 없으면 null */
export function pctNum(text: unknown): number | null {
  const m = String(text ?? "").match(/([+-]?\d+(?:\.\d+)?)%/);
  return m ? Number(m[1]) : null;
}

export const SORTS = [
  { id: "default", label: "기본 순서" },
  { id: "priceAsc", label: "가격 낮은 순" },
  { id: "priceDesc", label: "가격 높은 순" },
  { id: "areaDesc", label: "면적 넓은 순" },
  { id: "floorDesc", label: "층 높은 순" },
  { id: "gapAsc", label: "실거래보다 싼 순" },
] as const;
export type SortId = (typeof SORTS)[number]["id"];

type Cols = { trade: number; price: number; area: number; floor: number; gap: number; bargain: number };

/** 거래 종류·급매만 거르고 정렬. 값이 없는 줄은 정렬 때 맨 뒤로 */
export function sortFilterRows(rows: unknown[][], c: Cols, opt: { trade: string; bargainOnly: boolean; sort: SortId }) {
  let out = rows;
  if (opt.trade !== "전체" && c.trade >= 0) out = out.filter((r) => r[c.trade] === opt.trade);
  if (opt.bargainOnly) out = c.bargain >= 0 ? out.filter((r) => !!r[c.bargain]) : [];
  if (opt.sort === "default") return out;
  const key: Record<Exclude<SortId, "default">, [(r: unknown[]) => number | null, 1 | -1]> = {
    priceAsc: [(r) => priceNum(r[c.price]), 1],
    priceDesc: [(r) => priceNum(r[c.price]), -1],
    areaDesc: [(r) => { const n = Number(r[c.area]); return r[c.area] === "" || !Number.isFinite(n) ? null : n; }, -1],
    floorDesc: [(r) => floorNum(r[c.floor]), -1],
    gapAsc: [(r) => (c.gap >= 0 ? pctNum(r[c.gap]) : null), 1],
  };
  const [get, dir] = key[opt.sort];
  return [...out].sort((a, b) => {
    const x = get(a), y = get(b);
    if (x === null && y === null) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return (x - y) * dir;
  });
}

/** 웹 표 「층」 칸을 읽기 쉽게(2026-10-25 주인님 「이게 뭐야」 — 「44/58」이 무슨 뜻인지 모름): 「44/58」→「44층 / 58층」, 「저/57」→「저층 / 57층」 */
export function floorText(text: unknown): string {
  const s = String(text ?? "");
  const [a, b] = s.split("/");
  if (b === undefined) return s;
  const head = /^\d+$/.test(a) ? `${a}층` : ["저", "중", "고"].includes(a) ? `${a}층` : a;
  return /^\d+$/.test(b) ? `${head} / ${b}층` : s;
}
