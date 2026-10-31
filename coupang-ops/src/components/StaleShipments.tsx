"use client";

import { useState, useTransition } from "react";
import { listStaleShipmentsAction, shipmentHistoryAction } from "@/lib/actions/shipping";
import type { HistoryStep, StaleShipment } from "@/lib/coupang/shipping";

/** 플랜 묶음 3 오래 멈춘 배송 — 버튼을 눌렀을 때만 읽는다(쿠팡 2회). 표시만 하고 상태를 바꾸지 않는다 */
export function StaleShipments({ keysSaved }: { keysSaved: boolean }) {
  const [rows, setRows] = useState<StaleShipment[] | null>(null);
  const [more, setMore] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<Record<number, HistoryStep[] | string>>({});
  const [pending, start] = useTransition();

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
    </section>
  );
}
