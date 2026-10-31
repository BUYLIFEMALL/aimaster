"use client";

import { useEffect, useState, useTransition } from "react";
import { alreadyShippedAction, approveReturnAction, confirmReturnReceiptAction, listReturnRequestsAction, stopShipmentAction } from "@/lib/actions/returns";
import { RETURN_VIEWS, returnSteps, type ReturnRequest } from "@/lib/coupang/returns";
import { COMMON_COURIERS } from "@/lib/coupang/defaults";
import { PickupInvoice } from "@/components/PickupInvoice";
import { listWithdrawalsAction } from "@/lib/actions/logistics";
import { PICKUP_RETURN_STATUS, type Withdrawal } from "@/lib/coupang/logisticsWrite";

const input = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";
const btn = "rounded border px-2 py-1 text-[11px] font-bold disabled:opacity-50";
/** 한국 시간 기준 오늘에서 n일 전 날짜(yyyy-mm-dd) */
const kstDay = (back: number) => new Date(Date.now() + 9 * 3_600_000 - back * 86_400_000).toISOString().slice(0, 10);

type Ask = { kind: "stop" | "shipped" | "receipt" | "approve"; receiptId: number; label: string };

export function ReturnRequests({ keysSaved, defaultCourier, initialView = "", autoLoad = false }: { keysSaved: boolean; defaultCourier: string; initialView?: string; autoLoad?: boolean }) {
  const [view, setView] = useState(RETURN_VIEWS.some((v) => v.value === initialView) ? initialView : "RU");
  const [from, setFrom] = useState(kstDay(30));
  const [to, setTo] = useState(kstDay(0));
  const [rows, setRows] = useState<ReturnRequest[]>([]);
  const [next, setNext] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [ask, setAsk] = useState<Ask | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[] | null>(null);
  const [withdrawError, setWithdrawError] = useState("");
  const loadWithdrawals = () =>
    start(async () => {
      setWithdrawError("");
      const r = await listWithdrawalsAction();
      if (!r.ok) return setWithdrawError(r.error);
      setWithdrawals(r.rows);
    });
  const [ship, setShip] = useState<Record<number, { courier: string; invoice: string }>>({});
  const [pending, start] = useTransition();

  const load = (more: boolean) =>
    start(async () => {
      setError("");
      const r = await listReturnRequestsAction({ from, to, view, nextToken: more ? next : undefined });
      if (!r.ok) return setError(r.error);
      setRows(more ? [...rows, ...r.requests] : r.requests);
      setNext(r.nextToken);
      setLoaded(true);
      if (!more) setNote("");
    });

  const shipOf = (id: number) => ship[id] ?? { courier: defaultCourier, invoice: "" };

  // 실제 주문 처리가 바뀌므로 확인을 한 번 더 받고, 실패해도 다시 보내지 않는다
  const confirm = () =>
    ask &&
    start(async () => {
      const a = ask;
      setAsk(null);
      if (a.kind === "receipt" || a.kind === "approve") {
        const step = a.kind === "receipt" ? await confirmReturnReceiptAction(a.receiptId) : await approveReturnAction(a.receiptId);
        if (!step.ok) return setNote(`❌ 접수번호 ${a.receiptId}: ${step.error}`);
        const updated = step.request;
        setNote(`✅ 접수번호 ${a.receiptId}: ${step.message}${updated ? ` 지금 상태: ${updated.statusLabel}` : " 상태는 목록을 다시 불러와 확인해 주세요."}`);
        if (updated) setRows(rows.map((x) => (x.receiptId === a.receiptId ? updated : x)));
        return;
      }
      const r = a.kind === "stop" ? await stopShipmentAction(a.receiptId) : await alreadyShippedAction(a.receiptId, shipOf(a.receiptId).courier, shipOf(a.receiptId).invoice);
      setNote(r.ok ? `✅ 접수번호 ${a.receiptId}: ${r.message}` : `❌ 접수번호 ${a.receiptId}: ${r.error}`);
      if (r.ok) setRows(rows.filter((x) => x.receiptId !== a.receiptId));
    });

  useEffect(() => {
    if (autoLoad && keysSaved) load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="slw-card space-y-4 p-5">
      {!keysSaved && <p className="text-xs text-amber-800">먼저 「API키등록·플랫폼연동」에서 키를 저장해 주세요.</p>}
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-bold text-slate-700">
          종류
          <select value={view} onChange={(e) => setView(e.target.value)} className={`mt-1 block ${input}`}>
            {RETURN_VIEWS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
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
        <button type="button" disabled={!keysSaved || pending} onClick={() => load(false)} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50">
          {pending ? "불러오는 중…" : "요청 불러오기"}
        </button>
      </div>
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-900">❌ {error}</p>}
      {note && <p className="text-[12px] text-slate-800">{note}</p>}
      {loaded && !error && rows.length === 0 && <p className="text-sm text-slate-600">이 기간에 해당하는 요청이 없습니다.</p>}
      {ask && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[12px] text-rose-900">
          <span className="font-bold">{ask.label}</span>
          <button type="button" disabled={pending} onClick={confirm} className={`${btn} border-blue-600 bg-blue-700 text-white`}>{pending ? "보내는 중…" : "네, 쿠팡에 적용"}</button>
          <button type="button" disabled={pending} onClick={() => setAsk(null)} className={`${btn} border-slate-300 bg-white text-slate-700`}>취소</button>
        </div>
      )}
      <ul className="space-y-2">
        {rows.map((x) => (
          <li key={x.receiptId} className="rounded-lg border border-slate-200 p-3 text-[13px]">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="rounded bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">{x.statusLabel || x.receiptType}</span>
              <span className="font-bold text-slate-900">주문번호 {x.orderId}</span>
              <span className="text-xs text-slate-500">접수번호 {x.receiptId} · 접수 {x.createdAt.replace("T", " ").slice(0, 16)}{x.releaseStopStatus ? ` · 출고중지 처리: ${x.releaseStopStatus}` : ""}</span>
            </div>
            {x.reason && <p className="mt-1 text-xs text-slate-600">사유: {x.reason}</p>}
            <ul className="mt-1 space-y-0.5">
              {x.items.map((it, i) => (
                <li key={`${it.vendorItemId}-${i}`} className="text-slate-800">
                  · {it.name || `옵션 ${it.vendorItemId}`} — 주문 {it.purchaseCount}개 중 취소 {it.cancelCount}개 · <b>{it.releaseLabel || "출고 정보 없음"}</b>
                </li>
              ))}
            </ul>
            {x.receiptStatus === PICKUP_RETURN_STATUS && <PickupInvoice type="RETURN" receiptId={x.receiptId} defaultCourier={defaultCourier} />}
            {returnSteps(x).canConfirmReceipt && (
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2">
                <span className="text-[11px] text-amber-800">반품 상품이 도착해 상태를 확인했다면 입고 확인을 눌러 주세요. 10만원 미만 빠른환불 대상은 이 단계에서 바로 환불될 수 있습니다.</span>
                <button type="button" disabled={pending} onClick={() => setAsk({ kind: "receipt", receiptId: x.receiptId, label: `주문번호 ${x.orderId}의 반품 상품을 받았다고 입고 확인할까요? 바로 환불될 수 있습니다.` })} className={`${btn} border-blue-600 bg-white text-blue-800`}>입고 확인</button>
              </div>
            )}
            {returnSteps(x).canApprove && (
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2">
                <span className="text-[11px] text-amber-800">입고가 끝난 건입니다. 승인하면 고객에게 환불됩니다. 상품에 문제가 있으면 승인하지 말고 WING에서 「쿠팡 확인 요청」을 해 주세요.</span>
                <button type="button" disabled={pending} onClick={() => setAsk({ kind: "approve", receiptId: x.receiptId, label: `주문번호 ${x.orderId}의 반품을 승인할까요? 고객에게 환불됩니다(${x.cancelCountSum}개).` })} className={`${btn} border-blue-600 bg-blue-700 text-white`}>반품 승인(환불)</button>
              </div>
            )}
            {x.actionable && (
              <div className="mt-2 space-y-2 rounded-lg bg-slate-50 p-2">
                <p className="text-[11px] text-amber-800">⚠ 아직 보내지 않았다면 「출고중지 완료」, 이미 보냈다면 송장을 넣고 「이미출고」로 처리하세요. 출고중지 요청 건을 보내면 왕복 반품 배송비는 판매자 부담입니다.</p>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" disabled={pending} onClick={() => setAsk({ kind: "stop", receiptId: x.receiptId, label: `주문번호 ${x.orderId}를 보내지 않고 출고중지 완료로 처리할까요? (취소 ${x.cancelCountSum}개)` })} className={`${btn} border-blue-600 bg-white text-blue-800`}>
                    출고중지 완료(보내지 않음)
                  </button>
                  <span className="text-[11px] text-slate-400">또는</span>
                  <select aria-label={`접수번호 ${x.receiptId} 택배사`} value={shipOf(x.receiptId).courier} onChange={(e) => setShip({ ...ship, [x.receiptId]: { ...shipOf(x.receiptId), courier: e.target.value } })} className="rounded border border-slate-300 bg-white px-2 py-1 text-[12px]">
                    {!shipOf(x.receiptId).courier && <option value="">택배사 고르기</option>}
                    {COMMON_COURIERS.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                  <input aria-label={`접수번호 ${x.receiptId} 송장번호`} placeholder="보낸 송장번호" value={shipOf(x.receiptId).invoice} onChange={(e) => setShip({ ...ship, [x.receiptId]: { ...shipOf(x.receiptId), invoice: e.target.value } })} className="w-40 rounded border border-slate-300 bg-white px-2 py-1 text-[12px]" />
                  <button type="button" disabled={pending || !shipOf(x.receiptId).invoice.trim()} onClick={() => setAsk({ kind: "shipped", receiptId: x.receiptId, label: `주문번호 ${x.orderId}를 이미 보냈다고(이미출고) 처리할까요? 왕복 반품 배송비는 판매자 부담입니다.` })} className={`${btn} border-slate-400 bg-white text-slate-800`}>
                    이미출고 처리
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="space-y-2 border-t border-slate-200 pt-3">
        <button type="button" disabled={!keysSaved || pending} onClick={loadWithdrawals} className="rounded border border-slate-300 bg-white px-2 py-1 text-[12px] font-bold text-slate-700 disabled:opacity-50">↩ 고객이 철회한 반품 보기(최근 7일)</button>
        {withdrawError && <p className="text-[12px] text-rose-800">❌ {withdrawError}</p>}
        {withdrawals?.length === 0 && <p className="text-[12px] text-slate-600">최근 7일에 철회된 반품이 없습니다.</p>}
        {!!withdrawals?.length && (
          <ul className="space-y-1 text-[12px] text-slate-800">
            {withdrawals.map((w) => <li key={w.cancelId}>주문번호 {w.orderId} · 접수번호 {w.cancelId} · 귀책 {w.dutyLabel} · {w.createdAt.replace("T", " ").slice(0, 16)} 철회 · 옵션 {w.vendorItemIds.join(", ")}</li>)}
          </ul>
        )}
      </div>
      {next && (
        <button type="button" disabled={pending} onClick={() => load(true)} className="w-full rounded-lg border border-slate-300 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          {pending ? "불러오는 중…" : "더 보기"}
        </button>
      )}
    </section>
  );
}
