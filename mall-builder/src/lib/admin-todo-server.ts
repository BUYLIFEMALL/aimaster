// M2-3(2026-11-15) 운영사 대시보드 「처리할 일」 숫자 — 건수만(head) 동시에 센다. 볼 수 없는 메뉴는 세지 않는다.
// 보안 규칙(RLS)상 못 읽는 표는 0으로 보인다(직원 권한과 같은 결과).
import type { SupabaseClient } from "@supabase/supabase-js";
import { orderTodoQueries, type ProductKey, type TodoCounts, type WaitingKey } from "./admin-todo";
import { applyOrderFilters } from "./order-list";

type CountQuery = PromiseLike<{ count: number | null }>;
/** 건수 조회에 쓰는 메서드만 — Supabase 전체 타입을 그대로 쓰면 조건 함수와 엮일 때 타입 계산이 너무 깊어진다 */
type CountBuilder = CountQuery & {
  eq(col: string, v: string | boolean): CountBuilder;
  is(col: string, v: null): CountBuilder;
  in(col: string, v: string[]): CountBuilder;
  gte(col: string, v: string): CountBuilder;
  lt(col: string, v: string): CountBuilder;
  lte(col: string, v: number): CountBuilder;
  or(filter: string): CountBuilder;
};

export async function loadTodoCounts(supabase: SupabaseClient, storeId: string, now: Date, can: (menu: string) => boolean): Promise<TodoCounts> {
  const head = (table: string) => supabase.from(table).select("id", { count: "exact", head: true }) as unknown as CountBuilder;
  const jobs: { put: (n: number) => void; q: CountQuery }[] = [];
  const out: TodoCounts = { orders: {}, waiting: {}, products: {} };

  if (can("/orders")) {
    for (const o of orderTodoQueries(now)) {
      jobs.push({ put: (n) => (out.orders[o.key] = n), q: applyOrderFilters(head("mall_builder_orders").eq("store_id", storeId), o.query) });
    }
  }
  const w = (key: WaitingKey, menu: string, q: () => CountQuery) => {
    if (can(menu)) jobs.push({ put: (n) => (out.waiting[key] = n), q: q() });
  };
  w("inquiries", "/inquiries", () => head("mall_builder_inquiries").eq("store_id", storeId).eq("is_deleted", false).is("answer", null));
  w("reviews", "/reviews", () => head("mall_builder_reviews").eq("store_id", storeId).eq("is_deleted", false).is("reply", null));
  w("quotes", "/quotes", () => head("mall_builder_quotes").eq("store_id", storeId).eq("status", "requested"));
  w("biz", "/customers", () => head("mall_builder_store_customers").eq("store_id", storeId).eq("approval_status", "pending"));
  w("members", "/customers", () => head("mall_builder_store_customers").eq("store_id", storeId).eq("member_status", "pending"));
  w("product_approval", "/products", () => head("mall_builder_products").eq("store_id", storeId).eq("approval", "pending"));
  w("supplier_apps", "/suppliers", () => head("mall_builder_supplier_applications").eq("store_id", storeId).eq("status", "pending"));
  w("reseller_apps", "/resellers", () => head("mall_builder_reseller_applications").eq("store_id", storeId).eq("status", "pending"));
  w("resale_apps", "/resale", () => head("mall_builder_resale_applications").eq("source_store_id", storeId).eq("status", "pending"));
  w("restock", "/restock", () => head("mall_builder_restock_requests").eq("store_id", storeId).eq("status", "waiting"));

  if (can("/products")) {
    const p = (key: ProductKey, q: CountQuery) => jobs.push({ put: (n) => (out.products[key] = n), q });
    const prod = () => head("mall_builder_products").eq("store_id", storeId);
    p("on_sale", prod().eq("status", "on_sale"));
    p("low_stock", prod().eq("status", "on_sale").eq("stock_mode", "product").lte("stock", 0));
    p("sold_out", prod().eq("status", "sold_out"));
    p("hidden", prod().eq("status", "hidden"));
    p("draft", prod().eq("status", "draft"));
  }

  const res = await Promise.all(jobs.map((j) => Promise.resolve(j.q).then((r) => r.count ?? 0, () => 0)));
  res.forEach((n, i) => jobs[i].put(n));
  return out;
}
