// D34 공급사 읽기 — 보안 규칙(0053): 상품 권한 운영자는 몰 전체, 공급사는 자기 줄만
import { createClient } from "@/lib/supabase/server";
import { SUPPLIER_COLUMNS, type SupplierRow, type SupplierStatus } from "@/lib/supplier";

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
