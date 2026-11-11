"use server";

// D25 빠른 주문·다시 담기 — 장바구니를 채우기까지만(주문 금액은 주문 DB 함수가 다시 계산). 보안 규칙(본인 줄만·가입한 몰만)을 그대로 거친다.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MAX_QUICK_LINES, mergeQuickRows, parseQuickTable, parseQuickText, type QuickInputError } from "@/lib/quickOrder";
import { MAX_QUICK_FILE, addPlanned, planLines, readFirstSheet, resolveCodes, type PlannedQuick } from "@/lib/quick-order-server";

export type QuickState = { mode: "idle" | "preview" | "added"; error: string | null; inputErrors: QuickInputError[]; rows: PlannedQuick[]; added?: number };
const fail = (error: string, inputErrors: QuickInputError[] = []): QuickState => ({ mode: "idle", error, inputErrors, rows: [] });

async function who(slug: string) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: store } = await supabase.from("mall_builder_stores").select("id").eq("slug", slug).maybeSingle();
  if (!auth.user || !store) return null;
  const { data: customer } = await supabase.from("mall_builder_store_customers").select("id").eq("store_id", store.id).eq("user_id", auth.user.id).maybeSingle();
  if (!customer) return null;
  return { supabase, storeId: store.id as string, userId: auth.user.id };
}

type Planned =
  | { ok: false; error: string }
  | { ok: true; w: NonNullable<Awaited<ReturnType<typeof who>>>; rows: PlannedQuick[]; inputErrors: QuickInputError[] };

async function plan(slug: string, form: FormData): Promise<Planned> {
  const w = await who(slug);
  if (!w) return { ok: false, error: "로그인하고 이 몰에 가입한 뒤 쓸 수 있습니다." };
  const file = form.get("file");
  let parsed;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_QUICK_FILE) return { ok: false, error: "파일이 2MB를 넘습니다." };
    const table = await readFirstSheet(await file.arrayBuffer());
    if (!table) return { ok: false, error: "엑셀(.xlsx) 파일을 읽지 못했습니다. 양식을 내려받아 사용해 주세요." };
    parsed = parseQuickTable(table);
  } else parsed = parseQuickText(String(form.get("text") ?? ""));
  const merged = mergeQuickRows(parsed.rows);
  if (!merged.length && !parsed.errors.length) return { ok: false, error: "품번과 수량을 적어 주세요." };
  if (merged.length > MAX_QUICK_LINES) return { ok: false, error: `한 번에 ${MAX_QUICK_LINES}줄까지 담을 수 있습니다(지금 ${merged.length}줄).` };
  const wants = merged.length ? await resolveCodes(w.supabase, w.storeId, merged) : [];
  const rows = await planLines(w.supabase, w.storeId, w.userId, wants);
  return { ok: true, w, rows, inputErrors: parsed.errors };
}

export async function previewQuickAction(slug: string, _prev: QuickState, form: FormData): Promise<QuickState> {
  try {
    const p = await plan(slug, form);
    if (!p.ok) return fail(p.error);
    return { mode: "preview", error: null, inputErrors: p.inputErrors, rows: p.rows };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "확인하지 못했습니다.");
  }
}

/** 정상 줄만 담는다(결정 2). 담기 직전에 다시 검사 */
export async function addQuickAction(slug: string, _prev: QuickState, form: FormData): Promise<QuickState> {
  try {
    const p = await plan(slug, form);
    if (!p.ok) return fail(p.error);
    if (!p.rows.some((r) => r.ok)) return { mode: "preview", error: "담을 수 있는 줄이 없습니다.", inputErrors: p.inputErrors, rows: p.rows };
    const res = await addPlanned(p.w.supabase, p.w.storeId, p.w.userId, p.rows);
    revalidatePath(`/s/${slug}`, "layout");
    return { mode: res.error ? "preview" : "added", error: res.error, inputErrors: p.inputErrors, rows: p.rows, added: res.added };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "담지 못했습니다.");
  }
}

/** 주문 상세 「다시 담기」 — 그 주문 품목을 같은 수량으로(가격은 지금 가격), 살 수 없는 품목은 빼고 장바구니에서 알려 준다 */
export async function reorderAction(slug: string, orderId: string) {
  const w = await who(slug);
  if (!w) redirect(`/login?next=${encodeURIComponent(`/s/${slug}/orders/${orderId}`)}`);
  const { data: items } = await w!.supabase
    .from("mall_builder_order_items")
    .select("product_id, variant_id, qty, name_snapshot, option_snapshot, mall_builder_orders!inner(id, store_id, user_id)")
    .eq("order_id", orderId)
    .eq("mall_builder_orders.store_id", w!.storeId)
    .eq("mall_builder_orders.user_id", w!.userId);
  if (!items?.length) redirect(`/s/${slug}/cart?error=${encodeURIComponent("다시 담을 주문을 찾지 못했습니다.")}`);
  const wants = (items ?? []).map((i, n) => ({
    lines: [n + 1],
    code: String(i.name_snapshot ?? ""),
    option: String(i.option_snapshot ?? ""),
    qty: i.qty as number,
    product_id: (i.product_id as string | null) ?? null,
    variant_id: (i.variant_id as string | null) ?? null,
    error: i.product_id ? null : "지금 판매하지 않는 상품입니다.",
  }));
  const rows = await planLines(w!.supabase, w!.storeId, w!.userId, wants);
  const res = await addPlanned(w!.supabase, w!.storeId, w!.userId, rows);
  revalidatePath(`/s/${slug}`, "layout");
  const skipped = rows.filter((r) => !r.ok).map((r) => `${r.code}${r.option ? ` ${r.option}` : ""}: ${r.error}`);
  const msg = [`지난 주문에서 ${res.added}개 품목을 담았습니다(가격은 지금 가격).`, ...(skipped.length ? [`못 담은 품목 ${skipped.length}개 — ${skipped.join(" / ")}`] : []), ...(res.error ? [res.error] : [])].join(" ");
  redirect(`/s/${slug}/cart?${skipped.length || res.error ? "error" : "notice"}=${encodeURIComponent(msg)}`);
}
