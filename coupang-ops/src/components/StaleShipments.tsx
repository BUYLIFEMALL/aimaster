"use client";

import { useState, useTransition } from "react";
import { completeLongUndeliveryAction } from "@/lib/actions/downloadCoupon";
import { listStaleShipmentsAction, shipmentHistoryAction } from "@/lib/actions/shipping";
import { checkLongUndelivery, LONG_UNDELIVERY_DAYS } from "@/lib/coupang/downloadCoupon";
import type { HistoryStep, StaleShipment } from "@/lib/coupang/shipping";

/** 플랜 묶음 3 오래 멈춘 배송 — 버튼을 눌렀을 때만 읽는다(쿠팡 2회). 장기 미배송 배송완료(A6)만 2단 확인 뒤 보낸다 */
export function StaleShipments({ keysSaved }: { keysSaved: boolean }) {
  const [rows, setRows] = useState<StaleShipment[] | null>(null);
  const [more, setMore] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<Record<number, HistoryStep[] | string>>({});
  const [pending, start] = useTransition();
  const [longBox, setLongBox] = useState("");
  const [longInvoice, setLongInvoice] = useState("");
  const [longAsk, setLongAsk] = useState(false);
  const [longNote, setLongNote] = useState("");
  const longProblem = checkLongUndelivery(Number(longBox), longInvoice);
  const completeLong = () =>
    start(async () => {
      const r = await completeLongUndeliveryAction(Number(longBox), longInvoice);
      setLongAsk(false);
      setLongNote(r.ok ? `✅ ${r.message}` : `❌ ${r.error}`);
    });

  const load = () =>
    start(async () => {
      setError("");
      const r = await listStaleShipmentsAction();
      if (!r.ok) return setError(r.error);
      setRows(r.rows);
      setMore(r.more);
      setHistory({});
    });
  const openHistory = (id: number) =>
    start(async () => {
      const r = await shipmentHistoryAction(id);
      setHistory((old) => ({ ...old, [id]: r.ok ? r.steps : r.error }));
    });

  return (
    <section className="slw-card space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">🐢 오래 멈춘 배송</h2>
          <p className="mt-0.5 text-xs text-slate-600">주문한 지 배송지시 3일, 배송중 5일이 지난 건을 보여 줍니다. 송장 오입력이나 미집하를 찾는 용도입니다.</p>
        </div>
        <button type="button" disabled={!keysSaved || pending} onClick={load} className="rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-bold text-blue-800 disabled:opacity-50">
          {pending ? "확인 중…" : rows ? "다시 확인" : "오래 멈춘 배송 확인"}
        </button>
      </div>
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-900">❌ {error}</p>}
      {rows?.length === 0 && <p className="rounded-lg bg-teal-50 px-3 py-2 text-[13px] text-teal-900">✅ 오래 멈춘 배송이 없습니다.{more ? " (상태별 앞 50건 기준)" : ""}</p>}
      {more && !!rows?.length && <p className="text-[11px] text-amber-800">상태별 앞 50건만 확인했습니다. 더 있을 수 있습니다.</p>}
      <ul className="space-y-2">
        {rows?.map((x) => {
          const h = history[x.shipmentBoxId];
          return (
            <li key={x.shipmentBoxId} className="rounded-lg border border-slate-200 p-3 text-[13px]">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="rounded bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">{x.statusLabel} · {x.days}일째</span>
                <span className="font-bold text-slate-900">주문번호 {x.orderId}</span>
                <span className="text-xs text-slate-500">{x.courier} {x.invoice}</span>
                <button type="button" disabled={pending} onClick={() => openHistory(x.shipmentBoxId)} className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700 disabled:opacity-50">배송 이력</button>
              </div>
              <p className="mt-1 text-slate-800">{x.itemName}</p>
              {typeof h === "string" && <p className="mt-1 text-[12px] text-rose-800">❌ {h}</p>}
              {Array.isArray(h) && (
                <ul className="mt-1 text-[12px] text-slate-600">
                  {h.length === 0 && <li>이력이 없습니다.</li>}
                  {h.map((step, i) => <li key={i}>{step.at.replace("T", " ").slice(0, 16)} · {step.label}</li>)}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      <div className="space-y-2 border-t border-slate-200 pt-3">
        <h3 className="text-sm font-extrabold text-slate-900">장기 미배송 배송완료 처리</h3>
        <p className="text-[12px] text-amber-800">⚠ 배송지시 뒤 {LONG_UNDELIVERY_DAYS}~32일이 지났는데 배송 추적이 안 되는 건만 됩니다. 실제로 받지 못한 고객과 분쟁이 나면 비용은 판매자 부담이니, 고객 수령을 확인한 뒤에만 처리해 주세요. 조회 기간(31일) 밖의 주문은 배송번호와 송장번호를 직접 넣어 주세요.</p>
        <div className="flex flex-wrap items-center gap-2">
          <input aria-label="배송번호" inputMode="numeric" placeholder="배송번호" value={longBox} onChange={(e) => { setLongAsk(false); setLongBox(e.target.value.replace(/\D/g, "")); }} className="w-44 rounded border border-slate-300 px-2 py-1 text-[12px]" />
          <input aria-label="송장번호" placeholder="송장번호" value={longInvoice} onChange={(e) => { setLongAsk(false); setLongInvoice(e.target.value); }} className="w-44 rounded border border-slate-300 px-2 py-1 text-[12px]" />
          <button type="button" disabled={!keysSaved || pending || !!longProblem} onClick={() => setLongAsk(true)} className="rounded border border-slate-300 bg-white px-2 py-1 text-[12px] font-bold text-slate-700 disabled:opacity-50">배송완료 처리</button>
        </div>
        {longAsk && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
            <b>배송번호 {longBox}을 배송완료로 바꿀까요? 고객 수령을 확인했을 때만 진행해 주세요.</b>
            <button type="button" disabled={pending} onClick={completeLong} className="rounded border border-blue-600 bg-blue-700 px-3 py-1 font-bold text-white disabled:opacity-50">네, 쿠팡에 적용</button>
            <button type="button" disabled={pending} onClick={() => setLongAsk(false)} className="rounded border border-slate-300 bg-white px-3 py-1 font-bold text-slate-700">취소</button>
          </div>
        )}
        {longNote && <p className="text-[12px] text-slate-800">{longNote}</p>}
      </div>
    </section>
  );
}
