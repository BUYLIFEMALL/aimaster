// D25 빠른 주문·다시 담기 — 서버 전용: 품번 찾기 → 손님 화면 상품 읽기 → 장바구니 수량까지 더해 가격 엔진 검사 → 담기.
// 담기 규칙은 상품 상세의 장바구니 담기(cart/actions.ts addToCartAction)와 같다: 같은 상품·옵션이면 수량을 더하고, 더한 수량으로 검사.

import ExcelJS from "exceljs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { priceLine } from "./pricing.ts";
import { getPriceContexts, type ProductRow } from "./store.ts";
import type { Variant } from "./options.ts";
import { MAX_QUICK_LINES, resolveQuickLine, type Catalog, type CodeHit, type QuickLine } from "./quickOrder.ts";

export type PlannedQuick = {
  lines: number[];
  code: string;
  option: string;
  qty: number;
  name: string;
  optionLabel: string;
  unitPrice: number;
  lineTotal: number;
  inCart: number; // 이미 장바구니에 있는 수량
  ok: boolean;
  error: string | null;
  product_id: string | null;
  variant_id: string | null;
};

type Want = { lines: number[]; code: string; option: string; qty: number; product_id: string | null; variant_id: string | null; error: string | null };

const chunks = <T,>(list: T[], n: number) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n));

/** 상품 id들 → 손님 화면 상품(보는 사람 기준) + 옵션 조합 */
async function loadCatalog(supabase: SupabaseClient, storeId: string, ids: string[]) {
  const products = new Map<string, ProductRow>();
  for (const part of chunks([...new Set(ids)], 200)) {
    const { data } = await supabase.rpc("mall_builder_shop_products", { p_store_id: storeId, p_ids: part, p_limit: 200 });
    for (const p of (data ?? []) as ProductRow[]) products.set(p.id, p);
  }
  const variants = new Map<string, (Variant & { id: string })[]>();
  const withOpt = [...products.values()].filter((p) => (p.option_groups ?? []).length).map((p) => p.id);
  for (const part of chunks(withOpt, 200)) {
    const { data } = await supabase.from("mall_builder_product_variants").select("id, product_id, key, values, extra_price, stock, sku, is_active, sort").in("product_id", part).order("sort");
    for (const v of (data ?? []) as (Variant & { id: string; product_id: string })[]) variants.set(v.product_id, [...(variants.get(v.product_id) ?? []), { ...v, extra_price: Number(v.extra_price) }]);
  }
  return { products, variants };
}

/** 품번 줄 → 상품·옵션(못 찾으면 이유) */
export async function resolveCodes(supabase: SupabaseClient, storeId: string, lines: QuickLine[]): Promise<Want[]> {
  const codes = [...new Set(lines.map((l) => l.code))];
  const { data } = await supabase.rpc("mall_builder_lookup_codes", { p_store_id: storeId, p_codes: codes });
  const hits = (data ?? []) as CodeHit[];
  const { products, variants } = await loadCatalog(supabase, storeId, hits.map((h) => h.product_id));
  const catalog: Catalog = new Map([...products.values()].map((p) => [p.id, { option_groups: p.option_groups, variants: variants.get(p.id) ?? [] }]));
  return lines.map((l) => {
    const r = resolveQuickLine(l, hits, catalog);
    return { ...l, product_id: r.ok ? r.product_id : null, variant_id: r.ok ? r.variant_id : null, error: r.ok ? null : r.error };
  });
}

