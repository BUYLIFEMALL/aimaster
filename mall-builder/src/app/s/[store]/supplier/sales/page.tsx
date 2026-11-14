import Link from "next/link";
import { getSupplierSales } from "@/lib/supplier-store";
import { PERIOD_LABEL, periodRange, summarizeSupplierSales, todayKst, type PeriodKey } from "@/lib/supplier";
import { ORDER_STATUS_LABEL, formatDateTime, type OrderStatus } from "@/lib/orders";
import { formatWon } from "@/lib/products";
import { getSupplierContext, NotSupplier, SupplierShell } from "../supplier-shell";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const PERIODS: PeriodKey[] = ["today", "7d", "30d", "month", "lastmonth", "all"];
const STATUSES: OrderStatus[] = ["paid", "preparing", "shipping", "delivered", "confirmed", "cancel_requested", "cancelled", "return_requested", "returned"];
const isDate = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

// M3-S2 공급사 「판매 분해」 — 내 품목마다 판매 금액 − 본사 몫 − 리셀러 몫 = 내 공급가(0090), 기간·상태 거르기, 합계·리셀러 판매 표시.
// 유저 이름·연락처·주소는 없음(발송은 「내 주문」). 확정 전 리셀러 몫은 남은 수량 비율, 확정 뒤 정산은 「정산」 장부가 기준
export default async function SupplierSalesPage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<{ p?: string; from?: string; to?: string; status?: string }> }) {
  const { store: slug } = await params;
  const sp = await searchParams;
  const { user, store, me } = await getSupplierContext(slug, `/s/${slug}/supplier/sales`);
  const custom = isDate(sp.from) || isDate(sp.to);
  const pkey = (PERIODS as string[]).includes(sp.p ?? "") ? (sp.p as PeriodKey) : "30d";
  const range = custom ? { from: isDate(sp.from) ? sp.from! : null, to: isDate(sp.to) ? sp.to! : null } : periodRange(pkey, todayKst());
  const status = STATUSES.find((s) => s === sp.status) ?? null;
  const { ready, rows } = me ? await getSupplierSales(store.id, { ...range, status }) : { ready: true, rows: [] };
  const s = summarizeSupplierSales(rows);
  const base = `/s/${store.slug}/supplier/sales`;
  const q = (o: Record<string, string | null | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(o)) if (v) u.set(k, v);
    const t = u.toString();
    return t ? `${base}?${t}` : base;
  };
  const card = "rounded border p-2";
  return (
    <SupplierShell slug={store.slug} storeName={store.name} email={user.email ?? ""} active="/sales">
      {!me ? (
        <NotSupplier />
      ) : (
        <>
          <p className="text-sm text-gray-500">내 상품 품목마다 <b>판매 금액 − 본사 몫 − 리셀러 몫 = 내 공급가</b>로 나눠 봅니다. 입금이 확인된 주문만, 날짜는 주문일(한국 시간)입니다.</p>
          {!ready && <p className="mt-2 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">판매 분해는 DB 업데이트 뒤에 보입니다.</p>}
          <nav className="mt-3 flex flex-wrap gap-1 text-xs" data-supplier-period>
            {PERIODS.map((k) => (
              <Link key={k} href={q({ p: k, status })} className={`rounded-full border px-3 py-1.5 ${!custom && pkey === k ? "bg-gray-900 text-white" : "bg-white"}`}>{PERIOD_LABEL[k]}</Link>
            ))}
          </nav>
          <form action={base} className="mt-2 flex flex-wrap items-center gap-2 text-xs" data-supplier-filter>
            <input type="date" name="from" defaultValue={range.from ?? ""} aria-label="시작일" className="rounded border px-2 py-1.5" />
            <span>~</span>
            <input type="date" name="to" defaultValue={range.to ?? ""} aria-label="끝일" className="rounded border px-2 py-1.5" />
            <select name="status" defaultValue={status ?? ""} aria-label="주문 상태" className="rounded border px-2 py-1.5">
              <option value="">모든 상태</option>
              {STATUSES.map((st) => <option key={st} value={st}>{ORDER_STATUS_LABEL[st]}</option>)}
            </select>
            <button className="min-h-9 rounded border px-3">보기</button>
          </form>

          <section className="mt-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-4" data-supplier-sales-sum>
            <div className={card}><p className="text-xs text-gray-500">판매 금액</p><p className="font-semibold">{formatWon(s.sales)}</p><p className="text-[11px] text-gray-400">주문 {s.orders}건 · {s.qty}개</p></div>
            <div className={card}><p className="text-xs text-gray-500">본사 몫</p><p className="font-semibold">{formatWon(s.hq)}</p></div>
            <div className={card}><p className="text-xs text-gray-500">리셀러 몫</p><p className="font-semibold">{formatWon(s.reseller)}</p><p className="text-[11px] text-gray-400">리셀러 {s.resellers}명</p></div>
            <div className={card}><p className="text-xs text-gray-500">내 공급가</p><p className="font-semibold text-emerald-700">{formatWon(s.supply)}</p></div>
          </section>
          {s.sales > 0 && <p className="mt-1 text-xs text-gray-500">리셀러 링크로 팔린 비중 {Math.round((s.resellerSales / s.sales) * 100)}% ({formatWon(s.resellerSales)})</p>}

          <section className="mt-4" data-supplier-sales>
            {rows.length === 0 ? (
              <p className="text-sm text-gray-500">이 기간에 판매된 내 품목이 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-gray-500">
                      <th className="py-2">주문</th><th>상품</th><th className="text-right">수량</th><th className="text-right">판매</th><th className="text-right">본사</th><th className="text-right">리셀러</th><th className="text-right">공급가</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.item_id} className={`border-b ${r.qty === 0 ? "text-gray-400" : ""}`}>
                        <td className="py-2 text-xs"><span className="font-mono">{r.order_no}</span><br />{formatDateTime(r.ordered_at)} · {ORDER_STATUS_LABEL[r.order_status as OrderStatus] ?? r.order_status}</td>
                        <td className="max-w-[180px] truncate">{r.name}{r.option && <span className="text-xs text-gray-500"> · {r.option}</span>}</td>
                        <td className="text-right">{r.qty}</td>
                        <td className="text-right">{formatWon(r.sales)}</td>
                        <td className="text-right">{formatWon(r.hq)}</td>
                        <td className="text-right">{r.reseller > 0 || r.reseller_code ? <>{formatWon(r.reseller)}<br /><span className="font-mono text-[11px] text-gray-400">{r.reseller_code}</span></> : <span className="text-xs text-gray-400">직접 판매</span>}</td>
                        <td className="text-right font-semibold">{formatWon(r.supply)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-2 text-xs text-gray-500">리셀러 몫은 구매 확정 전이면 남은 수량 비율로 보이고, 확정 때 다시 계산됩니다. 쿠폰·포인트 할인과 배송비는 본사 쪽이라 공급가와 관계없습니다. 실제 받을 금액은 「정산」 장부가 기준입니다.</p>
          </section>
        </>
      )}
    </SupplierShell>
  );
}
