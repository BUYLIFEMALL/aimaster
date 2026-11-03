import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildCategoryTree, flattenTree, type CategoryRow } from "@/lib/categories";
import type { OptionGroup, Variant } from "@/lib/options";
import type { ShippingPolicy } from "@/lib/shipping";
import { ORDER_COLUMNS, type OrderEventRow, type OrderItemRow, type OrderRow } from "@/lib/orders";
import type { ApprovalStatus } from "@/lib/business";
import type { QuoteStatus } from "@/lib/quotes";
import type { LedgerKind } from "@/lib/credit";
import { priceLine, viewerOf, type GradePrice, type PriceContext, type VolumeTier } from "@/lib/pricing";
import { readDoc, type BlocksDoc, type ShowcaseSettings } from "@/lib/blocks";
import { cache } from "react";

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
  visibility: "public" | "members" | "business_only";
  price_visibility: "all" | "login" | "approved_business";
  moq: number;
  order_unit: number;
  max_qty: number | null;
  created_at: string;
};

export const PRODUCT_COLUMNS =
  "id, name, summary, description, base_price, list_price, tax_type, status, stock_mode, stock, images, option_groups, shipping_policy_id, visibility, price_visibility, moq, order_unit, max_qty, created_at";

/** 상품별 수량 구간 할인(공개) — 상품 id → 구간 목록(작은 수량부터) */
export async function getTierMap(productIds: string[]): Promise<Map<string, VolumeTier[]>> {
  const map = new Map<string, VolumeTier[]>();
  if (!productIds.length) return map;
  const supabase = await createClient();
  const { data } = await supabase
    .from("mall_builder_product_volume_tiers")
    .select("product_id, min_qty, discount_type, value")
    .in("product_id", productIds)
    .order("min_qty");
  for (const r of data ?? []) {
    const list = map.get(r.product_id as string) ?? [];
    list.push({ min_qty: r.min_qty as number, discount_type: r.discount_type as VolumeTier["discount_type"], value: Number(r.value) });
    map.set(r.product_id as string, list);
  }
  return map;
}

/** 지금 보는 사람(손님 화면) — 요청마다 한 번만 읽는다 */
export const getShopper = cache(async (storeId: string) => {
  const user = await getCurrentUser();
  const customer = user ? await getMyCustomer(storeId, user.id) : null;
  return {
    user,
    customer,
    viewer: viewerOf(customer, !!user),
    // 사업자 등급은 승인 때만 붙으므로 손님의 등급 그대로(주문 DB 함수도 같은 등급으로 계산)
    gradeId: customer?.grade_id ?? null,
    gradeName: customer?.grade?.name ?? null,
  };
});

/** 내 등급의 등급가(상품 id → 금액/할인율) — 보안 규칙상 내 등급 것만 온다 */
export async function getGradePriceMap(storeId: string, gradeId: string | null, productIds: string[]): Promise<Map<string, GradePrice>> {
  const map = new Map<string, GradePrice>();
  if (!gradeId || !productIds.length) return map;
  const supabase = await createClient();
  const { data } = await supabase
    .from("mall_builder_product_grade_prices")
    .select("product_id, price, discount_rate")
    .eq("store_id", storeId)
    .eq("grade_id", gradeId)
    .in("product_id", productIds);
  for (const r of data ?? []) map.set(r.product_id as string, { price: r.price as number | null, discount_rate: r.discount_rate as number | null });
  return map;
}

export type Grade = { id: string; code: string; name: string; rank: number; is_business: boolean };

/** 몰 등급 목록(낮은 등급부터) */
export async function getGrades(storeId: string): Promise<Grade[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_customer_grades").select("id, code, name, rank, is_business").eq("store_id", storeId).order("rank");
  return (data ?? []) as Grade[];
}

