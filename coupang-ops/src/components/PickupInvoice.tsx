"use client";

import { useState, useTransition } from "react";
import { uploadPickupInvoiceAction } from "@/lib/actions/logistics";
import { COMMON_COURIERS } from "@/lib/coupang/defaults";

const cell = "rounded border border-slate-300 bg-white px-2 py-1 text-[12px]";
const btn = "rounded border px-2 py-1 text-[11px] font-bold disabled:opacity-50";

/** 직접 회수하는 판매자의 회수 송장 등록. 굿스플로 자동 연동을 쓰면 필요 없다 */
export function PickupInvoice({ type, receiptId, defaultCourier }: { type: "RETURN" | "EXCHANGE"; receiptId: number; defaultCourier: string }) {
  const [courier, setCourier] = useState(defaultCourier);
  const [invoice, setInvoice] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [ask, setAsk] = useState(false);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const send = () =>
    start(async () => {
      const r = await uploadPickupInvoiceAction({ type, receiptId, courier, invoice, regNumber });
      setAsk(false);
      setNote(r.ok ? `✅ ${r.message}` : `❌ ${r.error}`);
      if (r.ok) setInvoice("");
    });
  return (
    <details className="mt-2 rounded-lg bg-slate-50 p-2 text-[12px]">
      <summary className="cursor-pointer font-bold text-slate-700">🚚 회수 송장 등록(직접 회수할 때)</summary>
      <p className="mt-1 text-[11px] text-slate-500">쿠팡 반품 자동 연동(굿스플로)을 쓰신다면 넣지 않아도 됩니다. 보낼 때 쓴 송장번호와 같은 번호는 넣을 수 없습니다.</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <select aria-label="회수 택배사" value={courier} onChange={(e) => setCourier(e.target.value)} className={cell}>
          {!courier && <option value="">택배사 고르기</option>}
          {COMMON_COURIERS.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
        <input aria-label="회수 송장번호" placeholder="회수 송장번호" value={invoice} onChange={(e) => { setAsk(false); setInvoice(e.target.value); }} className={`${cell} w-40`} />
        <input aria-label="회수번호" placeholder="회수번호(있으면)" value={regNumber} onChange={(e) => setRegNumber(e.target.value)} className={`${cell} w-32`} />
        {!ask ? (
          <button type="button" disabled={pending || !invoice.trim() || !courier} onClick={() => setAsk(true)} className={`${btn} border-slate-300 bg-white text-slate-700`}>회수 송장 등록</button>
        ) : (
          <>
            <button type="button" disabled={pending} onClick={send} className={`${btn} border-blue-600 bg-blue-700 text-white`}>{pending ? "보내는 중…" : "네, 쿠팡에 적용"}</button>
            <button type="button" disabled={pending} onClick={() => setAsk(false)} className={`${btn} border-slate-300 bg-white text-slate-700`}>취소</button>
          </>
        )}
      </div>
      {note && <p className="mt-1 text-slate-800">{note}</p>}
    </details>
  );
}
