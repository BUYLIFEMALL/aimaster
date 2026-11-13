// T2 분양몰 읽기(0061) — 보안 규칙: 신청은 신청자 본인·원본 몰 대표만 읽힘
import { createClient } from "@/lib/supabase/server";
import type { ResaleApplication } from "@/lib/resale";

const APP_COLUMNS = "id, source_store_id, user_id, slug, name, phone, channel, memo, status, note, store_id, created_at, decided_at";

export type ResaleSource = { id: string; slug: string; name: string };

/** 분양을 받는 몰(공개) */
export async function getResaleSources(): Promise<ResaleSource[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("mall_builder_resale_sources");
  return (data ?? []) as ResaleSource[];
}

/** 내 분양 신청(최근 순) */
export async function getMyResaleApplications(userId: string): Promise<ResaleApplication[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_resale_applications").select(APP_COLUMNS).eq("user_id", userId).order("created_at", { ascending: false });
  return (data ?? []) as ResaleApplication[];
}

/** 원본 몰 대표: 이 몰에 들어온 분양 신청 */
export async function getStoreResaleApplications(storeId: string): Promise<ResaleApplication[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_resale_applications").select(APP_COLUMNS).eq("source_store_id", storeId).order("created_at", { ascending: false }).limit(200);
  return (data ?? []) as ResaleApplication[];
}

/** 분양몰 몇 개를 id로(신청자 화면 — 영업 중 몰은 누구나 읽힘, 멈춘 몰은 대표·직원만) */
export async function getStoresByIds(ids: string[]): Promise<ResaleStoreRow[]> {
  if (!ids.length) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_stores").select("id, slug, name, owner_id, status, resale_expires_at, created_at").in("id", ids);
  return (data ?? []) as ResaleStoreRow[];
}

export type ResaleStoreRow ={ id: string; slug: string; name: string; owner_id: string; status: string; resale_expires_at: string | null; created_at: string };

/** 원본 몰 대표: 이 몰의 분양몰 목록(분양몰 읽기는 몰 표 보안 규칙 — 영업 중 몰은 누구나 읽힘) */
export async function getResaleStoresOf(sourceStoreId: string): Promise<ResaleStoreRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mall_builder_stores")
    .select("id, slug, name, owner_id, status, resale_expires_at, created_at")
    .eq("source_store_id", sourceStoreId)
    .order("created_at", { ascending: false });
  return (data ?? []) as ResaleStoreRow[];
}

// ── T2-2 거울 상품 ──
export type ResaleCatalogRow = { id: string; name: string; base_price: number; status: string; stock_mode: string; stock: number; image: string | null; option_count: number; added: boolean };

/** 분양자: 담을 수 있는 본사 상품 */
export async function getResaleCatalog(storeId: string, q?: string): Promise<{ rows: ResaleCatalogRow[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mall_builder_resale_catalog", { p_store_id: storeId, p_q: q ?? null });
  return { rows: (data ?? []) as ResaleCatalogRow[], error: error?.message ?? null };
}

export type ResaleMirrorRow = { id: string; name: string; base_price: number; status: string; stock_mode: string; stock: number; source_product_id: string; source_price: number | null };

/** 분양자: 내 분양 상품(거울) + 지금 본사 판매가 */
export async function getResaleMirrors(storeId: string): Promise<ResaleMirrorRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mall_builder_products")
    .select("id, name, base_price, status, stock_mode, stock, source_product_id")
    .eq("store_id", storeId)
    .not("source_product_id", "is", null)
    .order("updated_at", { ascending: false });
  const rows = (data ?? []) as Omit<ResaleMirrorRow, "source_price">[];
  if (!rows.length) return [];
  const { data: src } = await supabase.from("mall_builder_products").select("id, base_price").in("id", rows.map((r) => r.source_product_id));
  const price = new Map((src ?? []).map((s) => [s.id as string, Number(s.base_price)]));
  return rows.map((r) => ({ ...r, base_price: Number(r.base_price), source_price: price.get(r.source_product_id) ?? null }));
}

// ── T2-3·T2-4 주문·정산(0063) ──
export type ResaleOrderRow = { id: string; store_slug: string; store_name: string; order_no: string; status: string; total: number; depositor: string; created_at: string; forwarded_order_id: string | null; margin: number };

/** 본사: 분양몰 주문(입금 대기 먼저) */
export async function getResaleOrders(sourceStoreId: string): Promise<ResaleOrderRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("mall_builder_resale_orders", { p_source_store_id: sourceStoreId });
  return ((data ?? []) as ResaleOrderRow[]).map((r) => ({ ...r, total: Number(r.total), margin: Number(r.margin) }));
}

export type ResaleLedgerRow = { id: string; order_id: string | null; kind: "earn" | "reclaim" | "payout" | "refund"; amount: number; balance_after: number; note: string; created_at: string };
export type ResalePayoutRow = { id: string; store_id: string; amount: number; bank_name: string; bank_account: string; bank_holder: string; status: "requested" | "paid" | "rejected"; memo: string; requested_at: string; decided_at: string | null };

/** 분양자: 내 장부(최근 100) */
export async function getResaleLedger(storeId: string): Promise<ResaleLedgerRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_resale_ledger").select("id, order_id, kind, amount, balance_after, note, created_at").eq("store_id", storeId).order("created_at", { ascending: false }).limit(100);
  return ((data ?? []) as ResaleLedgerRow[]).map((r) => ({ ...r, amount: Number(r.amount), balance_after: Number(r.balance_after) }));
}

/** 출금 신청 — 분양자는 자기 몰(storeId), 본사는 원본 몰(sourceStoreId) 기준 */
export async function getResalePayouts(opts: { storeId?: string; sourceStoreId?: string }): Promise<ResalePayoutRow[]> {
  const supabase = await createClient();
  let q = supabase.from("mall_builder_resale_payouts").select("id, store_id, amount, bank_name, bank_account, bank_holder, status, memo, requested_at, decided_at");
  if (opts.storeId) q = q.eq("store_id", opts.storeId);
  if (opts.sourceStoreId) q = q.eq("source_store_id", opts.sourceStoreId);
  const { data } = await q.order("requested_at", { ascending: false }).limit(100);
  return ((data ?? []) as ResalePayoutRow[]).map((r) => ({ ...r, amount: Number(r.amount) }));
}
