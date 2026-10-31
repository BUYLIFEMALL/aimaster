"use client";

import { useState, useTransition } from "react";
import { createDownloadCouponAction, downloadCouponStatusAction, expireDownloadCouponAction } from "@/lib/actions/downloadCoupon";
import { parseVendorItemIds, type Contract } from "@/lib/coupang/coupons";
import { checkDownloadCoupon, MAX_DL_ITEMS, MAX_POLICIES } from "@/lib/coupang/downloadCoupon";

const field = "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal focus:border-blue-500 focus:outline-none";
const label = "text-xs font-bold text-slate-700";
const line = "rounded border border-slate-300 bg-white px-2 py-1 text-[12px] font-bold text-slate-700 disabled:opacity-50";
const emptyPolicy = { title: "", minimumPrice: "", discount: "", maximumDiscountPrice: "", maximumPerDaily: "1" };
const num = (v: string) => Number(v.replace(/[,\s원%]/g, ""));

/** 다운로드 쿠폰: 고객이 받아 쓰는 쿠폰. 만들 때 옵션을 함께 넣고, 뒤에는 바꿀 수 없다 */
export function DownloadCouponPanel({ contracts }: { contracts: Contract[] }) {
  const [form, setForm] = useState({ contractId: 0, title: "", typeOfDiscount: "PRICE" as "RATE" | "PRICE", startAt: "", endAt: "", items: "" });
  const [policies, setPolicies] = useState([{ ...emptyPolicy }]);
  const [expireId, setExpireId] = useState("");
  const [ask, setAsk] = useState<"create" | "expire" | null>(null);
  const [note, setNote] = useState("");
  const [txId, setTxId] = useState("");
  const [pending, start] = useTransition();

  const draft = {
    contractId: form.contractId,
    title: form.title,
    typeOfDiscount: form.typeOfDiscount,
    startAt: form.startAt,
    endAt: form.endAt,
    vendorItemIds: parseVendorItemIds(form.items),
    policies: policies.map((p) => ({ title: p.title, description: "", minimumPrice: num(p.minimumPrice), discount: num(p.discount), maximumDiscountPrice: num(p.maximumDiscountPrice), maximumPerDaily: num(p.maximumPerDaily) })),
  };
  const problem = checkDownloadCoupon(draft);
  const setF = (patch: Partial<typeof form>) => { setAsk(null); setForm({ ...form, ...patch }); };
  const setP = (i: number, patch: Partial<typeof emptyPolicy>) => { setAsk(null); setPolicies(policies.map((p, n) => (n === i ? { ...p, ...patch } : p))); };

  const send = () =>
    start(async () => {
      const r = ask === "create" ? await createDownloadCouponAction(draft) : await expireDownloadCouponAction(Number(expireId));
      setAsk(null);
      setNote(r.ok ? `✅ ${r.message}` : `❌ ${r.error}`);
      setTxId(r.ok ? r.transactionId ?? "" : "");
    });
  const check = () =>
    start(async () => {
      const r = await downloadCouponStatusAction(txId);
      setNote(r.ok ? r.message : `❌ ${r.error}`);
    });

  return (
    <section className="slw-card space-y-3 p-5">
      <h2 className="text-base font-extrabold text-slate-900">새 다운로드 쿠폰</h2>
      <p className="text-[12px] text-amber-800">⚠ 쿠폰 이름과 정책 이름은 고객에게 보입니다. 옵션 하나에 쿠폰 하나만 되고, 넣은 옵션은 바꿀 수 없어 파기 후 새로 만들어야 합니다. 할인액은 정산에서 빠질 수 있습니다.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className={label}>계약
          <select value={form.contractId} onChange={(e) => setF({ contractId: Number(e.target.value) })} className={field}>
            <option value={0}>선택</option>
            {contracts.map((c) => <option key={c.contractId} value={c.contractId}>#{c.contractId} · {c.start.slice(0, 10)}~{c.end.slice(0, 10)}</option>)}
          </select>
        </label>
        <label className={label}>쿠폰 이름(45자)<input maxLength={45} value={form.title} onChange={(e) => setF({ title: e.target.value })} className={field} /></label>
        <label className={label}>할인 방식
          <select value={form.typeOfDiscount} onChange={(e) => setF({ typeOfDiscount: e.target.value as "RATE" | "PRICE" })} className={field}><option value="PRICE">정액(원)</option><option value="RATE">정률(%)</option></select>
        </label>
        <label className={label}>시작(1시간 뒤부터, 한국 시각)<input type="datetime-local" value={form.startAt} onChange={(e) => setF({ startAt: e.target.value })} className={field} /></label>
        <label className={label}>종료<input type="datetime-local" value={form.endAt} onChange={(e) => setF({ endAt: e.target.value })} className={field} /></label>
        <label className={label}>옵션ID(쉼표로, {MAX_DL_ITEMS}개까지)<input value={form.items} onChange={(e) => setF({ items: e.target.value })} className={field} /></label>
      </div>
      {policies.map((p, i) => (
        <div key={i} className="grid gap-2 rounded-lg bg-slate-50 p-2 sm:grid-cols-5">
          <label className={label}>정책 {i + 1} 이름<input value={p.title} onChange={(e) => setP(i, { title: e.target.value })} className={field} /></label>
          <label className={label}>최소 구매금액<input inputMode="numeric" value={p.minimumPrice} onChange={(e) => setP(i, { minimumPrice: e.target.value })} className={field} /></label>
          <label className={label}>할인값<input inputMode="numeric" value={p.discount} onChange={(e) => setP(i, { discount: e.target.value })} className={field} /></label>
          {form.typeOfDiscount === "RATE" && <label className={label}>최대 할인금액<input inputMode="numeric" value={p.maximumDiscountPrice} onChange={(e) => setP(i, { maximumDiscountPrice: e.target.value })} className={field} /></label>}
          <label className={label}>1인 1일 발급<input inputMode="numeric" value={p.maximumPerDaily} onChange={(e) => setP(i, { maximumPerDaily: e.target.value })} className={field} /></label>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        {policies.length < MAX_POLICIES && <button type="button" onClick={() => setPolicies([...policies, { ...emptyPolicy }])} className={line}>정책 추가</button>}
        {policies.length > 1 && <button type="button" onClick={() => setPolicies(policies.slice(0, -1))} className={line}>마지막 정책 빼기</button>}
        {problem ? <span className="text-[12px] text-slate-500">{problem}</span> : <button type="button" disabled={pending} onClick={() => setAsk("create")} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50">다운로드 쿠폰 만들기 확인</button>}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
        <input aria-label="파기할 쿠폰 번호" inputMode="numeric" placeholder="파기할 쿠폰 번호" value={expireId} onChange={(e) => { setAsk(null); setExpireId(e.target.value); }} className="w-44 rounded border border-slate-300 px-2 py-1 text-[12px]" />
        <button type="button" disabled={pending || !expireId.trim()} onClick={() => setAsk("expire")} className={line}>파기</button>
        {txId && <button type="button" disabled={pending} onClick={check} className={line}>처리 결과 확인</button>}
      </div>
      {ask && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
          <b>{ask === "create" ? `「${form.title}」을 만들고 옵션 ${draft.vendorItemIds.length}개에 적용할까요? 옵션은 뒤에 바꿀 수 없습니다.` : `쿠폰 #${expireId}을 파기할까요? 되돌릴 수 없습니다.`}</b>
          <button type="button" disabled={pending} onClick={send} className="rounded border border-blue-600 bg-blue-700 px-3 py-1 font-bold text-white disabled:opacity-50">{pending ? "보내는 중…" : "네, 쿠팡에 적용"}</button>
          <button type="button" disabled={pending} onClick={() => setAsk(null)} className="rounded border border-slate-300 bg-white px-3 py-1 font-bold text-slate-700">취소</button>
        </div>
      )}
      {note && <p className="text-[13px] text-slate-800">{note}</p>}
    </section>
  );
}
