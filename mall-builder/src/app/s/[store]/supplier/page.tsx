import Link from "next/link";
import { getMySupplierProducts, getSupplierLedger, getSupplierOrders, getSupplierPickCounts, getSupplierSales } from "@/lib/supplier-store";
import { PERIOD_LABEL, SUPPLIER_STATUS_LABEL, periodRange, summarizeSupplierSales, todayKst, type PeriodKey } from "@/lib/supplier";
import { formatWon } from "@/lib/products";
import { getSupplierContext, NotSupplier, SupplierShell } from "./supplier-shell";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const PERIODS: PeriodKey[] = ["today", "7d", "30d", "month"];
const SHIPPABLE = ["paid", "preparing", "shipping"];

// M3-S3 공급사 대시보드 — 기간 단추(오늘·7일·30일·이번 달)로 주문·판매·내 공급가·리셀러 판매, 발송 대기, 받을 금액, 상품·픽 현황, 많이 팔린 상품.
// 내 정보·배송비는 「내 정보」(/info)로 옮김
export default async function SupplierDashboardPage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<{ p?: string; error?: string; ok?: string; msg?: string }> }) {
  const { store: slug } = await params;
  const sp = await searchParams;
  const { user, store, me } = await getSupplierContext(slug, `/s/${slug}/supplier`);
  const pkey = (PERIODS as string[]).includes(sp.p ?? "") ? (sp.p as PeriodKey) : "30d";
  const range = periodRange(pkey, todayKst());
  const [sales, orders, ledger, products, picks] = me
    ? await Promise.all([getSupplierSales(store.id, range), getSupplierOrders(store.id), getSupplierLedger({ supplierId: me.id }), getMySupplierProducts(me.id), getSupplierPickCounts(store.id)])
    : [{ ready: true, rows: [] }, { items: [], error: null }, [], [], new Map<string, number>()];
  const s = summarizeSupplierSales(sales.rows);
  const toShip = orders.items.filter((it) => SHIPPABLE.includes(it.order_status) && !it.shipped_at && it.qty - it.cancelled_qty > 0).length;
  const balance = ledger.reduce((a, l) => a + l.amount, 0);
  const prod = {
    live: products.filter((p) => p.approval === "approved" && p.status === "on_sale").length,
    pending: products.filter((p) => p.approval === "pending").length,
    rejected: products.filter((p) => p.approval === "rejected").length,
  };
  const pickTotal = [...picks.values()].reduce((a, n) => a + n, 0);
  const topPicked = products.map((p) => ({ name: p.name, n: picks.get(p.id) ?? 0 })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 3);
  const base = `/s/${store.slug}/supplier`;
  const card = "rounded-lg border p-3";
  return (
    <SupplierShell slug={store.slug} storeName={store.name} email={user.email ?? ""} active="" notice={sp}>
      {!me ? (
        <NotSupplier />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <b>{me.name}</b>
            <span className={`rounded px-1.5 text-xs ${me.status === "active" ? "bg-emerald-50 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>{SUPPLIER_STATUS_LABEL[me.status]}</span>
            <nav className="ml-auto flex gap-1 text-xs" data-supplier-dash-period>
              {PERIODS.map((k) => (
                <Link key={k} href={`${base}?p=${k}`} className={`rounded-full border px-3 py-1.5 ${pkey === k ? "bg-gray-900 text-white" : "bg-white"}`}>{PERIOD_LABEL[k]}</Link>
              ))}
            </nav>
          </div>
          {me.status === "paused" && <p className="mt-2 rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">운영사가 잠시 쉬게 해 두었습니다. 그동안 내 상품은 판매되지 않습니다.</p>}
          {!sales.ready && <p className="mt-2 rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">판매 요약은 DB 업데이트 뒤에 보입니다.</p>}

          <section className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" data-supplier-dash>
            <div className={card}><p className="text-xs text-gray-500">주문</p><p className="text-lg font-bold">{s.orders}건</p><p className="text-[11px] text-gray-400">{s.qty}개 팔림</p></div>
            <div className={card}><p className="text-xs text-gray-500">판매 금액</p><p className="text-lg font-bold">{formatWon(s.sales)}</p></div>
            <div className={card}><p className="text-xs text-gray-500">내 공급가</p><p className="text-lg font-bold text-emerald-700">{formatWon(s.supply)}</p></div>
            <div className={card}><p className="text-xs text-gray-500">리셀러 판매</p><p className="text-lg font-bold">{s.sales > 0 ? Math.round((s.resellerSales / s.sales) * 100) : 0}%</p><p className="text-[11px] text-gray-400">리셀러 {s.resellers}명</p></div>
          </section>

          <section className="mt-3 grid gap-2 sm:grid-cols-3" data-supplier-dash-now>
            <Link href={`${base}/orders`} className={`${card} hover:bg-gray-50`}><p className="text-xs text-gray-500">🚚 발송 대기</p><p className={`text-lg font-bold ${toShip ? "text-red-700" : ""}`}>{toShip}개</p></Link>
            <Link href={`${base}/settlements`} className={`${card} hover:bg-gray-50`}><p className="text-xs text-gray-500">💰 받을 금액(잔액)</p><p className={`text-lg font-bold ${balance < 0 ? "text-red-700" : "text-emerald-700"}`}>{formatWon(balance)}</p></Link>
            <Link href={`${base}/products`} className={`${card} hover:bg-gray-50`}><p className="text-xs text-gray-500">📦 내 상품</p><p className="text-sm"><b>판매 중 {prod.live}</b> · 승인 대기 {prod.pending}{prod.rejected > 0 && <> · <span className="text-red-700">반려 {prod.rejected}</span></>}</p></Link>
          </section>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <section className={card} data-supplier-dash-top>
              <h2 className="text-sm font-semibold">많이 팔린 상품 <span className="font-normal text-gray-400">{PERIOD_LABEL[pkey]}</span></h2>
              {s.top.length === 0 ? <p className="mt-1 text-xs text-gray-500">이 기간에 팔린 상품이 없습니다.</p> : (
                <ol className="mt-2 space-y-1 text-sm">
                  {s.top.map((t, i) => <li key={i} className="flex justify-between gap-2"><span className="truncate">{i + 1}. {t.name}</span><span className="shrink-0 text-xs text-gray-500">{t.qty}개 · {formatWon(t.supply)}</span></li>)}
                </ol>
              )}
              <Link href={`${base}/sales?p=${pkey}`} className="mt-2 inline-block text-xs text-blue-700 underline">판매 분해 자세히 보기</Link>
            </section>
            <section className={card} data-supplier-dash-picks>
              <h2 className="text-sm font-semibold">리셀러 현황</h2>
              <p className="mt-1 text-sm">내 상품을 픽한 리셀러 <b>{pickTotal}</b>번{s.resellers > 0 && <> · {PERIOD_LABEL[pkey]} 동안 리셀러 {s.resellers}명이 판매</>}</p>
              {topPicked.length > 0 && <ul className="mt-1 space-y-0.5 text-xs text-gray-600">{topPicked.map((x, i) => <li key={i}>★ {x.name} — {x.n}명</li>)}</ul>}
              <p className="mt-2 text-[11px] text-gray-400">픽 = 리셀러가 홍보하려고 담아 둔 상품. 누가 픽했는지는 보이지 않습니다.</p>
            </section>
          </div>
        </>
      )}
    </SupplierShell>
  );
}
