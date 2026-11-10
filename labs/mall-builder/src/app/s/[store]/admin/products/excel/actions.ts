"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { planImport, type PlannedProduct } from "@/lib/productExcel";
import { MAX_FILE_BYTES, applyPlan, loadExcelContext, readWorkbook } from "@/lib/product-excel-server";

export type ExcelState = {
  mode: "idle" | "preview" | "applied";
  error: string | null;
  sheetErrors: string[];
  counts: { create: number; update: number; same: number; error: number };
  rows: Pick<PlannedProduct, "row" | "code" | "name" | "action" | "errors" | "changes">[];
  applied?: { created: number; updated: number };
};

const EMPTY: ExcelState["counts"] = { create: 0, update: 0, same: 0, error: 0 };
const fail = (error: string): ExcelState => ({ mode: "idle", error, sheetErrors: [], counts: EMPTY, rows: [] });

/** 파일 읽기 → 계획(미리보기·적용 공통). 적용 때도 파일을 다시 읽어 서버에서 다시 검사한다 */
type Prepared =
  | { ok: false; error: string }
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; ctx: Awaited<ReturnType<typeof loadExcelContext>>; plan: ReturnType<typeof planImport> };

async function prepare(slug: string, form: FormData): Promise<Prepared> {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "엑셀 파일을 골라 주세요." };
  if (file.size > MAX_FILE_BYTES) return { ok: false, error: "파일이 4MB를 넘습니다. 1,000개씩 나눠 올려 주세요." };
  if (!/\.xlsx$/i.test(file.name)) return { ok: false, error: "엑셀(.xlsx) 파일만 올릴 수 있습니다." };

  const supabase = await createClient();
  const { data: store } = await supabase.from("mall_builder_stores").select("id").eq("slug", slug).maybeSingle();
  if (!store) return { ok: false, error: "몰을 찾을 수 없습니다." };
  const { data: can } = await supabase.rpc("mall_builder_staff_can", { p_store_id: store.id, p_perm: "products" });
  if (can !== true) return { ok: false, error: "상품 권한이 없습니다." };

  const ctx = await loadExcelContext(supabase, store.id);
  const read = await readWorkbook(await file.arrayBuffer(), ctx.grades);
  if ("error" in read) return { ok: false, error: read.error };
  return { ok: true, supabase, ctx, plan: planImport(read.sheets, ctx) };
}

function toState(mode: ExcelState["mode"], plan: ReturnType<typeof planImport>): ExcelState {
  return {
    mode,
    error: null,
    sheetErrors: plan.sheetErrors,
    counts: plan.counts,
    rows: plan.products.map(({ row, code, name, action, errors, changes }) => ({ row, code, name, action, errors, changes })),
  };
}

export async function previewExcelAction(slug: string, _prev: ExcelState, form: FormData): Promise<ExcelState> {
  try {
    const r = await prepare(slug, form);
    if (!r.ok) return fail(r.error);
    return toState("preview", r.plan);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "파일을 확인하지 못했습니다.");
  }
}

export async function applyExcelAction(slug: string, _prev: ExcelState, form: FormData): Promise<ExcelState> {
  try {
    const r = await prepare(slug, form);
    if (!r.ok) return fail(r.error);
    const state = toState("preview", r.plan);
    if (r.plan.sheetErrors.length || r.plan.counts.error) return { ...state, error: "오류가 있어 적용하지 않았습니다. 고쳐서 다시 올려 주세요." };
    if (!r.plan.counts.create && !r.plan.counts.update) return { ...state, error: "바뀐 상품이 없습니다." };
    const res = await applyPlan(r.supabase, r.ctx, r.plan);
    revalidatePath(`/s/${slug}`, "layout");
    return { ...state, mode: res.error ? "preview" : "applied", error: res.error, applied: { created: res.created, updated: res.updated } };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "적용하지 못했습니다.");
  }
}
