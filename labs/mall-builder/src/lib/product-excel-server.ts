// D23 상품 엑셀 — 서버 전용: 데이터 읽기·엑셀 만들기/읽기(exceljs)·저장.
// 검사·비교 규칙은 productExcel.ts(시험 대상)에 있고, 여기는 DB·파일 입출력만 한다.

import ExcelJS from "exceljs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./supabase/env.ts";
import type { CategoryRow } from "./categories.ts";
import type { Variant } from "./options.ts";
import {
  HELP_MARK,
  O_COLS,
  SHEET,
  T_COLS,
  assignCodes,
  exportRows,
  headersFor,
  helpRow,
  mapHeaders,
  tableToRows,
  type ExcelContext,
  type ExcelPlan,
  type ExistingProduct,
  type GradeValue,
  type Sheets,
  type Tier,
} from "./productExcel.ts";

export const MAX_FILE_BYTES = 4 * 1024 * 1024; // Vercel 함수 요청 한도 4.5MB 아래
const CHUNK = 200;
const PUBLIC_BASE = `${SUPABASE_URL}/storage/v1/object/public/mall-builder-public`;

const chunks = <T,>(list: T[], n = CHUNK) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n));

/** 1,000줄 넘는 표도 끝까지 읽기 */
async function readAll<T>(make: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await make(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}

/** 몰의 상품·옵션·등급가·구간·카테고리·배송비·등급을 한 번에 읽는다(운영자 권한으로) */
export async function loadExcelContext(supabase: SupabaseClient, storeId: string): Promise<ExcelContext> {
  const [products, variants, gradePrices, tiers, categories, policies, grades] = await Promise.all([
    readAll((a, b) =>
      supabase
        .from("mall_builder_products")
        .select("id, product_code, name, summary, description, base_price, list_price, tax_type, status, stock_mode, stock, images, option_groups, shipping_policy_id, visibility, price_visibility, moq, order_unit, max_qty, mall_builder_product_private(cost), mall_builder_product_categories(category_id)")
        .eq("store_id", storeId)
        .order("created_at")
        .range(a, b),
    ),
    readAll((a, b) => supabase.from("mall_builder_product_variants").select("id, product_id, key, values, extra_price, stock, sku, is_active, sort").eq("store_id", storeId).order("sort").range(a, b)),
    readAll((a, b) => supabase.from("mall_builder_product_grade_prices").select("product_id, grade_id, price, discount_rate").eq("store_id", storeId).range(a, b)),
    readAll((a, b) => supabase.from("mall_builder_product_volume_tiers").select("product_id, min_qty, discount_type, value").eq("store_id", storeId).order("min_qty").range(a, b)),
    readAll((a, b) => supabase.from("mall_builder_categories").select("id, parent_id, name, depth, sort, is_visible").eq("store_id", storeId).range(a, b)),
    readAll((a, b) => supabase.from("mall_builder_shipping_policies").select("id, name").eq("store_id", storeId).range(a, b)),
    readAll((a, b) => supabase.from("mall_builder_customer_grades").select("id, name, rank").eq("store_id", storeId).order("rank").range(a, b)),
  ]);

  const vByProduct = new Map<string, (Variant & { id: string })[]>();
  for (const v of variants as (Variant & { id: string; product_id: string })[]) {
    const { product_id, ...rest } = v;
    vByProduct.set(product_id, [...(vByProduct.get(product_id) ?? []), { ...rest, extra_price: Number(rest.extra_price), stock: Number(rest.stock) }]);
  }
  const gByProduct = new Map<string, Record<string, GradeValue>>();
  for (const g of gradePrices as { product_id: string; grade_id: string; price: number | null; discount_rate: number | null }[]) {
    const m = gByProduct.get(g.product_id) ?? {};
    m[g.grade_id] = { price: g.price == null ? null : Number(g.price), discount_rate: g.discount_rate };
    gByProduct.set(g.product_id, m);
  }
  const tByProduct = new Map<string, Tier[]>();
  for (const t of tiers as (Tier & { product_id: string })[]) {
    tByProduct.set(t.product_id, [...(tByProduct.get(t.product_id) ?? []), { min_qty: t.min_qty, discount_type: t.discount_type, value: Number(t.value) }]);
  }

  type Raw = Omit<ExistingProduct, "cost" | "category_ids" | "variants" | "grades" | "tiers"> & {
    mall_builder_product_private: { cost: number | null } | { cost: number | null }[] | null;
    mall_builder_product_categories: { category_id: string }[];
  };
  const existing: ExistingProduct[] = (products as Raw[]).map(({ mall_builder_product_private: priv, mall_builder_product_categories: cats, ...p }) => {
    const pr = Array.isArray(priv) ? priv[0] : priv;
    return {
      ...p,
      base_price: Number(p.base_price),
      list_price: p.list_price == null ? null : Number(p.list_price),
      cost: pr?.cost == null ? null : Number(pr.cost),
      category_ids: (cats ?? []).map((c) => c.category_id),
      images: p.images ?? [],
      option_groups: p.option_groups ?? [],
      variants: vByProduct.get(p.id) ?? [],
      grades: gByProduct.get(p.id) ?? {},
      tiers: tByProduct.get(p.id) ?? [],
    };
  });

  return {
    storeId,
    publicBase: PUBLIC_BASE,
    categories: categories as CategoryRow[],
    policies: policies as { id: string; name: string }[],
    grades: (grades as { id: string; name: string }[]).map((g) => ({ id: g.id, name: g.name })),
    existing,
  };
}

/** 품번이 없는 상품에 P00001부터 매긴다(내려받기 전에). 매긴 수를 돌려줌 */
export async function fillMissingCodes(supabase: SupabaseClient, ctx: ExcelContext): Promise<number> {
  const todo = assignCodes(ctx.existing);
  for (const t of todo) {
    const { error } = await supabase.from("mall_builder_products").update({ product_code: t.code }).eq("id", t.id).eq("store_id", ctx.storeId);
    if (error) throw new Error(error.message);
    const p = ctx.existing.find((e) => e.id === t.id);
    if (p) p.product_code = t.code;
  }
  return todo.length;
}

/** 엑셀 파일 만들기 — empty면 빈 양식(설명 줄만) */
export async function buildWorkbook(ctx: ExcelContext, empty: boolean): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const data = empty ? { products: [], options: [], tiers: [] } : exportRows(ctx);
  const add = (name: string, header: string[], help: string[] | null, rows: string[][], widths: number[]) => {
    const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: help ? 2 : 1 }] });
    ws.addRow(header).font = { bold: true };
    if (help) {
      const r = ws.addRow(help);
      r.font = { color: { argb: "FF6B7280" }, italic: true };
      r.alignment = { wrapText: true, vertical: "top" };
    }
    for (const row of rows) ws.addRow(row);
    header.forEach((_, i) => (ws.getColumn(i + 1).width = widths[i] ?? 14));
    // 품번·숫자 칸이 날짜·숫자로 바뀌지 않게 글자 칸으로
    ws.columns.forEach((c) => (c.numFmt = "@"));
  };
  const header = headersFor(ctx.grades);
  add(SHEET.products, header, helpRow(ctx.grades), data.products, header.map((h) => (h === "상세 설명" || h === "사진 주소" ? 40 : h === "상품명" || h === "카테고리" ? 24 : 14)));
  add(SHEET.options, O_COLS.map((c) => c[1]), [`${HELP_MARK} 한 줄 = 옵션 조합 하나. 이 시트에 그 상품 줄이 있으면 옵션 전체가 엑셀 내용으로 바뀝니다(없는 조합은 「사용 안 함」). 줄이 없으면 옵션은 그대로`, "", "", "", "", "", "", "음수 가능", "", "", "사용 / 안 함"], data.options, [14, 12, 12, 12, 12, 12, 12, 10, 10, 14, 10]);
  add(SHEET.tiers, T_COLS.map((c) => c[1]), [`${HELP_MARK} 상품마다 최대 3줄. 이 시트에 그 상품 줄이 있으면 구간이 엑셀 내용으로 바뀝니다. 줄이 없으면 그대로`, "2~999", "5%(할인율) / -1000(개당 할인) / 40000(개당 가격)"], data.tiers, [14, 12, 40]);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** 올린 파일 → 시트 3개 행 목록. 형식 문제는 error */