/** 상품의 등급가(운영자 편집용) — 등급 id → 입력 칸 글자("8000" 또는 "15%") */
export async function getProductGradePriceInputs(productId: string): Promise<Record<string, string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_product_grade_prices").select("grade_id, price, discount_rate").eq("product_id", productId);
  return Object.fromEntries((data ?? []).map((r) => [r.grade_id as string, r.price != null ? String(r.price) : `${r.discount_rate}%`]));
}

/** 상품 여러 개의 가격 문맥(장바구니·주문서) — 상품 id를 주면 그 상품의 문맥 */
export async function getPriceContexts(storeId: string, productIds: string[]): Promise<(productId: string) => PriceContext> {
  const shopper = await getShopper(storeId);
  const [prices, tiers] = await Promise.all([getGradePriceMap(storeId, shopper.gradeId, productIds), getTierMap(productIds)]);
  return (productId) => ({
    viewer: shopper.viewer,
    gradePrice: prices.get(productId) ?? null,
    gradeName: shopper.gradeName ?? undefined,
    tiers: tiers.get(productId) ?? [],
  });
}

/** 손님 화면 가격 문맥(상품 하나) — 가격 엔진 priceLine의 네 번째 인자 */
export async function getPriceContext(storeId: string, productId: string): Promise<PriceContext> {
  return (await getPriceContexts(storeId, [productId]))(productId);
}

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
  opts: { categoryIds?: string[]; ids?: string[]; q?: string; limit?: number } = {},
): Promise<ShopProduct[]> {
  const supabase = await createClient();
  let productIds: string[] | null = opts.ids ?? null;
  if (productIds && !productIds.length) return [];
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
  return withDisplayPrices(storeId, (data ?? []) as ProductRow[]);
}

export type ShopProduct = ProductRow & { display: { unitPrice: number; priceHidden: boolean; note: string } };

/** 보는 사람 기준으로 사업자 전용 상품을 빼고, 카드에 보여 줄 가격(등급가·비공개 반영)을 붙인다 */
async function withDisplayPrices(storeId: string, rows: ProductRow[]): Promise<ShopProduct[]> {
  const shopper = await getShopper(storeId);
  const prices = await getGradePriceMap(storeId, shopper.gradeId, rows.map((r) => r.id));
  const out: ShopProduct[] = [];
  for (const r of rows) {
    // 옵션 상품도 카드에는 기본 판매가 기준(옵션 추가금 없이)으로 보여 준다
    const line = priceLine({ ...r, option_groups: [] }, null, 1, {
      viewer: shopper.viewer,
      gradePrice: prices.get(r.id) ?? null,
      gradeName: shopper.gradeName ?? undefined,
    });
    if (!line.visible) continue;
    out.push({ ...r, display: { unitPrice: line.unitPrice, priceHidden: line.priceHidden, note: line.priceHidden ? line.errors.find((e) => /가격/.test(e)) ?? "" : "" } });
  }
  return out;
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

export type StoreCustomer = {
  id: string;
  store_id: string;
  user_id: string;
  name: string;
  phone: string;
  marketing_agree: boolean;
  created_at: string;
  kind: "consumer" | "business";
  grade_id: string | null;
  approval_status: ApprovalStatus;
  business_no: string | null;
  company: string | null;
  ceo_name: string | null;
  cert_path: string | null;
  reject_reason: string | null;
  applied_at: string | null;
  reviewed_at: string | null;
  credit_limit: number;
  grade: { name: string; code: string; is_business: boolean } | null;
};

export type LedgerEntry = { id: string; kind: LedgerKind; amount: number; balance_after: number; note: string; order_id: string | null; created_at: string };

/** 외상 장부(최근 순)와 지금 사용 중 금액 — 보안 규칙상 그 손님 본인과 그 몰 운영자만 */
export async function getCreditLedger(customerId: string): Promise<{ balance: number; entries: LedgerEntry[] }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mall_builder_credit_ledger")
    .select("id, kind, amount, balance_after, note, order_id, created_at")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(200);
  const entries = ((data ?? []) as LedgerEntry[]).map((e) => ({ ...e, amount: Number(e.amount), balance_after: Number(e.balance_after) }));
  return { balance: entries[0]?.balance_after ?? 0, entries };
}
const CUSTOMER_COLUMNS =
  "id, store_id, user_id, name, phone, marketing_agree, created_at, kind, grade_id, approval_status, business_no, company, ceo_name, cert_path, reject_reason, applied_at, reviewed_at, credit_limit, grade:mall_builder_customer_grades(name, code, is_business)";
