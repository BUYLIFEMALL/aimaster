// D34 공급사 읽기 — 보안 규칙(0053): 상품 권한 운영자는 몰 전체, 공급사는 자기 줄만
import { createClient } from "@/lib/supabase/server";
import { SUPPLIER_APPLY_COLUMNS, type SupplierApplication } from "@/lib/supplier-apply";
import type { OptionGroup, Variant } from "@/lib/options";
import { SUPPLIER_COLUMNS, type Approval, type LedgerKind, type SupplierRow, type SupplierStatus } from "@/lib/supplier";

export async function getSuppliers(storeId: string): Promise<SupplierRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_suppliers").select(SUPPLIER_COLUMNS).eq("store_id", storeId).order("created_at", { ascending: false });
  return (data ?? []) as SupplierRow[];
}

/** 이 몰에서 나(로그인 사용자)의 공급사 줄 — 입점 중·쉬는 중만 */
export async function getMySupplier(storeId: string, userId: string): Promise<SupplierRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mall_builder_suppliers")
    .select(SUPPLIER_COLUMNS)
    .eq("store_id", storeId)
    .eq("user_id", userId)
    .in("status", ["active", "paused"])
    .maybeSingle();
  return (data as SupplierRow | null) ?? null;
}

export type MySupplierStore = { store_id: string; slug: string; store_name: string; supplier_id: string; supplier_name: string; status: SupplierStatus };

/** 처음 화면 「공급사로 입점한 몰」 */
export async function getMySupplierStores(): Promise<MySupplierStore[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("mall_builder_my_supplier_stores");
  return (data ?? []) as MySupplierStore[];
}

// ── D35 공급사 상품 ──
export type SupplierProduct = {
  id: string;
  store_id: string;
  name: string;
  summary: string;
  description: string;
  base_price: number;
  tax_type: "taxable" | "exempt";
  status: "draft" | "on_sale" | "sold_out" | "hidden";
  stock_mode: "none" | "product";
  stock: number;
  images: { url: string; path: string }[];
  supplier_id: string;
  approval: Approval;
  approval_note: string;
  approval_at: string | null;
  updated_at: string;
  supply_price: number | null;
  reseller_rate: number; // M1-2(0068) 상품별 리셀러 판매수수료율
  hq_rate: number | null; // 수수료율 방식일 때 계산에 쓴 본사율
};

const SP_COLUMNS = "id, store_id, name, summary, description, base_price, tax_type, status, stock_mode, stock, images, supplier_id, approval, approval_note, approval_at, updated_at";

async function withSupply(rows: Omit<SupplierProduct, "supply_price" | "reseller_rate" | "hq_rate">[]): Promise<SupplierProduct[]> {
  if (!rows.length) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_product_supply").select("product_id, supply_price, reseller_rate, hq_rate").in("product_id", rows.map((r) => r.id));
  const m = new Map((data ?? []).map((d) => [d.product_id as string, d]));
  return rows.map((r) => {
    const d = m.get(r.id);
    return { ...r, supply_price: d ? Number(d.supply_price) : null, reseller_rate: d ? Number(d.reseller_rate) : 0, hq_rate: d?.hq_rate == null ? null : Number(d.hq_rate) };
  });
}

/** M1-1(0068) 몰의 공급가 방식·기본 본사율 */
export type SupplyConfig = { mode: "manual" | "rate"; hqRate: number };
export async function getSupplyConfig(storeId: string): Promise<SupplyConfig> {
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_stores").select("supply_mode, hq_fee_rate").eq("id", storeId).maybeSingle();
  return { mode: data?.supply_mode === "rate" ? "rate" : "manual", hqRate: data?.hq_fee_rate == null ? 3 : Number(data.hq_fee_rate) };
}

/** 공급사 본인: 내 상품 목록(보안 규칙이 자기 상품만 — 손님으로 보이는 다른 상품은 supplier_id로 거름) */
export async function getMySupplierProducts(supplierId: string): Promise<SupplierProduct[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_products").select(SP_COLUMNS).eq("supplier_id", supplierId).order("updated_at", { ascending: false });
  return withSupply((data ?? []) as Omit<SupplierProduct, "supply_price" | "reseller_rate" | "hq_rate">[]);
}