export async function readWorkbook(buf: ArrayBuffer, grades: { id: string; name: string }[]): Promise<{ sheets: Sheets } | { error: string }> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buf);
  } catch {
    return { error: "엑셀(.xlsx) 파일을 읽지 못했습니다. 양식을 내려받아 저장한 파일인지 확인해 주세요." };
  }
  const table = (name: string): string[][] | null => {
    const ws = wb.getWorksheet(name);
    if (!ws) return null;
    const out: string[][] = [];
    ws.eachRow({ includeEmpty: true }, (row, n) => {
      const cells: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell, col) => (cells[col - 1] = (cell.text ?? "").trim()));
      out[n - 1] = Array.from(cells, (c) => c ?? "");
    });
    return Array.from(out, (r) => r ?? []);
  };
  const p = table(SHEET.products);
  if (!p || !p.length) return { error: `「${SHEET.products}」 시트를 찾지 못했습니다. 양식을 내려받아 사용해 주세요.` };
  const sheets: Sheets = { products: [], options: [], tiers: [] };
  for (const key of ["products", "options", "tiers"] as const) {
    const t = key === "products" ? p : table(SHEET[key]);
    if (!t || !t.length) continue; // 옵션·구간 시트는 없어도 됨
    const m = mapHeaders(key, t[0], grades);
    if ("error" in m) return { error: m.error };
    sheets[key] = tableToRows(t, m.keys);
  }
  return { sheets };
}

