"use client";

import { useState, useTransition } from "react";
import { updatePriceAction, updateQuantityAction } from "@/lib/actions/items";
import { setAutoOptionAction } from "@/lib/actions/productEdit";
import { scanStockAction, type StockRow } from "@/lib/actions/stock";
import { BULK_MAX, previewPrice, previewQty, type PriceMode, type QtyMode } from "@/lib/coupang/bulk";

const field = "rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none";
const primary = "rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50";
const line = "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50";
const toNum = (raw: string) => (raw.trim() === "" ? NaN : Number(raw.replace(/[,\s원개%]/g, "")));

type Kind = "price" | "qty";

/** 옵션을 고르고 계산 방식을 정한 뒤, 미리 보고 2단 확인 후 1건씩 보낸다(재시도 없음) */
export function BulkEditor({ keysSaved }: { keysSaved: boolean }) {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [next, setNext] = useState("");
  const [scanned, setScanned] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);
  const [kind, setKind] = useState<Kind>("price");
  const [priceMode, setPriceMode] = useState<PriceMode>("percent");
  const [qtyMode, setQtyMode] = useState<QtyMode>("fixed");
  const [value, setValue] = useState("");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<Record<number, { ok: boolean; message: string }>>({});
  const [autoAsk, setAutoAsk] = useState<boolean | null>(null);
  const [autoNote, setAutoNote] = useState("");
  const [pending, start] = useTransition();

  const scan = (more: boolean) =>
    start(async () => {
      setError("");
      const r = await scanStockAction(more ? next : undefined);
      if (!r.ok) return setError(r.error);
      setScanned(true);
      setNext(r.nextToken);
      setRows(more ? (old) => [...old, ...r.rows.filter((n) => !old.some((o) => o.vendorItemId === n.vendorItemId))] : r.rows);
      if (!more) { setPicked([]); setResults({}); }
      setAsking(false);
    });

  const toggle = (id: number) => { setAsking(false); setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id])); };
  const previewOf = (r: StockRow) => (kind === "price" ? previewPrice(r.salePrice, priceMode, toNum(value)) : previewQty(r.stock, qtyMode, toNum(value)));
  const targets = rows.filter((r) => picked.includes(r.vendorItemId));
  const over = targets.length > BULK_MAX;
  const blocked = targets.some((r) => previewOf(r).problem);

  const apply = () =>
    start(async () => {
      for (const r of targets) {
        const { next: v } = previewOf(r);
        const res = kind === "price" ? await updatePriceAction(r.vendorItemId, v) : await updateQuantityAction(r.vendorItemId, v);
        setResults((old) => ({ ...old, [r.vendorItemId]: res.ok ? { ok: true, message: res.message } : { ok: false, message: res.error } }));
        if (res.ok) setRows((old) => old.map((o) => (o.vendorItemId === r.vendorItemId ? (kind === "price" ? { ...o, salePrice: v } : { ...o, stock: v }) : o)));
      }
      setAsking(false);
      setPicked([]);
    });

  const applyAuto = () =>
    autoAsk !== null &&
    start(async () => {
      const r = await setAutoOptionAction(autoAsk);
      setAutoNote(r.ok ? `✅ ${r.message}` : `❌ ${r.error}`);
      setAutoAsk(null);
    });

  return (
    <div className="space-y-5">
      <section className="slw-card space-y-3 p-5">
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!keysSaved || pending} onClick={() => scan(false)} className={primary}>{pending && !asking ? "불러오는 중…" : scanned ? "처음부터 다시 불러오기" : "옵션 불러오기(상품 20개)"}</button>
          {next && <button type="button" disabled={pending} onClick={() => scan(true)} className={line}>다음 20개</button>}
        </div>
        {!keysSaved && <p className="text-xs text-amber-800">먼저 「API키등록·플랫폼연동」에서 키를 저장해 주세요.</p>}
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-900">❌ {error}</p>}

        {scanned && (
          <>
            <div className="flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-3">
              <label className="text-xs font-bold text-slate-700">바꿀 값
                <select value={kind} onChange={(e) => { setKind(e.target.value as Kind); setAsking(false); }} className={`mt-1 block ${field}`}><option value="price">판매가</option><option value="qty">재고</option></select>
              </label>
              <label className="text-xs font-bold text-slate-700">방식
                {kind === "price" ? (
                  <select value={priceMode} onChange={(e) => { setPriceMode(e.target.value as PriceMode); setAsking(false); }} className={`mt-1 block ${field}`}><option value="percent">% 올리기·내리기</option><option value="amount">금액 더하기·빼기</option><option value="fixed">같은 가격으로</option></select>
                ) : (
                  <select value={qtyMode} onChange={(e) => { setQtyMode(e.target.value as QtyMode); setAsking(false); }} className={`mt-1 block ${field}`}><option value="fixed">같은 수량으로</option><option value="add">수량 더하기·빼기</option></select>
                )}
              </label>
              <label className="text-xs font-bold text-slate-700">값(내릴 때는 -10처럼)
                <input value={value} onChange={(e) => { setValue(e.target.value); setAsking(false); }} inputMode="numeric" className={`mt-1 block w-32 ${field}`} />
              </label>
              <button type="button" onClick={() => { setAsking(false); setPicked(rows.slice(0, BULK_MAX).map((r) => r.vendorItemId)); }} className={line}>앞 {BULK_MAX}개 고르기</button>
              <button type="button" onClick={() => { setAsking(false); setPicked([]); }} className={line}>선택 해제</button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-[12px]">
                <thead className="text-slate-500"><tr><th className="py-1"></th><th>상품·옵션</th><th>판매가</th><th>재고</th><th>바뀔 값</th></tr></thead>
                <tbody>
                  {rows.map((r) => {
                    const on = picked.includes(r.vendorItemId);
                    const p = on && value.trim() ? previewOf(r) : null;
                    const res = results[r.vendorItemId];
                    return (
                      <tr key={r.vendorItemId} className="border-t border-slate-200 align-top">
                        <td className="py-1.5 pr-2"><input type="checkbox" aria-label={`${r.itemName} 고르기`} checked={on} onChange={() => toggle(r.vendorItemId)} /></td>
                        <td className="py-1.5 pr-2 text-slate-800"><b>{r.productName}</b><span className="block text-slate-600">{r.itemName || "(이름 없음)"}</span>{res && <span className={`block ${res.ok ? "text-teal-700" : "text-rose-700"}`}>{res.ok ? "✅" : "❌"} {res.message}</span>}</td>
                        <td className="py-1.5 pr-2">{r.salePrice.toLocaleString()}원</td>
                        <td className="py-1.5 pr-2">{r.stock}개</td>
                        <td className="py-1.5">{p && (p.problem ? <span className="text-rose-700">❌ {p.problem}</span> : <b className="text-blue-700">{p.next.toLocaleString()}{kind === "price" ? "원" : "개"}</b>)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {rows.length === 0 && <p className="text-sm text-slate-600">승인된 상품의 옵션이 없습니다.</p>}

            {targets.length > 0 && value.trim() !== "" && (over ? (
              <p className="text-[12px] text-rose-800">❌ 한 번에 {BULK_MAX}개까지 바꿀 수 있습니다. 지금 {targets.length}개를 골랐습니다.</p>
            ) : blocked ? (
              <p className="text-[12px] text-rose-800">❌ 표의 빨간 줄을 고치거나 선택에서 빼 주세요.</p>
            ) : !asking ? (
              <button type="button" disabled={pending} onClick={() => setAsking(true)} className={primary}>고른 {targets.length}건 변경 확인</button>
            ) : (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
                <b>{targets.length}건의 {kind === "price" ? "판매가" : "재고"}를 쿠팡에 바로 적용할까요? 판매 중인 상품이 실제로 바뀝니다.</b>
                <button type="button" disabled={pending} onClick={apply} className="rounded border border-blue-600 bg-blue-700 px-3 py-1 font-bold text-white disabled:opacity-50">{pending ? "적용 중…" : "네, 쿠팡에 적용"}</button>
                <button type="button" disabled={pending} onClick={() => setAsking(false)} className="rounded border border-slate-300 bg-white px-3 py-1 font-bold text-slate-700">취소</button>
              </div>
            ))}
          </>
        )}
      </section>

      <section className="slw-card space-y-2 p-5">
        <h2 className="text-base font-extrabold text-slate-900">자동생성옵션 전체 설정</h2>
        <p className="text-[13px] text-slate-600">쿠팡이 묶음 옵션을 자동으로 만드는 기능을 판매자 전체에 켜거나 끕니다. 꺼도 이미 만들어진 자동 옵션은 WING에서 따로 판매 중지해야 합니다.</p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={!keysSaved || pending} onClick={() => setAutoAsk(true)} className={line}>전체 켜기</button>
          <button type="button" disabled={!keysSaved || pending} onClick={() => setAutoAsk(false)} className={line}>전체 끄기</button>
        </div>
        {autoAsk !== null && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
            <b>내 쿠팡 판매자 전체의 자동생성옵션을 {autoAsk ? "켤" : "끌"}까요?</b>
            <button type="button" disabled={pending} onClick={applyAuto} className="rounded border border-blue-600 bg-blue-700 px-3 py-1 font-bold text-white disabled:opacity-50">네, 쿠팡에 적용</button>
            <button type="button" disabled={pending} onClick={() => setAutoAsk(null)} className="rounded border border-slate-300 bg-white px-3 py-1 font-bold text-slate-700">취소</button>
          </div>
        )}
        {autoNote && <p className="text-[12px] text-slate-800">{autoNote}</p>}
      </section>
    </div>
  );
}
