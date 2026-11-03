import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CategoryRow } from "@/lib/categories";
import type { OptionGroup, Variant } from "@/lib/options";
import type { ShippingPolicy } from "@/lib/shipping";

export type Store = {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  status: "active" | "suspended";
  business_info: unknown; // readBusinessInfo()로 읽는다
  created_at: string;
};

const STORE_COLUMNS = "id, owner_id, slug, name, status, business_info, created_at";

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

/** 로그인하지 않았으면 로그인 화면으로(돌아올 주소 포함) */
export async function requireUser(next: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** 내가 운영자인 몰 목록 (보안 규칙이 내 몰만 돌려준다) */
export async function getMyStores(userId: string): Promise<Store[]> {
  const supabase = await createClient();
  const { data: staff } = await supabase
    .from("mall_builder_store_staff")
    .select("store_id")
    .eq("user_id", userId);
  const ids = (staff ?? []).map((row) => row.store_id as string);
  if (!ids.length) return [];
  const { data } = await supabase.from("mall_builder_stores").select(STORE_COLUMNS).in("id", ids).order("created_at");
  return (data ?? []) as Store[];
}

/** 주소로 몰 찾기 — 정지된 몰은 보안 규칙상 운영자에게만 보인다. 없으면 404 */
export async function getStoreBySlug(slug: string): Promise<Store> {
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_stores").select(STORE_COLUMNS).eq("slug", slug).maybeSingle();
  if (!data) notFound();
  return data as Store;
}

export async function isStoreStaff(storeId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("mall_builder_is_store_staff", { p_store_id: storeId });
  return data === true;
}

/** 몰의 카테고리 — 보안 규칙상 손님에게는 보이는 것만, 운영자에게는 숨긴 것까지 온다 */
export async function getCategoryRows(storeId: string): Promise<CategoryRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mall_builder_categories")
    .select("id, parent_id, name, depth, sort, is_visible")
    .eq("store_id", storeId);
  return (data ?? []) as CategoryRow[];
}

export type ProductRow = {
  id: string;
  name: string;
  summary: string;
  description: string;
  base_price: number;
  list_price: number | null;
  tax_type: "taxable" | "exempt";
  status: "draft" | "on_sale" | "sold_out" | "hidden";
  stock_mode: "none" | "product"; // 「product」 + 옵션이 있으면 옵션별 재고
  stock: number;
  images: { url: string; path: string }[];
  option_groups: OptionGroup[];
  shipping_policy_id: string | null;
  created_at: string;
};

export const PRODUCT_COLUMNS =
  "id, name, summary, description, base_price, list_price, tax_type, status, stock_mode, stock, images, option_groups, shipping_policy_id, created_at";

/** 몰의 배송비 정책(기본 정책이 맨 앞) */
export async function getShippingPolicies(storeId: string): Promise<ShippingPolicy[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mall_builder_shipping_policies")
    .select("id, name, type, base_fee, free_over, jeju_fee, island_fee, is_default")
    .eq("store_id", storeId)
    .order("is_default", { ascending: false })
    .order("created_at");
  return (data ?? []) as ShippingPolicy[];
}

/** 손님 화면용 상품 목록 — 판매 중·품절만(운영자가 볼 때도 손님과 같게). 카테고리·검색어로 거른다 */
export async function getShopProducts(
  storeId: string,
  opts: { categoryIds?: string[]; q?: string; limit?: number } = {},
): Promise<ProductRow[]> {
  const supabase = await createClient();
  let productIds: string[] | null = null;
  if (opts.categoryIds) {
    if (!opts.categoryIds.length) return [];
    const { data: links } = await supabase
      .from("mall_builder_product_categories")
      .select("product_id")
      .eq("store_id", storeId)
      .in("category_id", opts.categoryIds);
    productIds = [...new Set((links ?? []).map((l) => l.product_id as string))];
    if (!productIds.length) return [];
  }
  let query = supabase
    .from("mall_builder_products")
    .select(PRODUCT_COLUMNS)
    .eq("store_id", storeId)
    .in("status", ["on_sale", "sold_out"])
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 60);
  if (productIds) query = query.in("id", productIds);
  const q = opts.q?.trim();
  if (q) query = query.ilike("name", `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`);
  const { data } = await query;
  return (data ?? []) as ProductRow[];
}

/** 손님 상품 상세 — 판매 중·품절만. 없으면 null */
export async function getShopProduct(storeId: string, productId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mall_builder_products")
    .select(`${PRODUCT_COLUMNS}, mall_builder_product_categories(category_id)`)
    .eq("store_id", storeId)
    .eq("id", productId)
    .in("status", ["on_sale", "sold_out"])
    .maybeSingle();
  if (!data) return null;
  const row = data as ProductRow & { mall_builder_product_categories: { category_id: string }[] };
  return { ...row, category_ids: (row.mall_builder_product_categories ?? []).map((l) => l.category_id) };
}

/** 상품의 옵션 조합(정렬 순서대로) */
export async function getProductVariants(productId: string): Promise<(Variant & { id: string })[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mall_builder_product_variants")
    .select("id, key, values, extra_price, stock, sku, is_active")
    .eq("product_id", productId)
    .order("sort");
  return (data ?? []) as (Variant & { id: string })[];
}

/** 운영자용 상품 목록(모든 상태) — 보안 규칙상 운영자가 아니면 손님에게 보이는 것만 온다 */
export async function getStoreProducts(storeId: string): Promise<(ProductRow & { category_ids: string[] })[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mall_builder_products")
    .select(`${PRODUCT_COLUMNS}, mall_builder_product_categories(category_id)`)
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((p) => {
    const { mall_builder_product_categories: links, ...rest } = p as ProductRow & { mall_builder_product_categories: { category_id: string }[] };
    return { ...rest, category_ids: (links ?? []).map((l) => l.category_id) };
  });
}

/** 수정 화면용 상품 하나 + 원가 + 카테고리. 없으면 null */
export async function getProductForEdit(storeId: string, productId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mall_builder_products")
    .select(`${PRODUCT_COLUMNS}, mall_builder_product_private(cost, memo), mall_builder_product_categories(category_id)`)
    .eq("store_id", storeId)
    .eq("id", productId)
    .maybeSingle();
  if (!data) return null;
  const row = data as ProductRow & {
    mall_builder_product_private: { cost: number | null; memo: string } | { cost: number | null; memo: string }[] | null;
    mall_builder_product_categories: { category_id: string }[];
  };
  const priv = Array.isArray(row.mall_builder_product_private) ? row.mall_builder_product_private[0] : row.mall_builder_product_private;
  return { ...row, cost: priv?.cost ?? null, category_ids: (row.mall_builder_product_categories ?? []).map((l) => l.category_id) };
}

/** 운영자 관리 화면 공통 입구 — 로그인 확인 후 몰과 「운영자인가」를 함께 돌려준다 */
export async function getStaffStore(slug: string, path: string): Promise<{ store: Store; staff: boolean }> {
  await requireUser(path);
  const store = await getStoreBySlug(slug);
  return { store, staff: await isStoreStaff(store.id) };
}
