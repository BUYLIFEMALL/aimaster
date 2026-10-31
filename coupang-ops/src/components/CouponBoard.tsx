"use client";

import { useState, useTransition } from "react";
import { DownloadCouponPanel } from "@/components/DownloadCouponPanel";
import { addCouponItemsAction, couponRequestAction, createCouponAction, expireCouponAction, loadBudgetAction, loadCouponsAction } from "@/lib/actions/coupons";
import { checkCoupon, COUPON_STATUSES, COUPON_TYPES, MAX_COUPON_ITEMS, parseVendorItemIds, type Contract, type Coupon, type RequestState } from "@/lib/coupang/coupons";

const field = "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal focus:border-blue-500 focus:outline-none";
const label = "text-xs font-bold text-slate-700";
const primary = "rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50";
const line = "rounded border border-slate-300 bg-white px-2 py-1 text-[12px] font-bold text-slate-700 disabled:opacity-50";
const kst = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);

type Ask = { kind: "create" } | { kind: "expire"; coupon: Coupon } | { kind: "items"; coupon: Coupon; ids: number[] };

/** 즉시할인만 다룬다. 쿠팡이 비동기로 처리하므로 요청 번호로 결과를 확인한다 */
export function CouponBoard({ keysSaved }: { keysSaved: boolean }) {
  const [status, setStatus] = useState("APPLIED");
  const [contracts, setContracts] = useState<Contract[] | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [budget, setBudget] = useState<string>("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [ask, setAsk] = useState<Ask | null>(null);
  const [requestId, setRequestId] = useState("");
  const [req, setReq] = useState<RequestState | null>(null);
  const [itemText, setItemText] = useState<Record<number, string>>({});
  const [form, setForm] = useState({ contractId: 0, name: "", type: "RATE", discount: "", maxDiscountPrice: "", startDate: "", endDate: "" });
  const [pending, start] = useTransition();

  const load = () =>
    start(async () => {
      setError("");
      const r = await loadCouponsAction(status);
      if (!r.ok) return setError(r.error);
      setContracts(r.contracts);
      setCoupons(r.coupons);
    });

  const draft = { contractId: form.contractId, name: form.name, type: form.type, discount: Number(form.discount), maxDiscountPrice: Number(form.maxDiscountPrice), startDate: form.startDate, endDate: form.endDate };
  const contract = contracts?.find((c) => c.contractId === form.contractId);
  const problem = checkCoupon(draft, kst(), contract);
  const setF = (patch: Partial<typeof form>) => { setAsk(null); setForm({ ...form, ...patch }); };

  const pickContract = (id: number) => {
    setF({ contractId: id });
    setBudget("");
    if (!id) return;
    start(async () => {
      const r = await loadBudgetAction(id, kst().slice(0, 7));
      setBudget(!r.ok ? `❌ ${r.error}` : r.budget ? `이번 달 예산 ${r.budget.total.toLocaleString()}원 중 ${r.budget.used.toLocaleString()}원 사용` : "이번 달 예산 정보가 없습니다.");
    });
  };

  const send = () =>
    ask &&
    start(async () => {
      setNote("");
      const r = ask.kind === "create" ? await createCouponAction(draft) : ask.kind === "expire" ? await expireCouponAction(ask.coupon.couponId) : await addCouponItemsAction(ask.coupon.couponId, ask.ids);
      setAsk(null);
      if (!r.ok) return setNote(`❌ ${r.error}`);
      setRequestId(r.requestedId);
      setReq(null);
      setNote(r.requestedId ? "✅ 쿠팡이 요청을 받았습니다. 잠시 뒤 「처리 결과 확인」을 눌러 주세요." : "✅ 쿠팡이 요청을 받았습니다. 목록을 다시 불러와 확인해 주세요.");
    });

  const checkRequest = () =>
    start(async () => {
      const r = await couponRequestAction(requestId);
      if (!r.ok) return setNote(`❌ ${r.error}`);
      setReq(r.state);
    });

  const typeLabel = (t: string) => COUPON_TYPES.find((x) => x.value === t)?.label ?? t;

  return (
    <div className="space-y-5">
      <section className="slw-card space-y-3 p-5">
        <div className="flex flex-wrap items-end gap-2">
          <label className={label}>쿠폰 상태
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={field}>{COUPON_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
          </label>
          <button type="button" disabled={!keysSaved || pending} onClick={load} className={primary}>{pending ? "불러오는 중…" : "계약·쿠폰 불러오기"}</button>
        </div>
        {!keysSaved && <p className="text-xs text-amber-800">먼저 「API키등록·플랫폼연동」에서 키를 저장해 주세요.</p>}
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-900">❌ {error}</p>}
        {contracts && coupons.length === 0 && <p className="text-sm text-slate-600">이 상태의 쿠폰이 없습니다.</p>}
        {coupons.length > 0 && (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {coupons.map((c) => (
              <li key={c.couponId} className="space-y-1.5 px-3 py-2 text-[13px]">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <b className="min-w-0 flex-1">{c.name || "(이름 없음)"}</b>
                  <span className="text-xs text-slate-500">#{c.couponId} · {typeLabel(c.type)} {c.discount.toLocaleString()} · 최대 {c.maxDiscountPrice.toLocaleString()}원 · {c.startAt.slice(0, 10)}~{c.endAt.slice(0, 10)}</span>
                  {(c.status === "APPLIED" || c.status === "STANDBY" || c.status === "PAUSED") && <button type="button" disabled={pending} onClick={() => setAsk({ kind: "expire", coupon: c })} className={line}>파기</button>}
                </div>
                {(c.status === "APPLIED" || c.status === "STANDBY") && (
                  <div className="flex flex-wrap items-center gap-2">
                    <input aria-label="추가할 옵션ID" placeholder={`옵션ID(쉼표로, ${MAX_COUPON_ITEMS}개까지)`} value={itemText[c.couponId] ?? ""} onChange={(e) => setItemText({ ...itemText, [c.couponId]: e.target.value })} className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-[12px]" />
                    <button type="button" disabled={pending || !parseVendorItemIds(itemText[c.couponId] ?? "").length} onClick={() => setAsk({ kind: "items", coupon: c, ids: parseVendorItemIds(itemText[c.couponId] ?? "") })} className={line}>옵션 추가</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {contracts && (
        <section className="slw-card space-y-3 p-5">
          <h2 className="text-base font-extrabold text-slate-900">새 즉시할인 쿠폰</h2>
          {contracts.length === 0 ? <p className="text-sm text-slate-600">쿠폰 계약이 없습니다. WING 프로모션 메뉴에서 먼저 확인해 주세요.</p> : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className={label}>계약
                  <select value={form.contractId} onChange={(e) => pickContract(Number(e.target.value))} className={field}>
                    <option value={0}>선택</option>
                    {contracts.map((c) => <option key={c.contractId} value={c.contractId}>#{c.contractId} · {c.start.slice(0, 10)}~{c.end.slice(0, 10)}</option>)}
                  </select>
                </label>
                <label className={label}>쿠폰 이름(45자)<input maxLength={45} value={form.name} onChange={(e) => setF({ name: e.target.value })} className={field} /></label>
                <label className={label}>할인 방식
                  <select value={form.type} onChange={(e) => setF({ type: e.target.value })} className={field}>{COUPON_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
                </label>
                <label className={label}>할인값<input inputMode="numeric" value={form.discount} onChange={(e) => setF({ discount: e.target.value })} className={field} /></label>
                <label className={label}>최대 할인금액(원)<input inputMode="numeric" value={form.maxDiscountPrice} onChange={(e) => setF({ maxDiscountPrice: e.target.value })} className={field} /></label>
                <span />
                <label className={label}>시작일(내일부터)<input type="date" value={form.startDate} onChange={(e) => setF({ startDate: e.target.value })} className={field} /></label>
                <label className={label}>종료일<input type="date" value={form.endDate} onChange={(e) => setF({ endDate: e.target.value })} className={field} /></label>
              </div>
              {budget && <p className="text-[12px] text-slate-700">{budget}</p>}
              <p className="text-[12px] text-amber-800">⚠ 할인액은 판매자 부담으로 정산에서 빠질 수 있습니다. 쿠폰에 넣은 옵션은 뺄 수 없으며, 바꾸려면 쿠폰을 파기해야 합니다.</p>
              {problem ? <p className="text-[12px] text-slate-500">{problem}</p> : <button type="button" disabled={pending} onClick={() => setAsk({ kind: "create" })} className={primary}>쿠폰 만들기 확인</button>}
            </>
          )}
        </section>
      )}

      {contracts && contracts.length > 0 && <DownloadCouponPanel contracts={contracts} />}

      {ask && (
        <div className="sticky bottom-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-900 shadow">
          <b>{ask.kind === "create" ? `「${form.name}」 쿠폰을 쿠팡에 만들까요?` : ask.kind === "expire" ? `「${ask.coupon.name}」 쿠폰을 파기할까요? 되돌릴 수 없습니다.` : `「${ask.coupon.name}」에 옵션 ${ask.ids.length}개를 추가할까요? 추가한 옵션은 뺄 수 없습니다.`}</b>
          <button type="button" disabled={pending} onClick={send} className="rounded border border-blue-600 bg-blue-700 px-3 py-1 font-bold text-white disabled:opacity-50">{pending ? "보내는 중…" : "네, 쿠팡에 적용"}</button>
          <button type="button" disabled={pending} onClick={() => setAsk(null)} className="rounded border border-slate-300 bg-white px-3 py-1 font-bold text-slate-700">취소</button>
        </div>
      )}
      {note && <p className="text-[13px] text-slate-800">{note}</p>}
      {requestId && (
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-700">
          <span>요청 번호 {requestId}</span>
          <button type="button" disabled={pending} onClick={checkRequest} className={line}>처리 결과 확인</button>
          {req && <span><b>{req.status === "DONE" ? "완료" : req.status === "FAIL" ? "실패" : req.status || "처리 중"}</b>{req.couponId ? ` · 쿠폰 #${req.couponId}` : ""} · 성공 {req.succeeded} · 실패 {req.failed}{req.failedItems ? ` · ${req.failedItems}` : ""}</span>}
        </div>
      )}
    </div>
  );
}