export async function getSupplierProduct(supplierId: string, productId: string): Promise<SupplierProduct | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_products").select(SP_COLUMNS).eq("supplier_id", supplierId).eq("id", productId).maybeSingle();
  if (!data) return null;
  return (await withSupply([data as Omit<SupplierProduct, "supply_price" | "reseller_rate" | "hq_rate">]))[0];
}

/** 운영자: 승인 대기 공급사 상품 */
export async function getPendingSupplierProducts(storeId: string): Promise<SupplierProduct[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_products").select(SP_COLUMNS).eq("store_id", storeId).eq("approval", "pending").not("supplier_id", "is", null).order("updated_at");
  return withSupply((data ?? []) as Omit<SupplierProduct, "supply_price" | "reseller_rate" | "hq_rate">[]);
}

/** 공급사 상품 옵션(0060): 조합 목록 + 조합별 추가 공급가(공급사 본인·상품 권한 운영자만 읽힘) */
export async function getSupplierVariants(productId: string): Promise<{ variants: (Variant & { id: string; extra_supply: number })[]; groups: OptionGroup[] }> {
  const supabase = await createClient();
  const [{ data: p }, { data: vs }, { data: sup }] = await Promise.all([
    supabase.from("mall_builder_products").select("option_groups").eq("id", productId).maybeSingle(),
    supabase.from("mall_builder_product_variants").select("id, key, values, extra_price, stock, sku, is_active").eq("product_id", productId).order("sort"),
    supabase.from("mall_builder_variant_supply").select("variant_id, extra_supply").eq("product_id", productId),
  ]);
  const extra = new Map((sup ?? []).map((r) => [r.variant_id as string, Number(r.extra_supply)]));
  const variants = ((vs ?? []) as (Variant & { id: string })[]).map((v) => ({ ...v, extra_supply: extra.get(v.id) ?? 0 }));
  return { variants, groups: ((p?.option_groups ?? []) as OptionGroup[]) };
}

/** 공급사 배송비 정책(0060) — 공급사 id → 정책(없으면 몰 기본) */
export type SupplierShippingRow = { supplier_id: string; type: "free" | "fixed" | "conditional"; base_fee: number; free_over: number | null; jeju_fee: number; island_fee: number };
export async function getSupplierShippingMap(storeId: string): Promise<Map<string, SupplierShippingRow>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mall_builder_shipping_policies")
    .select("supplier_id, type, base_fee, free_over, jeju_fee, island_fee")
    .eq("store_id", storeId)
    .not("supplier_id", "is", null);
  return new Map(((data ?? []) as SupplierShippingRow[]).map((r) => [r.supplier_id, r]));
}

/** 운영자 상품 목록용: 상품 id → 공급사 이름 */
export async function getSupplierNameMap(storeId: string): Promise<Map<string, string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_suppliers").select("id, name").eq("store_id", storeId);
  return new Map((data ?? []).map((s) => [s.id as string, s.name as string]));
}

// ── D36 주문 분배·발송 ──
export type SupplierOrderItem = {
  item_id: string;
  order_no: string;
  ordered_at: string;
  order_status: string;
  name: string;
  option: string | null;
  qty: number;
  cancelled_qty: number;
  supply_price: number;
  courier: string;
  tracking_no: string;
  shipped_at: string | null;
  receiver: { receiver: string; phone: string; zip: string; addr1: string; addr2: string; memo: string | null } | null;
};

/** 공급사 본인: 내 주문 품목(입금 확인된 주문만, 받는 사람은 결제 완료~배송 중일 때만 — DB 함수 0055) */
export async function getSupplierOrders(storeId: string): Promise<{ items: SupplierOrderItem[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mall_builder_supplier_orders", { p_store_id: storeId });
  return { items: (data ?? []) as SupplierOrderItem[], error: error?.message ?? null };
}

export type ItemShipping = { courier: string; tracking_no: string; shipped_at: string | null; supplier_name?: string };

/** 주문 상세(손님·운영자): 품목 id → 공급사 발송 송장(공급가 없음) */
export async function getItemTracking(orderId: string): Promise<Map<string, ItemShipping>> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("mall_builder_order_item_tracking", { p_order_id: orderId });
  return new Map(((data ?? []) as { order_item_id: string; courier: string; tracking_no: string; shipped_at: string }[]).map((r) => [r.order_item_id, r]));
}

