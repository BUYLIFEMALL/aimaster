"use client";

import { useState, useTransition } from "react";
import { confirmExchangeAction, listExchangesAction, rejectExchangeAction, sendExchangeInvoiceAction, type ExchangeDone } from "@/lib/actions/exchanges";
import { COMMON_COURIERS } from "@/lib/coupang/defaults";
import { canSendExchangeInvoice, EXCHANGE_REJECT_REASONS, isOpenExchange, type ExchangeRow } from "@/lib/coupang/exchanges";

const btn = "rounded border px-2 py-1 text-[11px] font-bold disabled:opacity-50";
type Ask = { kind: "confirm" | "reject" | "invoice"; row: ExchangeRow; label: string };
type Form = { courier: string; invoice: string; reason: string };

/** 플랜 묶음 3 교환 처리 — 버튼을 눌렀을 때만 읽고, 쓰기는 확인 뒤 서버가 상태를 다시 읽어 보낸다 */
export function ExchangeRequests({ keysSaved, defaultCourier }: { keysSaved: boolean; defaultCourier: string }) {
  const [rows, setRows] = useState<ExchangeRow[] | null>(null);
  const [next, setNext] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [ask, setAsk] = useState<Ask | null>(null);
  const [forms, setForms] = useState<Record<number, Form>>({});
  const [pending, start] = useTransition();

  const formOf = (id: number): Form => forms[id] ?? { courier: defaultCourier, invoice: "", reason: EXCHANGE_REJECT_REASONS[0].code };
  const setForm = (id: number, patch: Partial<Form>) => setForms({ ...forms, [id]: { ...formOf(id), ...patch } });

  const load = (more: boolean) =>
    start(async () => {
      setError("");
      if (!more) setNote("");
      const r = await listExchangesAction(more ? next : undefined);
      if (!r.ok) return setError(r.error);
      setRows(more ? [...(rows ?? []), ...r.rows] : r.rows);
      setNext(r.nextToken);
    });

  const confirm = () =>
    ask &&
    start(async () => {
      const { kind, row } = ask;
      const f = formOf(row.exchangeId);
      setAsk(null);
      let r: ExchangeDone;
      if (kind === "confirm") r = await confirmExchangeAction(row.orderId, row.exchangeId);
      else if (kind === "reject") r = await rejectExchangeAction(row.orderId, row.exchangeId, f.reason);
      else r = await sendExchangeInvoiceAction(row.orderId, row.exchangeId, f.courier, f.invoice);
      if (!r.ok) return setNote(`❌ 교환번호 ${row.exchangeId}: ${r.error}`);
      setNote(`✅ 교환번호 ${row.exchangeId}: ${r.message}`);
      if (r.row) setRows((old) => (old ?? []).map((x) => (x.exchangeId === row.exchangeId ? (r as { row: ExchangeRow }).row : x)));
    });

  return (
    <section className="slw-card space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-600">최근 7일 교환 요청을 불러옵니다. 고객 이름·연락처·주소는 읽지 않습니다.</p>
        <button type="button" disabled={!keysSaved || pending} onClick={() => load(false)} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50">
          {pending && !ask ? "불러오는 중…" : rows ? "다시 불러오기" : "교환 요청 불러오기"}
        </button>
      </div>
      {!keysSaved && <p className="text-xs text-amber-800">먼저 「🔑 쿠팡 연결」에서 키를 저장해 주세요.</p>}
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-900">❌ {error}</p>}
      {note && <p className="text-[12px] text-slate-800">{note}</p>}
      {rows?.length === 0 && <p className="rounded-lg bg-teal-50 px-3 py-2 text-[13px] text-teal-900">✅ 최근 7일 교환 요청이 없습니다.</p>}
      {ask && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[12px] text-rose-900">
          <span className="font-bold">{ask.label}</span>
          <button type="button" disabled={pending} onClick={confirm} className={`${btn} border-blue-600 bg-blue-700 text-white`}>{pending ? "보내는 중…" : "네, 쿠팡에 적용"}</button>
          <button type="button" disabled={pending} onClick={() => setAsk(null)} className={`${btn} border-slate-300 bg-white text-slate-700`}>취소</button>
        </div>
      )}
      <ul className="space-y-2">
        {rows?.map((x) => {
          const f = formOf(x.exchangeId);
          const canInvoice = canSendExchangeInvoice(x);
          return (
            <li key={x.exchangeId} className="rounded-lg border border-slate-200 p-3 text-[13px]">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="rounded bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">{x.statusLabel}</span>
                <span className="font-bold text-slate-900">주문번호 {x.orderId}</span>
                <span className="text-xs text-slate-500">교환번호 {x.exchangeId} · 접수 {x.createdAt.replace("T", " ").slice(0, 16)} · 회수: {x.collectLabel || "정보 없음"}{x.faultLabel ? ` · ${x.faultLabel}` : ""}</span>
              </div>
              {x.reason && <p className="mt-1 text-xs text-slate-600">사유: {x.reason}</p>}
              {x.items.map((name, i) => <p key={`${name}-${i}`} className="text-slate-800">· {name}</p>)}
              {isOpenExchange(x) && (
                <div className="mt-2 space-y-2 rounded-lg bg-slate-50 p-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" disabled={pending} onClick={() => setAsk({ kind: "confirm", row: x, label: `주문번호 ${x.orderId}의 반송 상품을 받았다고 입고 확인할까요?` })} className={`${btn} border-blue-600 bg-white text-blue-800`}>입고 확인</button>
                    <select aria-label={`교환번호 ${x.exchangeId} 거부 사유`} value={f.reason} onChange={(e) => setForm(x.exchangeId, { reason: e.target.value })} className="rounded border border-slate-300 bg-white px-2 py-1 text-[12px]">
                      {EXCHANGE_REJECT_REASONS.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
                    </select>
                    <button type="button" disabled={pending} onClick={() => setAsk({ kind: "reject", row: x, label: `주문번호 ${x.orderId}의 교환을 거부할까요? 사유: ${EXCHANGE_REJECT_REASONS.find((r) => r.code === f.reason)?.label}` })} className={`${btn} border-slate-400 bg-white text-slate-800`}>교환 거부</button>
                  </div>
                  {canInvoice ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <select aria-label={`교환번호 ${x.exchangeId} 택배사`} value={f.courier} onChange={(e) => setForm(x.exchangeId, { courier: e.target.value })} className="rounded border border-slate-300 bg-white px-2 py-1 text-[12px]">
                        {!f.courier && <option value="">택배사 고르기</option>}
                        {COMMON_COURIERS.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                      </select>
                      <input aria-label={`교환번호 ${x.exchangeId} 송장번호`} placeholder="교환 상품 송장번호" value={f.invoice} onChange={(e) => setForm(x.exchangeId, { invoice: e.target.value })} className="w-44 rounded border border-slate-300 bg-white px-2 py-1 text-[12px]" />
                      <button type="button" disabled={pending || !f.invoice.trim() || !f.courier} onClick={() => setAsk({ kind: "invoice", row: x, label: `주문번호 ${x.orderId}의 교환 상품 송장을 등록할까요?` })} className={`${btn} border-blue-600 bg-white text-blue-800`}>교환 송장 등록</button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500">교환 송장은 회수 상태가 「업체 전달 완료」이고 입고 확인 뒤 새 배송번호가 생기면 넣을 수 있습니다(최대 10분).</p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {next && (
        <button type="button" disabled={pending} onClick={() => load(true)} className="w-full rounded-lg border border-slate-300 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">더 보기</button>
      )}
    </section>
  );
}
