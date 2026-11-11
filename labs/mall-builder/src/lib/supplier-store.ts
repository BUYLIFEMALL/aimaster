// D34 공급사 읽기 — 보안 규칙(0053): 상품 권한 운영자는 몰 전체, 공급사는 자기 줄만
import { createClient } from "@/lib/supabase/server";
import { SUPPLIER_COLUMNS, type Approval, type SupplierRow, type SupplierStatus } from "@/lib/supplier";

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
};

const SP_COLUMNS = "id, store_id, name, summary, description, base_price, tax_type, status, stock_mode, stock, images, supplier_id, approval, approval_note, approval_at, updated_at";

async function withSupply(rows: Omit<SupplierProduct, "supply_price">[]): Promise<SupplierProduct[]> {
  if (!rows.length) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_product_supply").select("product_id, supply_price").in("product_id", rows.map((r) => r.id));
  const m = new Map((data ?? []).map((d) => [d.product_id as string, Number(d.supply_price)]));
  return rows.map((r) => ({ ...r, supply_price: m.get(r.id) ?? null }));
}

/** 공급사 본인: 내 상품 목록(보안 규칙이 자기 상품만 — 손님으로 보이는 다른 상품은 supplier_id로 거름) */
export async function getMySupplierProducts(supplierId: string): Promise<SupplierProduct[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_products").select(SP_COLUMNS).eq("supplier_id", supplierId).order("updated_at", { ascending: false });
  return withSupply((data ?? []) as Omit<SupplierProduct, "supply_price">[]);
}

export async function getSupplierProduct(supplierId: string, productId: string): Promise<SupplierProduct | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_products").select(SP_COLUMNS).eq("supplier_id", supplierId).eq("id", productId).maybeSingle();
  if (!data) return null;
  return (await withSupply([data as Omit<SupplierProduct, "supply_price">]))[0];
}

/** 운영자: 승인 대기 공급사 상품 */
export async function getPendingSupplierProducts(storeId: string): Promise<SupplierProduct[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_products").select(SP_COLUMNS).eq("store_id", storeId).eq("approval", "pending").not("supplier_id", "is", null).order("updated_at");
  return withSupply((data ?? []) as Omit<SupplierProduct, "supply_price">[]);
}

/** 운영자 상품 목록용: 상품 id → 공급사 이름 */
export async function getSupplierNameMap(storeId: string): Promise<Map<string, string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_suppliers").select("id, name").eq("store_id", storeId);
  return new Map((data ?? []).map((s) => [s.id as string, s.name as string]));
}
