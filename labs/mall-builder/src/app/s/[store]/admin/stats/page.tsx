import Link from "next/link";
import { getStaffStore, getStats } from "@/lib/store";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/orders";
import { formatWon } from "@/lib/products";
import { PAY_METHOD_LABEL, PERIOD_LABEL, barPct, periodRange } from "@/lib/stats";
import { AdminShell, NoPermission } from "../admin-shell";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded border p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

function Bar({ pct }: { pct: number }) {
  return <span className="block h-2 rounded bg-gray-900" style={{ width: `${pct}%` }} />;
}

// 운영자 통계(D14) — 기간을 고르면 DB 함수 하나가 숫자를 한 번에 돌려준다(읽기만)
export default async function AdminStatsPage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<{ period?: string; from?: string; to?: string }> }) {
  const { store: slug } = await params;
  const q = await searchParams;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/stats`);
  if (!staff) return <NoPermission />;
  const period = periodRange(q.period, new Date(), q.from, q.to);
  const stats = await getStats(store.id, period.from, period.to);
  const s = stats.summary;
  const base = `/s/${store.slug}/admin/stats`;
  const dailyMax = Math.max(0, ...stats.daily.map((d) => d.sales));
  const productMax = Math.max(0, ...stats.top_products.map((p) => p.amount));
  const cartMax = Math.max(0, ...stats.cart_top.map((c) => c.users));

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/stats">
      <div className="flex flex-wrap items-center gap-2 text-sm" data-period>
        {(Object.keys(PERIOD_LABEL) as (keyof typeof PERIOD_LABEL)[]).map((k) => (
          <Link key={k} href={`${base}?period=${k}`} className={`rounded border px-3 py-1.5 ${period.key === k ? "border-gray-900 bg-gray-900 text-white" : ""}`}>
            {PERIOD_LABEL[k]}
          </Link>
        ))}
        <form className="flex items-center gap-1" action={base}>
          <input type="hidden" name="period" value="custom" />
          <input type="date" name="from" defaultValue={period.fromDay} className="rounded border px-2 py-1" />
          <span>~</span>
          <input type="date" name="to" defaultValue={period.toDay} className="rounded border px-2 py-1" />
          <button className={`rounded border px-3 py-1.5 ${period.key === "custom" ? "border-gray-900 bg-gray-900 text-white" : ""}`}>보기</button>
        </form>
      </div>
      <p className="mt-2 text-xs text-gray-500" data-range>
        {period.fromDay} ~ {period.toDay} · 주문한 날짜 기준(한국 시간). 매출은 결제된 주문의 금액이며 부분 취소분은 빠져 있습니다.
      </p>

      <section className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" data-summary>
        <Card label="매출" value={formatWon(s.sales)} sub={`주문 ${s.orders}건 · 평균 ${formatWon(s.avg_order)}`} />
        <Card label="구매 손님" value={`${s.buyers}명`} sub={`새 가입 ${s.new_customers}명 · 전체 ${s.total_customers}명`} />
        <Card label="취소·반품" value={`${s.cancelled_count}건`} sub={formatWon(s.cancelled_amount)} />
        <Card label="입금 대기" value={`${s.pending_count}건`} sub={`기간 전체 주문 ${s.all_orders}건`} />
      </section>

      <section className="mt-6" data-daily>
        <h2 className="text-sm font-semibold">일별 매출</h2>
        {stats.daily.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">이 기간에 결제된 주문이 없습니다.</p>
        ) : (
          <table className="mt-2 w-full text-sm">
            <tbody>
              {stats.daily.map((d) => (
                <tr key={d.day} className="border-t">
                  <td className="w-28 py-1.5 text-gray-600">{d.day}</td>
                  <td className="py-1.5"><Bar pct={barPct(d.sales, dailyMax)} /></td>
                  <td className="w-24 py-1.5 text-right">{formatWon(d.sales)}</td>
                  <td className="w-14 py-1.5 text-right text-gray-500">{d.orders}건</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <section data-status>
          <h2 className="text-sm font-semibold">주문 상태</h2>
          {stats.by_status.length === 0 ? <p className="mt-2 text-sm text-gray-500">주문이 없습니다.</p> : (
            <ul className="mt-2 divide-y rounded border text-sm">
              {stats.by_status.map((x) => (
                <li key={x.status} className="flex justify-between px-3 py-1.5"><span>{ORDER_STATUS_LABEL[x.status as OrderStatus] ?? x.status}</span><b>{x.count}건</b></li>
              ))}
            </ul>
          )}
        </section>
        <section data-pay>
          <h2 className="text-sm font-semibold">결제 방법</h2>
          {stats.pay_method.length === 0 ? <p className="mt-2 text-sm text-gray-500">결제된 주문이 없습니다.</p> : (
            <ul className="mt-2 divide-y rounded border text-sm">
              {stats.pay_method.map((x) => (
                <li key={x.method} className="flex justify-between px-3 py-1.5"><span>{PAY_METHOD_LABEL[x.method] ?? x.method} · {x.count}건</span><b>{formatWon(x.amount)}</b></li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-6" data-products>
        <h2 className="text-sm font-semibold">많이 팔린 상품 (상위 10)</h2>
        {stats.top_products.length === 0 ? <p className="mt-2 text-sm text-gray-500">팔린 상품이 없습니다.</p> : (
          <table className="mt-2 w-full text-sm">
            <tbody>
              {stats.top_products.map((p, i) => (
                <tr key={p.product_id ?? i} className="border-t">
                  <td className="w-6 py-1.5 text-gray-400">{i + 1}</td>
                  <td className="py-1.5">
                    {p.product_id ? <Link href={`/s/${store.slug}/admin/products/${p.product_id}`} className="underline">{p.name}</Link> : p.name}
                    <Bar pct={barPct(p.amount, productMax)} />
                  </td>
                  <td className="w-14 py-1.5 text-right text-gray-500">{p.qty}개</td>
                  <td className="w-24 py-1.5 text-right">{formatWon(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mt-6" data-cart>
        <h2 className="text-sm font-semibold">지금 장바구니에 담긴 상품 (상위 10)</h2>
        <p className="text-xs text-gray-500">기간과 상관없이 지금 손님 장바구니에 있는 것입니다. 재고·가격 조정에 참고하세요.</p>
        {stats.cart_top.length === 0 ? <p className="mt-2 text-sm text-gray-500">장바구니에 담긴 상품이 없습니다.</p> : (
          <table className="mt-2 w-full text-sm">
            <tbody>
              {stats.cart_top.map((c, i) => (
                <tr key={c.product_id} className="border-t">
                  <td className="w-6 py-1.5 text-gray-400">{i + 1}</td>
                  <td className="py-1.5"><Link href={`/s/${store.slug}/admin/products/${c.product_id}`} className="underline">{c.name}</Link><Bar pct={barPct(c.users, cartMax)} /></td>
                  <td className="w-16 py-1.5 text-right text-gray-500">{c.users}명</td>
                  <td className="w-14 py-1.5 text-right">{c.qty}개</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AdminShell>
  );
}
