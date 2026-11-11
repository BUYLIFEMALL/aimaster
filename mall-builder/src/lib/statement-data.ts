// D26 거래명세서·외상 원장 — 화면용 데이터 읽기(서버). 보안 규칙(손님 본인·그 몰 직원)을 그대로 거치고,
// 직원은 메뉴 권한(주문 / 손님)까지 확인한다. 직원이 남의 서류를 볼 때는 D22 열람 기록을 남긴다.

import { notFound } from "next/navigation";
import { createClient } from "./supabase/server";
import { getOrder, getStoreBySlug, getStoreCustomer, logStaffView, requireUser } from "./store";
import { readBusinessInfo } from "./businessInfo";
import { buildLedger, buildStatement, type LedgerInput, type StatementItemInput } from "./statements";
import type { LedgerKind } from "./credit";

async function staffCan(storeId: string, perm: "orders" | "customers") {
  const supabase = await createClient();
  const { data } = await supabase.rpc("mall_builder_staff_can", { p_store_id: storeId, p_perm: perm });
  return data === true;
}

/** 거래명세서 — 주문 낸 손님 본인 또는 「주문」 권한 직원 */
export async function loadOrderStatement(slug: string, orderId: string) {
  if (!/^[0-9a-f-]{36}$/.test(orderId)) notFound();
  const user = await requireUser(`/s/${slug}/doc/order/${orderId}`);
  const store = await getStoreBySlug(slug);
  const got = await getOrder(store.id, orderId);
  if (!got) notFound();
  const own = got.order.user_id === user.id;
  const staff = !own && (await staffCan(store.id, "orders"));
  if (!own && !staff) notFound();
  if (staff) await logStaffView(store.id, "order", orderId);

  const supabase = await createClient();
  const { data: o } = await supabase.from("mall_builder_orders").select("customer_id").eq("id", orderId).maybeSingle();
  const customer = o?.customer_id ? await getStoreCustomer(store.id, o.customer_id as string) : null;
  const ids = [...new Set(got.items.map((i) => i.product_id).filter((x): x is string => !!x))];
  const { data: products } = ids.length ? await supabase.from("mall_builder_products").select("id, tax_type").in("id", ids) : { data: [] };
  const taxOf = new Map((products ?? []).map((p) => [p.id as string, p.tax_type as "taxable" | "exempt"]));
  const items: StatementItemInput[] = got.items.map((i) => ({
    name: i.name_snapshot,
    option: i.option_snapshot ?? "",
    unit_price: Number(i.unit_price),
    qty: i.qty,
    cancelled_qty: i.cancelled_qty ?? 0,
    tax_type: (i.product_id && taxOf.get(i.product_id)) || "taxable", // 세금계산서 DB 함수와 같게 모르면 과세
  }));
  const o2 = got.order;
  const statement = buildStatement(
    { subtotal: Number(o2.subtotal), shipping_fee: Number(o2.shipping_fee), coupon_discount: Number(o2.coupon_discount ?? 0), point_used: Number(o2.point_used ?? 0) },
    items,
  );
  return { store, info: readBusinessInfo(store.business_info), order: o2, customer, statement, staff };
}

/** 외상 원장 — 그 손님 본인 또는 「손님」 권한 직원 */
export async function loadLedger(slug: string, customerId: string, from: string, to: string) {
  if (!/^[0-9a-f-]{36}$/.test(customerId)) notFound();
  const user = await requireUser(`/s/${slug}/doc/ledger/${customerId}`);
  const store = await getStoreBySlug(slug);
  const customer = await getStoreCustomer(store.id, customerId);
  if (!customer) notFound();
  const own = customer.user_id === user.id;
  const staff = !own && (await staffCan(store.id, "customers"));
  if (!own && !staff) notFound();
  if (staff) await logStaffView(store.id, "customer", customerId);

  const supabase = await createClient();
  const { data } = await supabase
    .from("mall_builder_credit_ledger")
    .select("kind, amount, balance_after, note, created_at, mall_builder_orders(order_no)")
    .eq("customer_id", customerId)
    .order("created_at")
    .limit(10000);
  type Raw = { kind: LedgerKind; amount: number; balance_after: number; note: string; created_at: string; mall_builder_orders: { order_no: string } | { order_no: string }[] | null };
  const entries: LedgerInput[] = ((data ?? []) as unknown as Raw[]).map((e) => {
    const ord = Array.isArray(e.mall_builder_orders) ? e.mall_builder_orders[0] : e.mall_builder_orders;
    return { kind: e.kind, amount: Number(e.amount), balance_after: Number(e.balance_after), note: e.note ?? "", created_at: e.created_at, order_no: ord?.order_no ?? null };
  });
  return { store, info: readBusinessInfo(store.business_info), customer, ledger: buildLedger(entries, from, to), staff };
}