export type CustomerAddress = {
  id: string; label: string; receiver: string; phone: string; zip: string; addr1: string; addr2: string; is_default: boolean;
};

/** 이 몰에 내가 가입한 줄(없으면 null) — 몰마다 따로 가입한다 */
export async function getMyCustomer(storeId: string, userId: string): Promise<StoreCustomer | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mall_builder_store_customers")
    .select(CUSTOMER_COLUMNS)
    .eq("store_id", storeId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as unknown as StoreCustomer | null) ?? null;
}

/** 운영자 손님 목록(이 몰) — 승인 상태로 거르기. 승인 대기가 먼저 */
export async function getStoreCustomers(storeId: string, approval?: ApprovalStatus): Promise<StoreCustomer[]> {
  const supabase = await createClient();
  let query = supabase.from("mall_builder_store_customers").select(CUSTOMER_COLUMNS).eq("store_id", storeId).order("created_at", { ascending: false }).limit(300);
  if (approval) query = query.eq("approval_status", approval);
  const { data } = await query;
  return (data ?? []) as unknown as StoreCustomer[];
}

/** 손님 한 명(운영자 화면) — 보안 규칙상 그 몰 운영자(또는 본인)만 받는다 */
export async function getStoreCustomer(storeId: string, customerId: string): Promise<StoreCustomer | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_store_customers").select(CUSTOMER_COLUMNS).eq("store_id", storeId).eq("id", customerId).maybeSingle();
  return (data as unknown as StoreCustomer | null) ?? null;
}

/** 사업자등록증 보기 주소(10분) — 비공개 저장소라 서명 주소로만 */
export async function getCertUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage.from("mall-builder-private").createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}

export type CartRow = {
  id: string;
  qty: number;
  product: ProductRow;
  variant: (Variant & { id: string }) | null;
};

/** 내 장바구니(이 몰) — 상품·옵션을 함께 가져온다. 금액은 화면에서 pricing.ts로 계산 */
export async function getCart(storeId: string, userId: string): Promise<CartRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mall_builder_cart_items")
    .select(`id, qty, mall_builder_products(${PRODUCT_COLUMNS}), mall_builder_product_variants(id, key, values, extra_price, stock, sku, is_active)`)
    .eq("store_id", storeId)
    .eq("user_id", userId)
    .order("created_at");
  type Raw = { id: string; qty: number; mall_builder_products: ProductRow | null; mall_builder_product_variants: (Variant & { id: string }) | null };
  return ((data ?? []) as unknown as Raw[])
    .filter((r) => r.mall_builder_products) // 손님에게 안 보이게 된 상품(숨김 등)은 빼고 보여 준다
    .map((r) => ({ id: r.id, qty: r.qty, product: r.mall_builder_products!, variant: r.mall_builder_product_variants }));
}