/** 운영자 주문 상세: 품목 id → 공급사 이름·공급가·발송 상태(주문 권한 운영자만 읽힘) */
export async function getItemSupplyForAdmin(orderId: string): Promise<Map<string, ItemShipping & { supply_price: number }>> {
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_order_item_supply").select("order_item_id, supplier_id, supply_price, courier, tracking_no, shipped_at").eq("order_id", orderId);
  if (!data?.length) return new Map();
  const { data: sups } = await supabase.from("mall_builder_suppliers").select("id, name").in("id", [...new Set(data.map((d) => d.supplier_id as string))]);
  const name = new Map((sups ?? []).map((s) => [s.id as string, s.name as string]));
  return new Map(data.map((d) => [d.order_item_id as string, {
    courier: d.courier as string, tracking_no: d.tracking_no as string, shipped_at: d.shipped_at as string | null,
    supply_price: Number(d.supply_price), supplier_name: name.get(d.supplier_id as string) ?? "공급사",
  }]));
}

// ── D37 공급사 정산 ──
export type SupplierLedgerRow = { id: string; supplier_id: string; order_id: string | null; kind: LedgerKind; amount: number; balance_after: number; note: string; created_at: string };
export type SupplierSettlementRow = { id: string; supplier_id: string; amount: number; memo: string; paid_at: string };

/** 장부(공급사 하나 또는 몰 전체) — 보안 규칙: 주문 권한 운영자·공급사 본인 */
export async function getSupplierLedger(opts: { supplierId?: string; storeId?: string; limit?: number }): Promise<SupplierLedgerRow[]> {
  const supabase = await createClient();
  let q = supabase.from("mall_builder_supplier_ledger").select("id, supplier_id, order_id, kind, amount, balance_after, note, created_at").order("created_at", { ascending: false }).limit(opts.limit ?? 2000);
  if (opts.supplierId) q = q.eq("supplier_id", opts.supplierId);
  if (opts.storeId) q = q.eq("store_id", opts.storeId);
  const { data } = await q;
  return ((data ?? []) as SupplierLedgerRow[]).map((r) => ({ ...r, amount: Number(r.amount), balance_after: Number(r.balance_after) }));
}

export async function getSupplierSettlements(opts: { supplierId?: string; storeId?: string }): Promise<SupplierSettlementRow[]> {
  const supabase = await createClient();
  let q = supabase.from("mall_builder_supplier_settlements").select("id, supplier_id, amount, memo, paid_at").order("paid_at", { ascending: false }).limit(200);
  if (opts.supplierId) q = q.eq("supplier_id", opts.supplierId);
  if (opts.storeId) q = q.eq("store_id", opts.storeId);
  const { data } = await q;
  return ((data ?? []) as SupplierSettlementRow[]).map((r) => ({ ...r, amount: Number(r.amount) }));
}

// ── M1-0(0070) 공급사 입점 신청 ──
/** 몰 운영자(상품 권한): 이 몰의 입점 신청(대기 먼저) */
export async function getSupplierApplications(storeId: string): Promise<SupplierApplication[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mall_builder_supplier_applications")
    .select(SUPPLIER_APPLY_COLUMNS)
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []) as SupplierApplication[];
  return [...rows.filter((r) => r.status === "pending"), ...rows.filter((r) => r.status !== "pending")];
}

/** 신청자 본인: 이 몰에 낸 가장 최근 신청 */
export async function getMySupplierApplication(storeId: string, userId: string): Promise<SupplierApplication | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mall_builder_supplier_applications")
    .select(SUPPLIER_APPLY_COLUMNS)
    .eq("store_id", storeId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as SupplierApplication | null) ?? null;
}
