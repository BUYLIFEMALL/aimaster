"use client";

import { useState, useTransition } from "react";
import { listOrderSheetsAction } from "@/lib/actions/orders";
import { ORDER_STATUSES, orderStatusLabel, type OrderSheet } from "@/lib/coupang/orders";

const input = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-rose-500 focus:outline-none";
/** 한국 시간 기준 오늘에서 n일 전 날짜(yyyy-mm-dd) */
const kstDay = (back: number) => new Date(Date.now() + 9 * 3_600_000 - back * 86_400_000).toISOString().slice(0, 10);

export function OrderSheets({ keysSaved }: { keysSaved: boolean }) {
  const [status, setStatus] = useState("ACCEPT");
  const [from, setFrom] = useState(kstDay(6));
  const [to, setTo] = useState(kstDay(0));
  const [orders, setOrders] = useState<OrderSheet[]>([]);
  const [next, setNext] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const load = (more: boolean) =>
    start(async () => {
      setError("");
      const r = await listOrderSheetsAction({ from, to, status, nextToken: more ? next : undefined });
      if (!r.ok) return setError(r.error);
      setOrders(more ? [...orders, ...r.orders] : r.orders);
      setNext(r.nextToken);
      setLoaded(true);
    });

  return (
    <section className="slw-card space-y-4 p-5">
      {!keysSaved && <p className="text-xs text-amber-800">먼저 「🔑 쿠팡 연결」에서 키를 저장해 주세요.</p>}
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-bold text-slate-700">
          주문 상태
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={`mt-1 block ${input}`}>
            {ORDER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
        <label className="text-xs font-bold text-slate-700">
          시작일
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`mt-1 block ${input}`} />
        </label>
        <label className="text-xs font-bold text-slate-700">
          종료일
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`mt-1 block ${input}`} />
        </label>
        <button type="button" disabled={!keysSaved || pending} onClick={() => load(false)} className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-bold text-white hover:bg-rose-800 disabled:opacity-50">
          {pending ? "불러오는 중…" : "발주서 불러오기"}
        </button>
      </div>
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-900">❌ {error}</p>}
      {loaded && !error && orders.length === 0 && <p className="text-sm text-slate-600">이 기간에 「{orderStatusLabel(status)}」 상태인 주문이 없습니다.</p>}
      {orders.length > 0 && <p className="text-xs text-slate-500">배송 묶음 {orders.length}건{next ? " (더 있음)" : ""}</p>}
      <ul className="space-y-2">
        {orders.map((o) => (
          <li key={o.shipmentBoxId} className="rounded-lg border border-slate-200 p-3 text-[13px]">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="rounded bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">{orderStatusLabel(o.status)}</span>
              <span className="font-bold text-slate-900">주문번호 {o.orderId}</span>
              <span className="text-xs text-slate-500">배송번호 {o.shipmentBoxId} · 주문 {o.orderedAt.replace("T", " ").slice(0, 16)}</span>
              {o.invoiceNumber && <span className="text-xs text-teal-700">🚚 {o.deliveryCompanyName} {o.invoiceNumber}</span>}
            </div>
            <ul className="mt-2 space-y-0.5">
              {o.items.map((it, i) => (
                <li key={`${it.vendorItemId}-${i}`} className="text-slate-800">
                  · {it.name}{it.optionName && it.optionName !== it.name ? ` (${it.optionName})` : ""} — <b>{it.qty}개</b>
                  {it.cancelQty > 0 && <span className="text-rose-700"> (취소·환불대기 {it.cancelQty}개)</span>} · {it.orderPrice.toLocaleString()}원
                  {it.estimatedShippingDate && <span className="text-xs text-slate-500"> · 출고예정 {it.estimatedShippingDate}</span>}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-600">
              📦 {o.receiverName} · {o.receiverSafeNumber} · ({o.postCode}) {o.address}
              {o.shippingPrice > 0 && ` · 배송비 ${o.shippingPrice.toLocaleString()}원`}
            </p>
            {o.message && <p className="text-xs text-slate-500">💬 {o.message}</p>}
          </li>
        ))}
      </ul>
      {next && (
        <button type="button" disabled={pending} onClick={() => load(true)} className="w-full rounded-lg border border-slate-300 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          {pending ? "불러오는 중…" : "더 보기"}
        </button>
      )}
    </section>
  );
}
