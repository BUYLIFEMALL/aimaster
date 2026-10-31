"use client";

import { useEffect, useState, useTransition } from "react";
import { loadProductEditAction, saveDeliveryAction, saveProductFieldsAction } from "@/lib/actions/productEdit";
import { checkDelivery, checkProductFields, cleanTags, DELIVERY_TYPES, NEEDS_REAPPROVAL, NOT_EDITABLE, NOT_PARTIAL, type EditView } from "@/lib/coupang/productEdit";

const field = "mt-1 block w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-[13px] font-normal focus:border-blue-500 focus:outline-none";
const label = "text-[11px] font-bold text-slate-700";
const ok = "rounded border border-blue-600 bg-blue-700 px-3 py-1 text-[12px] font-bold text-white disabled:opacity-50";
const no = "rounded border border-slate-300 bg-white px-3 py-1 text-[12px] font-bold text-slate-700 disabled:opacity-50";

/** 상품명·브랜드·검색어(재승인 필요)와 배송·반품(승인 불필요). 이미지·옵션 구성은 WING에서 고친다 */
export function ProductEditPanel({ sellerProductId }: { sellerProductId: number }) {
  const [view, setView] = useState<EditView | null>(null);
  const [tags, setTags] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [ask, setAsk] = useState<"fields" | "delivery" | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    start(async () => {
      const r = await loadProductEditAction(sellerProductId);
      if (!r.ok) return setError(r.error);
      setView(r.view);
      setTags(r.view.tags.join(", "));
    });
  }, [sellerProductId]);

  if (error) return <p className="rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-900">❌ {error}</p>;
  if (!view) return <p className="text-[12px] text-slate-500">상품을 읽는 중…</p>;

  const set = (patch: Partial<EditView>) => { setAsk(null); setNote(""); setView({ ...view, ...patch }); };
  const money = (v: string) => Number(v.replace(/[,\s원]/g, "")) || 0;
  const fields = { name: view.name, displayName: view.displayName, brand: view.brand, tags: cleanTags(tags) };
  const reapproval = NEEDS_REAPPROVAL.includes(view.statusName);
  const canEdit = !NOT_EDITABLE.includes(view.statusName);
  const canPartial = !NOT_PARTIAL.includes(view.statusName);
  const fieldProblem = checkProductFields(fields);
  const deliveryProblem = checkDelivery(view);

  const send = () =>
    start(async () => {
      const r = ask === "fields" ? await saveProductFieldsAction(sellerProductId, fields) : await saveDeliveryAction(sellerProductId, view);
      setNote(r.ok ? `✅ ${r.message}` : `❌ ${r.error}`);
      setAsk(null);
    });

  return (
    <div className="space-y-3 rounded-lg bg-slate-50 p-3 text-[12px]">
      <p className="text-slate-600">지금 상태: <b>{view.statusName || "알 수 없음"}</b> · 이미지와 옵션 구성은 WING에서 고쳐 주세요.</p>

      <fieldset disabled={!canEdit} className="space-y-2">
        <legend className="font-extrabold text-slate-900">상품 정보 {reapproval && <span className="font-bold text-amber-800">(승인된 상품은 재승인 뒤 반영)</span>}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className={label}>등록상품명<input className={field} maxLength={100} value={view.name} onChange={(e) => set({ name: e.target.value })} /></label>
          <label className={label}>노출상품명<input className={field} maxLength={100} value={view.displayName} onChange={(e) => set({ displayName: e.target.value })} /></label>
          <label className={label}>브랜드<input className={field} value={view.brand} onChange={(e) => set({ brand: e.target.value })} /></label>
          <label className={label}>검색어(쉼표로, 20개까지)<input className={field} value={tags} onChange={(e) => { setTags(e.target.value); setAsk(null); }} /></label>
        </div>
        {fieldProblem ? <p className="text-rose-800">❌ {fieldProblem}</p> : <button type="button" disabled={pending} onClick={() => setAsk("fields")} className={no}>상품 정보 수정</button>}
      </fieldset>
      {!canEdit && <p className="text-amber-800">지금 상태에서는 상품 정보를 고칠 수 없습니다.</p>}

      <fieldset disabled={!canPartial} className="space-y-2 border-t border-slate-200 pt-2">
        <legend className="font-extrabold text-slate-900">배송·반품 <span className="font-bold text-teal-700">(승인 없이 바로 반영)</span></legend>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className={label}>배송비 방식
            <select className={field} value={view.deliveryChargeType} onChange={(e) => set({ deliveryChargeType: e.target.value })}>
              <option value="">선택</option>
              {DELIVERY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <label className={label}>기본 배송비<input className={field} inputMode="numeric" value={view.deliveryCharge} onChange={(e) => set({ deliveryCharge: money(e.target.value) })} /></label>
          <label className={label}>무료 조건 금액<input className={field} inputMode="numeric" value={view.freeShipOverAmount} onChange={(e) => set({ freeShipOverAmount: money(e.target.value) })} /></label>
          <label className={label}>초도 반품배송비<input className={field} inputMode="numeric" value={view.deliveryChargeOnReturn} onChange={(e) => set({ deliveryChargeOnReturn: money(e.target.value) })} /></label>
          <label className={label}>반품배송비<input className={field} inputMode="numeric" value={view.returnCharge} onChange={(e) => set({ returnCharge: money(e.target.value) })} /></label>
        </div>
        {deliveryProblem ? <p className="text-rose-800">❌ {deliveryProblem}</p> : <button type="button" disabled={pending} onClick={() => setAsk("delivery")} className={no}>배송·반품 수정</button>}
      </fieldset>
      {!canPartial && <p className="text-amber-800">승인된 상품에서만 배송·반품을 바로 고칠 수 있습니다.</p>}

      {ask && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">
          <b>{ask === "fields" ? (reapproval ? "쿠팡에 수정과 재승인 요청을 보낼까요? 승인될 때까지 이전 내용이 보일 수 있습니다." : "쿠팡에 수정을 보낼까요?") : "판매 중인 상품의 배송·반품 값을 바로 바꿀까요?"}</b>
          <button type="button" disabled={pending} onClick={send} className={ok}>{pending ? "보내는 중…" : "네, 쿠팡에 적용"}</button>
          <button type="button" disabled={pending} onClick={() => setAsk(null)} className={no}>취소</button>
        </div>
      )}
      {note && <p className="text-slate-800">{note}</p>}
    </div>
  );
}