/** 찾은 줄 → 가격·주문 가능 검사(지금 장바구니 수량을 더한 수량으로) */
export async function planLines(supabase: SupabaseClient, storeId: string, userId: string, wants: Want[]): Promise<PlannedQuick[]> {
  const ids = wants.map((w) => w.product_id).filter((x): x is string => !!x);
  const { products, variants } = await loadCatalog(supabase, storeId, ids);
  const { data: cart } = await supabase.from("mall_builder_cart_items").select("product_id, variant_id, qty").eq("store_id", storeId).eq("user_id", userId);
  const inCart = new Map((cart ?? []).map((c) => [`${c.product_id}|${c.variant_id ?? ""}`, c.qty as number]));
  const ctxOf = await getPriceContexts(storeId, ids);
  // 같은 상품·옵션이 여러 줄(품번 줄과 조합 품번 줄)로 들어와도 앞 줄 수량을 더해 검사
  const pending = new Map<string, number>();
  return wants.map((w) => {
    const base = { lines: w.lines, code: w.code, option: w.option, qty: w.qty, product_id: w.product_id, variant_id: w.variant_id };
    const p = w.product_id ? products.get(w.product_id) : undefined;
    if (w.error || !p) return { ...base, name: "", optionLabel: "", unitPrice: 0, lineTotal: 0, inCart: 0, ok: false, error: w.error ?? "지금 살 수 없는 상품입니다." };
    const v = w.variant_id ? (variants.get(p.id) ?? []).find((x) => x.id === w.variant_id) ?? null : null;
    const key = `${p.id}|${w.variant_id ?? ""}`;
    const already = (inCart.get(key) ?? 0) + (pending.get(key) ?? 0);
    const line = priceLine(p, v, already + w.qty, ctxOf(p.id));
    const ok = line.orderable;
    if (ok) pending.set(key, (pending.get(key) ?? 0) + w.qty);
    const error = ok ? null : already ? `${line.errors[0]} (장바구니에 이미 ${already}개)` : line.errors[0];
    return { ...base, name: p.name, optionLabel: v?.key ?? "", unitPrice: line.unitPrice, lineTotal: line.unitPrice * w.qty, inCart: inCart.get(key) ?? 0, ok, error };
  });
}

/** 정상 줄만 장바구니에 담는다(같은 상품·옵션이면 수량을 더함). 담은 줄 수 */
export async function addPlanned(supabase: SupabaseClient, storeId: string, userId: string, rows: PlannedQuick[]): Promise<{ added: number; error: string | null }> {
  let added = 0;
  for (const r of rows.filter((x) => x.ok && x.product_id)) {
    let q = supabase.from("mall_builder_cart_items").select("id, qty").eq("store_id", storeId).eq("user_id", userId).eq("product_id", r.product_id!);
    q = r.variant_id ? q.eq("variant_id", r.variant_id) : q.is("variant_id", null);
    const { data: line } = await q.maybeSingle();
    const { error } = line
      ? await supabase.from("mall_builder_cart_items").update({ qty: (line.qty as number) + r.qty }).eq("id", line.id)
      : await supabase.from("mall_builder_cart_items").insert({ store_id: storeId, user_id: userId, product_id: r.product_id, variant_id: r.variant_id, qty: r.qty });
    if (error) return { added, error: `「${r.name}」을(를) 담지 못했습니다: ${error.message}` };
    added++;
  }
  return { added, error: null };
}

export const MAX_QUICK_FILE = 2 * 1024 * 1024;

/** .xlsx 첫 시트 → 글자 표 */
export async function readFirstSheet(buf: ArrayBuffer): Promise<string[][] | null> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buf);
  } catch {
    return null;
  }
  const ws = wb.worksheets[0];
  if (!ws) return null;
  const out: string[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    if (out.length > MAX_QUICK_LINES + 5) return;
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, col) => (cells[col - 1] = (cell.text ?? "").trim()));
    out.push(Array.from(cells, (c) => c ?? ""));
  });
  return out;
}

/** 빠른 주문 양식(품번·옵션·수량) */
export async function quickTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("빠른 주문");
  ws.addRow(["품번", "옵션", "수량"]).font = { bold: true };
  ws.columns.forEach((c) => (c.numFmt = "@"));
  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 18;
  ws.getColumn(3).width = 10;
  return Buffer.from(await wb.xlsx.writeBuffer());
}