/** 내 주문 목록(이 몰, 최근 순) */
export async function getMyOrders(storeId: string, userId: string): Promise<(OrderRow & { item_count: number; first_item: string })[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mall_builder_orders")
    .select(`${ORDER_COLUMNS}, mall_builder_order_items(name_snapshot)`)
    .eq("store_id", storeId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  type Raw = OrderRow & { mall_builder_order_items: { name_snapshot: string }[] };
  return ((data ?? []) as unknown as Raw[]).map(({ mall_builder_order_items: items, ...o }) => ({
    ...o,
    item_count: items.length,
    first_item: items[0]?.name_snapshot ?? "",
  }));
}

/** 운영자 주문 목록(이 몰, 최근 순) — 상태로 거르기. 보안 규칙상 운영자가 아니면 자기 주문만 온다 */
export async function getStoreOrders(storeId: string, status?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("mall_builder_orders")
    .select(`${ORDER_COLUMNS}, mall_builder_order_items(name_snapshot)`)
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (status) query = query.eq("status", status);
  const { data } = await query;
  type Raw = OrderRow & { mall_builder_order_items: { name_snapshot: string }[] };
  return ((data ?? []) as unknown as Raw[]).map(({ mall_builder_order_items: items, ...o }) => ({
    ...o,
    item_count: items.length,
    first_item: items[0]?.name_snapshot ?? "",
  }));
}

/** 상태별 주문 수(운영자 탭 숫자) */
export async function getOrderCounts(storeId: string): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_orders").select("status").eq("store_id", storeId).limit(5000);
  const counts: Record<string, number> = {};
  for (const row of data ?? []) counts[row.status as string] = (counts[row.status as string] ?? 0) + 1;
  return counts;
}

/** 주문 하나(품목·이력 포함) — 보안 규칙상 주문한 손님과 그 몰 운영자만 받는다. 없으면 null */
export async function getOrder(storeId: string, orderId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_orders").select(`${ORDER_COLUMNS}, user_id`).eq("store_id", storeId).eq("id", orderId).maybeSingle();
  if (!data) return null;
  const [{ data: items }, { data: events }] = await Promise.all([
    supabase
      .from("mall_builder_order_items")
      .select("id, product_id, name_snapshot, option_snapshot, image_url, unit_price, qty, line_total")
      .eq("order_id", orderId),
    supabase.from("mall_builder_order_events").select("id, from_status, to_status, actor_role, note, created_at").eq("order_id", orderId).order("created_at"),
  ]);
  return {
    order: data as OrderRow & { user_id: string },
    items: (items ?? []) as OrderItemRow[],
    events: (events ?? []) as OrderEventRow[],
  };
}

export type QuoteRow = {
  id: string;
  quote_no: string;
  status: QuoteStatus;
  request_note: string;
  answer_note: string;
  valid_until: string | null;
  order_id: string | null;
  created_at: string;
  answered_at: string | null;
  user_id: string;
  customer: { name: string; company: string | null } | null;
};
export type QuoteItemRow = {
  id: string;
  product_id: string | null;
  name_snapshot: string;
  option_snapshot: string;
  qty: number;
  ref_unit_price: number | null;
  quoted_price: number | null;
};
const QUOTE_COLUMNS =
  "id, quote_no, status, request_note, answer_note, valid_until, order_id, created_at, answered_at, user_id, customer:mall_builder_store_customers(name, company)";

/** 견적 목록 — 손님은 자기 것만(userId), 운영자는 몰 전체(userId 없이). 보안 규칙이 한 번 더 거른다 */
export async function getQuotes(storeId: string, userId?: string): Promise<(QuoteRow & { item_count: number; first_item: string })[]> {
  const supabase = await createClient();
  let query = supabase
    .from("mall_builder_quotes")
    .select(`${QUOTE_COLUMNS}, mall_builder_quote_items(name_snapshot)`)
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (userId) query = query.eq("user_id", userId);
  const { data } = await query;
  type Raw = QuoteRow & { mall_builder_quote_items: { name_snapshot: string }[] };
  return ((data ?? []) as unknown as Raw[]).map(({ mall_builder_quote_items: items, ...q }) => ({
    ...q,
    item_count: items.length,
    first_item: items[0]?.name_snapshot ?? "",
  }));
}

