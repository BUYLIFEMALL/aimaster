// D25 빠른 주문 — 붙여 넣은 글·엑셀 표 → 줄 목록, 같은 품목 합치기, 품번·조합 품번·옵션 값으로 상품·옵션 고르기(node --test 대상)
// 결정(주인님 2026-11-10 「추천안 5가지 그대로」): 붙여 넣기 + .xlsx, 정상 줄만 담기, 장바구니 수량에 더함, 300줄까지.
// 금액·주문 가능 여부는 장바구니와 같은 가격 엔진(priceLine)으로, 주문 금액은 주문 DB 함수가 다시 계산한다.

import { variantKey, type OptionGroup, type Variant } from "./options.ts";

export const MAX_QUICK_LINES = 300;

export type QuickLine = { lines: number[]; code: string; option: string; qty: number };
export type QuickInputError = { line: number; text: string; error: string };

const squash = (s: string) => s.replace(/[\s/]+/g, "").toUpperCase();

/** 한 줄 → 품번·옵션 글자·수량. 칸 구분은 탭·쉼표·공백. 맨 끝 칸이 수량, 첫 칸이 품번, 사이가 옵션 값 */
function parseRow(cells: string[]): { code: string; option: string; qty: number } | { error: string } | null {
  const c = cells.map((x) => String(x ?? "").trim()).filter(Boolean);
  if (!c.length) return null;
  if (/^(품번|상품\s*품번|code)$/i.test(c[0])) return null; // 머리글 줄
  if (c.length < 2) return { error: "품번과 수량을 함께 적어 주세요(예: P00001 10)." };
  const qtyText = c[c.length - 1].replace(/[,개]/g, "");
  if (!/^\d+$/.test(qtyText) || Number(qtyText) < 1) return { error: `수량 「${c[c.length - 1]}」을(를) 1 이상의 숫자로 적어 주세요.` };
  return { code: c[0], option: c.slice(1, -1).join(" "), qty: Number(qtyText) };
}

/** 붙여 넣은 글(엑셀에서 복사하면 탭으로 나뉨) → 줄 목록 */
export function parseQuickText(text: string): { rows: { line: number; code: string; option: string; qty: number }[]; errors: QuickInputError[] } {
  const rows: { line: number; code: string; option: string; qty: number }[] = [];
  const errors: QuickInputError[] = [];
  String(text ?? "").split(/\r?\n/).forEach((raw, i) => {
    const cells = raw.includes("\t") ? raw.split("\t") : raw.includes(",") ? raw.split(",") : raw.trim().split(/\s+/);
    const r = parseRow(cells);
    if (!r) return;
    if ("error" in r) errors.push({ line: i + 1, text: raw.trim(), error: r.error });
    else rows.push({ line: i + 1, ...r });
  });
  return { rows, errors };
}

/** 엑셀 표(첫 줄 머리글: 품번·옵션(선택)·수량) → 줄 목록. 머리글이 없으면 첫 칸 품번·마지막 칸 수량으로 읽는다 */
export function parseQuickTable(table: string[][]): { rows: { line: number; code: string; option: string; qty: number }[]; errors: QuickInputError[] } {
  const head = (table[0] ?? []).map((h) => String(h ?? "").replace(/\s+/g, ""));
  const ci = head.findIndex((h) => h === "품번");
  const qi = head.findIndex((h) => h === "수량");
  const oi = head.findIndex((h) => h === "옵션");
  const rows: { line: number; code: string; option: string; qty: number }[] = [];
  const errors: QuickInputError[] = [];
  const hasHead = ci >= 0 && qi >= 0;
  table.slice(hasHead ? 1 : 0).forEach((cells, i) => {
    const line = i + (hasHead ? 2 : 1);
    const picked = hasHead ? [cells[ci] ?? "", oi >= 0 ? cells[oi] ?? "" : "", cells[qi] ?? ""] : cells;
    const r = parseRow(picked);
    if (!r) return;
    if ("error" in r) errors.push({ line, text: cells.join(" ").trim(), error: r.error });
    else rows.push({ line, ...r });
  });
  return { rows, errors };
}

/** 같은 품번·옵션 줄은 수량을 합친다(대소문자·띄어쓰기 무시) */
export function mergeQuickRows(rows: { line: number; code: string; option: string; qty: number }[]): QuickLine[] {
  const map = new Map<string, QuickLine>();
  for (const r of rows) {
    const key = `${r.code.toUpperCase()}|${squash(r.option)}`;
    const cur = map.get(key);
    if (cur) {
      cur.qty += r.qty;
      cur.lines.push(r.line);
    } else map.set(key, { lines: [r.line], code: r.code, option: r.option, qty: r.qty });
  }
  return [...map.values()];
}

export type CodeHit = { code: string; product_id: string; variant_id: string | null; kind: "product" | "variant" };
export type Catalog = Map<string, { option_groups: OptionGroup[] | null; variants: (Variant & { id: string })[] }>;

/**
 * 품번·조합 품번 → 상품·옵션.
 * ① 상품 품번이면: 옵션 없는 상품은 그대로, 옵션 상품은 옵션 글자(「검정」「검정/M」「검정 M」)로 조합을 찾는다
 * ② 조합 품번이면: 그 조합. 옵션 글자를 함께 적으면 안 됨
 */
export function resolveQuickLine(
  l: QuickLine,
  hits: CodeHit[],
  catalog: Catalog,
): { ok: true; product_id: string; variant_id: string | null } | { ok: false; error: string } {
  const code = l.code.toUpperCase();
  const product = hits.find((h) => h.kind === "product" && h.code === code);
  if (product) {
    const info = catalog.get(product.product_id);
    const hasOptions = (info?.option_groups ?? []).length > 0;
    if (!hasOptions) return l.option ? { ok: false, error: "옵션이 없는 상품입니다. 옵션 칸을 비워 주세요." } : { ok: true, product_id: product.product_id, variant_id: null };
    if (!l.option) {
      const names = (info!.option_groups ?? []).map((g) => g.name).join("·");
      return { ok: false, error: `옵션(${names})을 함께 적어 주세요(예: ${l.code} ${(info!.option_groups ?? []).map((g) => g.values[0]).join("/")} 10).` };
    }
    const want = squash(l.option);
    const v = info!.variants.find((x) => squash(variantKey(x.values)) === want);
    if (!v) return { ok: false, error: `옵션 「${l.option}」을(를) 찾지 못했습니다.` };
    return { ok: true, product_id: product.product_id, variant_id: v.id };
  }
  const variants = hits.filter((h) => h.kind === "variant" && h.code === code);
  if (variants.length > 1) return { ok: false, error: "같은 조합 품번이 여러 옵션에 있습니다. 상품 품번 + 옵션 값으로 적어 주세요." };
  if (variants.length === 1) {
    if (l.option) return { ok: false, error: "조합 품번에는 옵션 값을 따로 적지 않습니다." };
    return { ok: true, product_id: variants[0].product_id, variant_id: variants[0].variant_id };
  }
  return { ok: false, error: `품번 「${l.code}」 상품이 없거나 지금 살 수 없는 상품입니다.` };
}
