import Link from "next/link";
import { getGrades, getStaffStore, getTierMap } from "@/lib/store";
import { formatWon } from "@/lib/products";
import { checkPrices, type CheckProduct } from "@/lib/priceCheck";
import type { GradePrice } from "@/lib/pricing";
import { todayKst } from "@/lib/customerPrices";
import { canSeeMenu, type MyStaff } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";
import { AdminShell, NoPermission } from "../../admin-shell";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const NO_ID = ["00000000-0000-0000-0000-000000000000"];

/** D29 마진 점검 — 원가 대비 기준 마진 아래인 판매 단가(규칙 계산, AI 호출 없음) */
export default async function PriceCheckPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/products/price-check`);
  if (!staff) return <NoPermission />;
  const supabase = await createClient();

  const { data: products } = await supabase
    .from("mall_builder_products")
    .select("id, name, product_code, base_price, status, stock_mode, stock, option_groups, visibility, price_visibility, moq, order_unit, max_qty, mall_builder_product_private(cost)")
    .eq("store_id", store.id)
    .neq("status", "hidden")
    .order("created_at", { ascending: false })
    .limit(2000);
  type Row = Omit<CheckProduct, "cost"> & { mall_builder_product_private: { cost: number | null } | { cost: number | null }[] | null };
  const list: CheckProduct[] = ((products ?? []) as unknown as Row[]).map(({ mall_builder_product_private: priv, ...p }) => {
    const c = Array.isArray(priv) ? priv[0] : priv;
    return { ...p, base_price: Number(p.base_price), cost: c?.cost == null ? null : Number(c.cost) };
  });
  const ids = list.map((p) => p.id);

  const today = todayKst();
  const [{ data: status }, grades, tiers, { data: gp }, { data: cp, error: cpErr }] = await Promise.all([
    supabase.rpc("mall_builder_ai_status", { p_store_id: store.id }),
    getGrades(store.id),
    getTierMap(ids),
    supabase.from("mall_builder_product_grade_prices").select("product_id, grade_id, price, discount_rate").eq("store_id", store.id).in("product_id", ids.length ? ids : NO_ID),
    supabase
      .from("mall_builder_customer_prices")
      .select("customer_id, product_id, price, discount_rate, mall_builder_store_customers(name, company)")
      .eq("store_id", store.id)
      .or(`ends_on.is.null,ends_on.gte.${today}`)
      .limit(5000),
  ]);
  const minMargin = Number((status as { min_margin?: number } | null)?.min_margin ?? 10);

  const gradePrices = new Map<string, Map<string, GradePrice>>();
  for (const r of gp ?? []) {
    const m = gradePrices.get(r.product_id as string) ?? new Map();
    m.set(r.grade_id as string, { price: r.price == null ? null : Number(r.price), discount_rate: r.discount_rate as number | null });
    gradePrices.set(r.product_id as string, m);
  }
  type Cp = { customer_id: string; product_id: string | null; price: number | null; discount_rate: number | null; mall_builder_store_customers: { name: string; company: string | null } | { name: string; company: string | null }[] | null };
  const byCustomer = new Map<string, { id: string; label: string; base: GradePrice; byProduct: Map<string, GradePrice> }>();
  for (const r of (cp ?? []) as unknown as Cp[]) {
    const who = Array.isArray(r.mall_builder_store_customers) ? r.mall_builder_store_customers[0] : r.mall_builder_store_customers;
    const c = byCustomer.get(r.customer_id) ?? { id: r.customer_id, label: who?.company || who?.name || "거래처", base: null, byProduct: new Map() };
    const v = { price: r.price == null ? null : Number(r.price), discount_rate: r.discount_rate };
    if (r.product_id) c.byProduct.set(r.product_id, v);
    else c.base = v;
    byCustomer.set(r.customer_id, c);
  }
  const me = ((await supabase.rpc("mall_builder_my_staff", { p_store_id: store.id })).data ?? null) as MyStaff;
  const canSeeCustomers = !cpErr && canSeeMenu("/customers", me);

  const result = checkPrices({ products: list, grades, gradePrices, tiers, customers: [...byCustomer.values()], minMargin });
  const loss = result.rows.filter((r) => r.level === "loss").length;

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/products">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">⚠ 마진 점검</h2>
        <Link href={`/s/${store.slug}/admin/products`} className="text-sm underline">← 상품 목록</Link>
      </div>
      <p className="text-sm text-gray-600">
        원가를 넣은 상품의 판매가·등급가·수량 할인·거래처 특가를 손님 화면과 같은 계산으로 내서, 마진이 <b>{minMargin}%</b> 아래인 곳을 모았습니다(기준은 「쇼핑몰 정보 › AI 도우미」의 최소 마진). AI를 부르지 않아 비용이 없습니다.
      </p>
      {!canSeeCustomers && <p className="mt-2 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">「손님」 권한이 없어 거래처 특가는 점검에서 빠졌습니다.</p>}

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm" data-price-check-summary>
        <div className="rounded border p-3"><p className="text-gray-500">점검한 상품</p><p className="text-xl font-semibold">{result.checked}</p></div>
        <div className="rounded border border-red-200 bg-red-50 p-3"><p className="text-red-700">원가 아래</p><p className="text-xl font-semibold text-red-700">{loss}</p></div>
        <div className="rounded border border-amber-200 bg-amber-50 p-3"><p className="text-amber-800">기준 마진 아래</p><p className="text-xl font-semibold text-amber-800">{result.rows.length - loss}</p></div>
      </div>

      {result.rows.length ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm" data-price-check>
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2">상품</th><th>어디서</th><th className="text-right">단가</th><th className="text-right">원가</th><th className="text-right">마진</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((r, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2">
                    <Link href={`/s/${store.slug}/admin/products/${r.product_id}`} className="underline">{r.name}</Link>
                    {r.code && <span className="ml-1 font-mono text-xs text-gray-400">{r.code}</span>}
                  </td>
                  <td>{r.where}</td>
                  <td className="text-right">{formatWon(r.price)}</td>
                  <td className="text-right text-gray-500">{formatWon(r.cost)}</td>
                  <td className={`text-right font-semibold ${r.level === "loss" ? "text-red-600" : "text-amber-700"}`}>{r.margin}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 rounded border p-4 text-sm text-gray-600">기준 마진 아래인 단가가 없습니다. 👍</p>
      )}

      {result.noCost.length > 0 && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-gray-600">원가를 안 넣어 점검하지 못한 상품 {result.noCost.length}개</summary>
          <ul className="mt-2 list-disc pl-5">
            {result.noCost.slice(0, 100).map((p) => (
              <li key={p.id}><Link href={`/s/${store.slug}/admin/products/${p.id}`} className="underline">{p.name}</Link></li>
            ))}
          </ul>
        </details>
      )}
      <p className="mt-4 text-xs text-gray-500">원가는 상품 하나 기준이라 옵션 추가금은 0으로 봅니다. 진행 중인 공동구매가는 기간 한정이라 넣지 않았습니다. 숨긴 상품은 빼고 봅니다.</p>
    </AdminShell>
  );
}