/** 견적 하나(품목 포함) — 없으면 null */
export async function getQuote(storeId: string, quoteId: string): Promise<{ quote: QuoteRow; items: QuoteItemRow[] } | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("mall_builder_quotes").select(QUOTE_COLUMNS).eq("store_id", storeId).eq("id", quoteId).maybeSingle();
  if (!data) return null;
  const { data: items } = await supabase
    .from("mall_builder_quote_items")
    .select("id, product_id, name_snapshot, option_snapshot, qty, ref_unit_price, quoted_price")
    .eq("quote_id", quoteId);
  return { quote: data as unknown as QuoteRow, items: (items ?? []) as QuoteItemRow[] };
}

/** 장바구니 줄 수(머리글 표시용) */
export async function getCartCount(storeId: string, userId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("mall_builder_cart_items")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("user_id", userId);
  return count ?? 0;
}

/** 내 배송지 — 기본 배송지가 먼저 */
export async function getMyAddresses(customerId: string): Promise<CustomerAddress[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mall_builder_customer_addresses")
    .select("id, label, receiver, phone, zip, addr1, addr2, is_default")
    .eq("customer_id", customerId)
    .order("is_default", { ascending: false })
    .order("created_at");
  return (data ?? []) as CustomerAddress[];
}

/** 손님 첫 화면 — 게시된 블록만(초안은 DB 함수가 돌려주지 않는다). 게시 전이면 빈 문서 */
export async function getPublishedHome(storeId: string): Promise<BlocksDoc> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("mall_builder_published_page", { p_store_id: storeId });
  return readDoc(data);
}

/** 상품 쇼윈도 블록의 상품 — 판매 중·품절만, 보는 사람 기준 가격. 직접 선택은 고른 순서대로, 카테고리는 하위 카테고리 포함 */
export async function getShowcaseProducts(storeId: string, s: ShowcaseSettings): Promise<ShopProduct[]> {
  if (s.source === "manual") {
    const list = await getShopProducts(storeId, { ids: s.product_ids, limit: 24 });
    const order = new Map(s.product_ids.map((id, i) => [id, i]));
    return list.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)).slice(0, s.limit);
  }
  if (s.source === "category") {
    const node = flattenTree(buildCategoryTree(await getCategoryRows(storeId), false)).find((c) => c.id === s.category_id);
    if (!node) return [];
    return getShopProducts(storeId, { categoryIds: flattenTree([node]).map((c) => c.id), limit: s.limit });
  }
  return getShopProducts(storeId, { limit: s.limit });
}

export type Notice = { id: string; title: string; body: string; is_pinned: boolean; created_at: string; updated_at: string };

/** 공지 목록 — 상단 고정 먼저, 그다음 최근 순 */
export async function getNotices(storeId: string, limit = 50): Promise<Notice[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mall_builder_notices")
    .select("id, title, body, is_pinned, created_at, updated_at")
    .eq("store_id", storeId)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Notice[];
}

export async function getNotice(storeId: string, id: string): Promise<Notice | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mall_builder_notices")
    .select("id, title, body, is_pinned, created_at, updated_at")
    .eq("store_id", storeId)
    .eq("id", id)
    .maybeSingle();
  return (data as Notice) ?? null;
}

/** 운영자 편집 화면 — 초안·게시본·저장 시각(표 읽기는 운영자만 허용) */
export async function getHomeForEdit(storeId: string): Promise<{ draft: BlocksDoc; published: BlocksDoc | null; draftAt: string | null; publishedAt: string | null }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mall_builder_pages")
    .select("draft_blocks, published_blocks, draft_updated_at, published_at")
    .eq("store_id", storeId)
    .eq("kind", "home")
    .maybeSingle();
  return {
    draft: readDoc(data?.draft_blocks),
    published: data?.published_blocks ? readDoc(data.published_blocks) : null,
    draftAt: data?.draft_updated_at ?? null,
    publishedAt: data?.published_at ?? null,
  };
}
