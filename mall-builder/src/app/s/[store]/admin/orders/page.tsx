import Link from "next/link";
import { getOrderCounts, getStaffStore, getStoreOrders } from "@/lib/store";
import { ORDER_STATUS_LABEL, formatDateTime, type OrderStatus } from "@/lib/orders";
import { formatWon } from "@/lib/products";
import { orderListHref, pageCount, parseOrderListQuery } from "@/lib/order-list";
import { BULK_MAX, BULK_TARGETS } from "@/lib/order-excel";
import { bulkStatusAction } from "./bulk-actions";
import TrackingForm from "./tracking-form";
import { AdminShell, NoPermission } from "../admin-shell";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 처리할 일이 있는 상태를 앞에
const TABS: OrderStatus[] = ["pending_payment", "paid", "preparing", "cancel_requested", "return_requested", "shipping", "delivered", "confirmed", "cancelled", "returned"];

export default async function AdminOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { store: slug } = await params;
  const sp = await searchParams;
  const f = parseOrderListQuery(sp, TABS); // M2-1: 상태·검색어·기간·송장 없음·페이지
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]) ?? "";
  const bulk = { ok: Number(one("bulk_ok")) || 0, fail: Number(one("bulk_fail")) || 0, error: one("bulk_error").slice(0, 300) }; // M2-2 일괄 결과
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/orders`);
  if (!staff) return <NoPermission />;
  const filter = f.status as OrderStatus | undefined;
  const [{ rows: orders, total: found }, counts] = await Promise.all([getStoreOrders(store.id, f), getOrderCounts(store.id)]);
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  const capped = total >= 5000;
  const visibleTabs = capped ? TABS : TABS.filter((s) => counts[s] || s === filter);
  const formatKpi = (n: number) => (capped ? (n > 0 ? `${n.toLocaleString("ko-KR")}건+` : "표본 미관측") : `${n.toLocaleString("ko-KR")}건`);
  const base = `/s/${store.slug}/admin/orders`;
  const pages = pageCount(found);
  const narrowed = Boolean(f.q || f.from || f.to || f.noTracking || f.refundPending);
  const keep = orderListHref("", f, {}).replace(/^\?/, ""); // 일괄 처리 뒤 같은 목록으로

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/orders">
      {/* 직관적 주문 KPI 4종 (getOrderCounts 5,000건 상한 집계 범위 명시) */}
      <div className="mb-5 space-y-1.5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500"><span>집계 주문{capped ? " (표본)" : ""}</span><span>📋</span></div>
            <p className="mt-1.5 text-2xl font-black text-slate-900">{capped ? "5,000건+" : `${total.toLocaleString("ko-KR")}건`}</p>
          </div>
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-amber-700"><span>입금 대기{capped ? " (표본)" : ""}</span><span>⏳</span></div>
            <p className="mt-1.5 text-2xl font-black text-amber-700">{formatKpi(counts.pending_payment ?? 0)}</p>
          </div>
          <div className="rounded-2xl border border-blue-200/80 bg-blue-50/40 p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-blue-700"><span>결제완료·준비중{capped ? " (표본)" : ""}</span><span>📦</span></div>
            <p className="mt-1.5 text-2xl font-black text-blue-700">{formatKpi((counts.paid ?? 0) + (counts.preparing ?? 0))}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-700"><span>구매 확정{capped ? " (표본)" : ""}</span><span>✅</span></div>
            <p className="mt-1.5 text-2xl font-black text-emerald-700">{formatKpi(counts.confirmed ?? 0)}</p>
          </div>
        </div>
        <p className="text-[11px] text-slate-500" data-order-kpi-scope>
          * 상태별 건수는 최대 5,000건 집계 상한 기준입니다{capped ? " (현재 상한 5,000건 도달 — 부분 집계이며 모든 상태 탭에서 전체 주문을 조회할 수 있습니다)" : ""}.
        </p>
      </div>

      <nav aria-label="주문 상태 필터" className="flex flex-wrap gap-1.5 text-sm" data-order-tabs>
        <Link href={orderListHref(base, f, { status: undefined, page: 1 })} aria-current={!filter ? "page" : undefined} className={`rounded-xl px-3.5 py-1.5 font-semibold transition ${!filter ? "bg-slate-900 text-white shadow-xs" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
          {capped ? "전체 (5,000+)" : `전체 ${total}`}
        </Link>
        {visibleTabs.map((s) => (
          <Link key={s} href={orderListHref(base, f, { status: s, page: 1 })} aria-current={filter === s ? "page" : undefined} className={`rounded-xl px-3.5 py-1.5 font-semibold transition ${filter === s ? "bg-slate-900 text-white shadow-xs" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
            {ORDER_STATUS_LABEL[s]}
            {capped ? (counts[s] ? ` ${counts[s]}+` : "") : ` ${counts[s] ?? 0}`}
          </Link>
        ))}
      </nav>

      {/* M2-1 검색·기간·송장 없음 — 상태 탭은 그대로 유지 */}
      <form method="get" action={base} className="mt-4 flex flex-wrap items-end gap-2.5 rounded-2xl border border-slate-200/80 bg-white p-4 text-sm shadow-xs" data-order-search>
        {f.status && <input type="hidden" name="status" value={f.status} />}
        <label className="flex min-w-48 flex-1 flex-col">
          <span className="text-xs text-gray-500">검색</span>
          <input name="q" defaultValue={f.q} maxLength={40} placeholder="주문번호·받는 분·연락처·입금자" className="rounded border px-2 py-1.5" />
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-gray-500">주문일 부터</span>
          <input type="date" name="from" defaultValue={f.from} className="rounded border px-2 py-1.5" />
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-gray-500">까지</span>
          <input type="date" name="to" defaultValue={f.to} className="rounded border px-2 py-1.5" />
        </label>
        <label className="flex items-center gap-1 py-1.5" title="결제 완료·배송 준비·배송 중인데 송장 번호가 없는 주문">
          <input type="checkbox" name="no_tracking" value="1" defaultChecked={f.noTracking} /> 송장 없음
        </label>
        <label className="flex items-center gap-1 py-1.5" title="취소·반품된 무통장 주문 중 아직 환불하지 않은 것">
          <input type="checkbox" name="refund" value="1" defaultChecked={f.refundPending} /> 환불 대기
        </label>
        <button className="rounded bg-gray-900 px-3 py-1.5 text-white">찾기</button>
        {narrowed && (
          <Link href={orderListHref(base, { ...f, q: "", from: undefined, to: undefined, noTracking: false, refundPending: false }, { page: 1 })} className="py-1.5 text-gray-500 underline">
            조건 지우기
          </Link>
        )}
      </form>
      <p className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500" data-order-found>
        <span>{found}건{pages > 1 && ` · ${f.page}/${pages}쪽`}</span>
        <a href={orderListHref(`${base}/excel`, f, { page: 1 })} className="text-blue-700 underline" data-order-excel>
          ⬇ 이 조건으로 엑셀 내려받기{found > 3000 && "(최근 3,000건)"}
        </a>
      </p>
      <TrackingForm slug={store.slug} downloadHref={orderListHref(`${base}/excel`, { ...f, noTracking: true }, { page: 1 })} />
      {(bulk.ok > 0 || bulk.fail > 0 || bulk.error) && (
        <p className={`mt-3 rounded px-3 py-2 text-sm ${bulk.fail || (bulk.error && !bulk.ok) ? "bg-amber-50 text-amber-900" : "bg-green-50 text-green-800"}`} data-bulk-result>
          {bulk.ok > 0 && <b>{bulk.ok}건 바꿈. </b>}
          {bulk.fail > 0 && <b>{bulk.fail}건 못 바꿈 </b>}
          {bulk.error && <span>— {bulk.error}</span>}
        </p>
      )}

      {orders.length === 0 ? (
        <p className="mt-6 rounded border border-dashed p-8 text-center text-sm text-gray-500">{narrowed ? "조건에 맞는 주문이 없습니다." : "주문이 없습니다."}</p>
      ) : (
        <form action={bulkStatusAction.bind(null, store.slug, keep)} data-bulk-form>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-gray-500">고른 주문을</span>
          <select name="to" defaultValue="" className="rounded border px-2 py-1" required>
            <option value="" disabled>상태 고르기</option>
            {Object.entries(BULK_TARGETS).map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
          <button className="rounded bg-gray-900 px-3 py-1 text-white">한꺼번에 바꾸기</button>
          <span className="text-xs text-gray-400">한 번에 {BULK_MAX}건까지 · 취소·환불·송장은 주문마다(송장은 위 엑셀로)</span>
        </div>
        <ul className="mt-2 divide-y border-y text-sm">
          {orders.map((o) => (
            <li key={o.id} data-admin-order className="flex items-center gap-2">
              <input type="checkbox" name="ids" value={o.id} aria-label={`${o.order_no} 고르기`} className="ml-1 h-4 w-4 shrink-0" />
              <Link href={`${base}/${o.id}`} className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 py-3 hover:bg-gray-50">
                <span className="text-gray-500">{formatDateTime(o.created_at)}</span>
                <span>{o.order_no}</span>
                <span className="min-w-0 flex-1 truncate">
                  {o.first_item}
                  {o.item_count > 1 && ` 외 ${o.item_count - 1}건`} · {o.receiver.receiver} · 입금자 {o.depositor}
                  {o.is_guest && <span className="ml-1 rounded bg-amber-50 px-1.5 text-xs text-amber-800" data-guest-badge>비회원</span>}
                </span>
                <b>{formatWon(o.total)}</b>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">{ORDER_STATUS_LABEL[o.status]}</span>
              </Link>
            </li>
          ))}
        </ul>
        </form>
      )}
      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-center gap-3 text-sm" data-order-pages>
          {f.page > 1 ? <Link href={orderListHref(base, f, { page: f.page - 1 })} className="rounded bg-gray-100 px-3 py-1.5">‹ 이전</Link> : <span className="px-3 py-1.5 text-gray-300">‹ 이전</span>}
          <span>
            {f.page} / {pages}
          </span>
          {f.page < pages ? <Link href={orderListHref(base, f, { page: f.page + 1 })} className="rounded bg-gray-100 px-3 py-1.5">다음 ›</Link> : <span className="px-3 py-1.5 text-gray-300">다음 ›</span>}
        </nav>
      )}
    </AdminShell>
  );
}