export type ApplyResult = { created: number; updated: number; error: string | null };

/** 계획 저장 — 오류 0건인 계획만 넘긴다. 200개씩 묶어서 보낸다. 중간에 실패하면 그 단계까지 저장된 상태로 멈춘다 */
export async function applyPlan(supabase: SupabaseClient, ctx: ExcelContext, plan: ExcelPlan): Promise<ApplyResult> {
  const storeId = ctx.storeId;
  const todo = plan.products.filter((p) => p.action === "create" || p.action === "update");
  const result: ApplyResult = { created: 0, updated: 0, error: null };
  const fail = (step: string, msg: string): ApplyResult => ({ ...result, error: `${step} 저장 중 멈췄습니다: ${msg}` });

  const row = (p: (typeof todo)[number]) => {
    const { product } = p.value!;
    return { ...product, store_id: storeId, ...(p.value!.options ? { option_groups: p.value!.options.groups } : {}) };
  };

  // 1. 새 상품
  const ids = new Map<string, string>(); // 품번(대문자) → id
  for (const part of chunks(todo.filter((p) => p.action === "create"))) {
    // 여러 줄을 한 번에 넣을 때 어떤 줄에만 있는 칸은 다른 줄에서 null이 된다 → 새 상품은 옵션 칸을 항상 채우고, 빠진 칸은 기본값으로
    const rows = part.map((p) => ({ ...row(p), option_groups: p.value!.options?.groups ?? [] }));
    const { data, error } = await supabase.from("mall_builder_products").insert(rows, { defaultToNull: false }).select("id, product_code");
    if (error) return fail("새 상품", error.message);
    for (const d of data ?? []) ids.set(String(d.product_code).toUpperCase(), d.id as string);
    result.created += data?.length ?? 0;
  }
  // 2. 고칠 상품(바꾸는 칸만이 아니라 상품 줄 전체를 엑셀 값으로)
  for (const part of chunks(todo.filter((p) => p.action === "update"))) {
    const { data, error } = await supabase.from("mall_builder_products").upsert(part.map((p) => ({ id: p.id!, ...row(p) })), { onConflict: "id", defaultToNull: false }).select("id");
    if (error) return fail("상품 수정", error.message);
    result.updated += data?.length ?? 0;
  }
  for (const p of todo) if (p.id) ids.set(p.code.toUpperCase(), p.id);
  const idOf = (p: (typeof todo)[number]) => ids.get(p.code.toUpperCase())!;
  const updatedIds = todo.filter((p) => p.action === "update").map(idOf);

  // 3. 원가
  for (const part of chunks(todo)) {
    const { error } = await supabase.from("mall_builder_product_private").upsert(part.map((p) => ({ product_id: idOf(p), store_id: storeId, cost: p.value!.cost })), { onConflict: "product_id" });
    if (error) return fail("원가", error.message);
  }
  // 4. 카테고리: 고친 상품은 지우고 다시
  for (const part of chunks(updatedIds)) {
    const { error } = await supabase.from("mall_builder_product_categories").delete().eq("store_id", storeId).in("product_id", part);
    if (error) return fail("카테고리", error.message);
  }
  const links = todo.flatMap((p) => p.value!.category_ids.map((category_id) => ({ product_id: idOf(p), category_id, store_id: storeId })));
  for (const part of chunks(links)) {
    const { error } = await supabase.from("mall_builder_product_categories").insert(part);
    if (error) return fail("카테고리", error.message);
  }
  // 5. 등급가: 값 있으면 넣거나 바꾸고, 빈칸이면 지움
  const gradeRows = todo.flatMap((p) =>
    Object.entries(p.value!.grades).filter(([, v]) => v).map(([grade_id, v]) => ({ store_id: storeId, product_id: idOf(p), grade_id, price: v!.price, discount_rate: v!.discount_rate })),
  );
  for (const part of chunks(gradeRows)) {
    const { error } = await supabase.from("mall_builder_product_grade_prices").upsert(part, { onConflict: "product_id,grade_id" });
    if (error) return fail("등급가", error.message);
  }
  for (const g of ctx.grades) {
    const clear = todo.filter((p) => p.action === "update" && p.value!.grades[g.id] === null).map(idOf);
    for (const part of chunks(clear)) {
      const { error } = await supabase.from("mall_builder_product_grade_prices").delete().eq("grade_id", g.id).in("product_id", part);
      if (error) return fail("등급가", error.message);
    }
  }
  // 6. 구간 할인: 그 상품 줄이 있을 때만 교체
  const withTiers = todo.filter((p) => p.value!.tiers);
  for (const part of chunks(withTiers.filter((p) => p.action === "update").map(idOf))) {
    const { error } = await supabase.from("mall_builder_product_volume_tiers").delete().eq("store_id", storeId).in("product_id", part);
    if (error) return fail("구간 할인", error.message);
  }
  const tierRows = withTiers.flatMap((p) => p.value!.tiers!.map((t) => ({ ...t, store_id: storeId, product_id: idOf(p) })));
  for (const part of chunks(tierRows)) {
    const { error } = await supabase.from("mall_builder_product_volume_tiers").insert(part);
    if (error) return fail("구간 할인", error.message);
  }
  // 7. 옵션: 그 상품 줄이 있을 때만 교체(같은 조합은 그대로 두고 값만 바꿈, 없어진 조합은 지움 — 화면 저장과 같은 방식)
  const withOptions = todo.filter((p) => p.value!.options);
  const removeIds = withOptions.flatMap((p) => {
    const keys = new Set(p.value!.options!.variants.map((v) => v.key));
    const cur = ctx.existing.find((e) => e.id === p.id)?.variants ?? [];
    return cur.filter((v) => !keys.has(v.key) && v.id).map((v) => v.id!);
  });
  for (const part of chunks(removeIds)) {
    const { error } = await supabase.from("mall_builder_product_variants").delete().in("id", part);
    if (error) return fail("옵션", error.message);
  }
  const variantRows = withOptions.flatMap((p) =>
    p.value!.options!.variants.map((v, i) => ({
      product_id: idOf(p), store_id: storeId, key: v.key, values: v.values, extra_price: v.extra_price, stock: v.stock, sku: v.sku, is_active: v.is_active, sort: i,
    })),
  );
  for (const part of chunks(variantRows)) {
    const { error } = await supabase.from("mall_builder_product_variants").upsert(part, { onConflict: "product_id,key" });
    if (error) return fail("옵션", error.message);
  }
  return result;
}
