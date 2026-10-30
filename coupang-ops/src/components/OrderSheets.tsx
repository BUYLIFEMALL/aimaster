"use client";

import { useState, useTransition } from "react";
import { acknowledgeOrdersAction, listOrderSheetsAction } from "@/lib/actions/orders";
import { ACK_MAX, ORDER_STATUSES, orderStatusLabel, type AckResult, type OrderSheet } from "@/lib/coupang/orders";

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
  const [shownStatus, setShownStatus] = useState(""); // 지금 목록을 불러온 상태(결제완료일 때만 상품준비중 처리)
  const [picked, setPicked] = useState<number[]>([]);
  const [asking, setAsking] = useState(false);
  const [ackNote, setAckNote] = useState("");
  const [ackResults, setAckResults] = useState<AckResult[]>([]);

  const load = (more: boolean) =>
    start(async () => {
      setError("");
      const r = await listOrderSheetsAction({ from, to, status, nextToken: more ? next : undefined });
      if (!r.ok) return setError(r.error);
      setOrders(more ? [...orders, ...r.orders] : r.orders);
      setNext(r.nextToken);
      setLoaded(true);
      setShownStatus(status);
      if (!more) {
        setPicked([]);
        setAckResults([]);
        setAckNote("");
      }
    });

  const canAck = shownStatus === "ACCEPT";
  const toggle = (id: number) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : picked.length >= ACK_MAX ? picked : [...picked, id]);

  // 결제완료 → 상품준비중. 실제 주문 상태가 바뀌므로 확인을 한 번 더 받고, 실패해도 다시 보내지 않는다
  const acknowledge = () =>
    start(async () => {
      setAsking(false);
      const r = await acknowledgeOrdersAction(picked);
      if (!r.ok) return setAckNote(`❌ ${r.error}`);
      setAckResults(r.results);
      setAckNote(`✅ ${r.summary} 처리 뒤 고객이 배송지를 바꿨을 수 있으니 「상품준비중」으로 다시 불러와 주소를 확인해 주세요.`);
      const done = new Set(r.results.filter((x) => x.ok).map((x) => x.shipmentBoxId));
      setOrders(orders.filter((o) => !done.has(o.shipmentBoxId)));
      setPicked([]);
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
      {canAck && orders.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
          <span>보낼 준비를 시작할 주문을 고르세요(한 번에 {ACK_MAX}건까지). 처리하면 쿠팡 주문 상태가 「상품준비중」으로 바뀝니다.</span>
          <button type="button" onClick={() => setPicked(picked.length ? [] : orders.slice(0, ACK_MAX).map((o) => o.shipmentBoxId))} className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-700">{picked.length ? "선택 해제" : "모두 고르기"}</button>
          <button type="button" disabled={pending || picked.length === 0} onClick={() => setAsking(true)} className="rounded border border-rose-600 bg-rose-700 px-2 py-1 text-[11px] font-bold text-white disabled:opacity-50">선택한 {picked.length}건 상품준비중으로</button>
        </div>
      )}
      {asking && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[12px] text-rose-900">
          <span className="font-bold">주문 {picked.length}건을 쿠팡에서 「상품준비중」으로 바꿀까요? 되돌릴 수 없습니다.</span>
          <button type="button" disabled={pending} onClick={acknowledge} className="rounded border border-rose-600 bg-rose-700 px-2 py-1 text-[11px] font-bold text-white disabled:opacity-50">{pending ? "바꾸는 중…" : "네, 쿠팡에 적용"}</button>
          <button type="button" disabled={pending} onClick={() => setAsking(false)} className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-700">취소</button>
        </div>
      )}
      {ackNote && <p className="text-[12px] text-slate-800">{ackNote}</p>}
      {ackResults.some((x) => !x.ok) && (
        <ul className="rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-900">
          {ackResults.filter((x) => !x.ok).map((x) => <li key={x.shipmentBoxId}>배송번호 {x.shipmentBoxId}: {x.message}{x.retryable ? " (잠시 뒤 다시 시도할 수 있습니다)" : ""}</li>)}
        </ul>
      )}
      <ul className="space-y-2">
        {orders.map((o) => (
          <li key={o.shipmentBoxId} className="rounded-lg border border-slate-200 p-3 text-[13px]">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {canAck && <input type="checkbox" aria-label={`배송번호 ${o.shipmentBoxId} 고르기`} checked={picked.includes(o.shipmentBoxId)} onChange={() => toggle(o.shipmentBoxId)} className="h-4 w-4 accent-rose-700" />}
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
