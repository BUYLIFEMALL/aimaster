"use client";

import { useActionState, useState } from "react";
import { noResetSubmit } from "@/lib/no-reset-submit";
import type { QuotableProduct } from "@/lib/store";
import { MAX_SEND_ITEMS } from "@/lib/quotes";

// 운영자 견적 보내기(D4) 작성 폼 — 품목 줄(상품·옵션·수량·견적가)은 hidden 「items」(JSON)로 서버 동작에 넘긴다.
// 오류는 화면에 돌려받아 보여 주므로 입력한 줄이 그대로 남는다
type Row = { product_id: string; variant_id: string; qty: string; price: string };
const empty = (): Row => ({ product_id: "", variant_id: "", qty: "1", price: "" });
const input = "w-full rounded border px-2 py-1.5 text-sm";

export default function SendQuoteForm({
  products,
  action,
  defaultValidUntil,
  minDate,
  maxDate,
}: {
  products: QuotableProduct[];
  action: (prev: { error: string }, form: FormData) => Promise<{ error: string }>;
  defaultValidUntil: string;
  minDate: string;
  maxDate: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: "" });
  const [rows, setRows] = useState<Row[]>([empty()]);
  const byId = new Map(products.map((p) => [p.id, p]));
  const set = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const refPrice = (r: Row) => {
    const p = byId.get(r.product_id);
    if (!p) return null;
    return p.base_price + (p.variants.find((v) => v.id === r.variant_id)?.extra_price ?? 0);
  };
  const total = rows.reduce((s, r) => s + (Number(r.qty) || 0) * (Number(r.price.replace(/[,\s원]/g, "")) || 0), 0);

  return (
    <form onSubmit={noResetSubmit(formAction)} className="mt-6 space-y-4">
      {state.error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700" data-send-error>{state.error}</p>}
      <div className="space-y-2" data-send-items>
        <input type="hidden" name="items" value={JSON.stringify(rows)} />
        {rows.map((r, i) => {
          const p = byId.get(r.product_id);
          const ref = refPrice(r);
          return (
            <div key={i} className="grid gap-2 rounded border p-2 sm:grid-cols-[1fr_1fr_5rem_8rem_auto]">
              <select value={r.product_id} onChange={(e) => set(i, { product_id: e.target.value, variant_id: "" })} className={input} aria-label={`${i + 1}번째 상품`}>
                <option value="">— 상품 —</option>
                {products.map((x) => <option key={x.id} value={x.id}>{x.name}{x.status === "sold_out" ? " (품절)" : ""}</option>)}
              </select>
              {p && p.variants.length > 0 ? (
                <select value={r.variant_id} onChange={(e) => set(i, { variant_id: e.target.value })} className={input} aria-label={`${i + 1}번째 옵션`}>
                  <option value="">— 옵션 —</option>
                  {p.variants.map((v) => <option key={v.id} value={v.id}>{v.key}{v.extra_price ? ` (+${v.extra_price.toLocaleString("ko-KR")}원)` : ""}</option>)}
                </select>
              ) : (
                <span className="self-center text-xs text-gray-400">{p ? "옵션 없음" : ""}</span>
              )}
              <input value={r.qty} onChange={(e) => set(i, { qty: e.target.value })} inputMode="numeric" className={input} aria-label={`${i + 1}번째 수량`} placeholder="수량" />
              <input value={r.price} onChange={(e) => set(i, { price: e.target.value })} inputMode="numeric" className={input} aria-label={`${i + 1}번째 견적가`}
                placeholder={ref != null ? `판매가 ${ref.toLocaleString("ko-KR")}` : "견적가(원)"} />
              <button type="button" onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : [empty()]))} className="text-xs text-red-700">빼기</button>
            </div>
          );
        })}
        <div className="flex items-center justify-between">
          {rows.length < MAX_SEND_ITEMS ? <button type="button" onClick={() => setRows((rs) => [...rs, empty()])} className="rounded border px-2 py-1 text-xs">+ 품목 추가</button> : <span />}
          <span className="text-sm">견적 합계(배송비 별도) <b data-send-total>{total.toLocaleString("ko-KR")}원</b></span>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-xs text-gray-500">유효기한(그날까지, 90일 이내)</span>
          <input type="date" name="valid_until" defaultValue={defaultValidUntil} min={minDate} max={maxDate} required className="mt-0.5 w-full rounded border px-2 py-1.5" />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="text-xs text-gray-500">손님에게 보일 메모(선택, 500자)</span>
          <textarea name="note" maxLength={500} rows={2} className="mt-0.5 w-full rounded border px-2 py-1.5" placeholder="예: 대량 구매 특가입니다. 다음 주 금요일까지 유효합니다." />
        </label>
      </div>
      <button disabled={pending} className="rounded bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50">{pending ? "보내는 중…" : "견적 보내기"}</button>
    </form>
  );
}
