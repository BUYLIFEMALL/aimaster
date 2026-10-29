"use client";

import { useEffect, useState, useTransition } from "react";
import { loadItemsAction, setSaleAction, updatePriceAction, updateQuantityAction, type ItemRow } from "@/lib/actions/items";
import { checkPrice, checkQuantity } from "@/lib/coupang/items";

const input = "w-24 rounded border border-slate-300 bg-white px-2 py-1 text-[13px] focus:border-rose-500 focus:outline-none";
const btn = "rounded border px-2 py-1 text-[11px] font-bold disabled:opacity-50";

/** 바꾸기 전에 한 번 더 묻는 상태(실제 판매 중인 상품이 바뀌므로) */
type Ask = { kind: "price" | "qty" | "sale"; vendorItemId: number; value: number; label: string };

export function ItemsPanel({ sellerProductId }: { sellerProductId: number }) {
  const [rows, setRows] = useState<ItemRow[] | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [ask, setAsk] = useState<Ask | null>(null);
  const [pending, start] = useTransition();

  const reload = () =>
    start(async () => {
      const r = await loadItemsAction(sellerProductId);
      if (!r.ok) return setError(r.error);
      setError("");
      setRows(r.items);
    });
  useEffect(reload, [sellerProductId]);

  const prepare = (kind: Ask["kind"], it: ItemRow) => {
    if (!it.vendorItemId || !it.inventory) return;
    setNote("");
    if (kind === "sale") {
      const on = !it.inventory.onSale;
      return setAsk({ kind, vendorItemId: it.vendorItemId, value: on ? 1 : 0, label: `「${it.itemName}」 ${on ? "판매를 재개" : "판매를 중지"}할까요?` });
    }
    const raw = Number(String(draft[`${kind}:${it.vendorItemId}`] ?? "").replace(/[,\s원개]/g, ""));
    const problem = kind === "price" ? checkPrice(it.inventory.salePrice, raw) : checkQuantity(it.inventory.stock, raw);
    if (problem) return setNote(`❌ ${problem}`);
    setAsk({ kind, vendorItemId: it.vendorItemId, value: raw, label: kind === "price" ? `「${it.itemName}」 판매가를 ${it.inventory.salePrice.toLocaleString()}원 → ${raw.toLocaleString()}원으로 바꿀까요?` : `「${it.itemName}」 재고를 ${it.inventory.stock}개 → ${raw}개로 바꿀까요?` });
  };

  const confirm = () =>
    ask &&
    start(async () => {
      const r = ask.kind === "price" ? await updatePriceAction(ask.vendorItemId, ask.value) : ask.kind === "qty" ? await updateQuantityAction(ask.vendorItemId, ask.value) : await setSaleAction(ask.vendorItemId, ask.value === 1);
      setAsk(null);
      setNote(r.ok ? `✅ ${r.message}` : `❌ ${r.error}`);
      const again = await loadItemsAction(sellerProductId);
      if (again.ok) setRows(again.items);
    });

  if (error) return <p className="rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-900">❌ {error}</p>;
  if (!rows) return <p className="text-[12px] text-slate-500">옵션을 읽는 중…</p>;

  return (
    <div className="space-y-2 rounded-lg bg-slate-50 p-3">
      <p className="text-[11px] text-amber-800">⚠ 여기서 바꾸면 쿠팡에서 실제로 판매 중인 상품이 바로 바뀝니다. 가격은 10원 단위, 한 번에 지금 가격의 50% 인하 ~ 100% 인상까지만 됩니다.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-[12px]">
          <thead className="text-slate-500">
            <tr><th className="py-1">옵션</th><th>판매가</th><th>재고</th><th>판매 상태</th></tr>
          </thead>
          <tbody>
            {rows.map((it, i) => (
              <tr key={it.vendorItemId ?? `n${i}`} className="border-t border-slate-200 align-top">
                <td className="py-1.5 pr-2 font-bold text-slate-800">{it.itemName || "(이름 없음)"}{it.vendorItemId ? <span className="block text-[10px] font-normal text-slate-400">옵션ID {it.vendorItemId}</span> : <span className="block text-[10px] font-normal text-amber-700">승인 전 — 바꿀 수 없음</span>}</td>
                {it.inventory && it.vendorItemId ? (
                  <>
                    <td className="py-1.5 pr-2">
                      <span className="block">{it.inventory.salePrice.toLocaleString()}원</span>
                      <input className={input} inputMode="numeric" placeholder="새 판매가" value={draft[`price:${it.vendorItemId}`] ?? ""} onChange={(e) => setDraft({ ...draft, [`price:${it.vendorItemId}`]: e.target.value })} />
                      <button type="button" disabled={pending} onClick={() => prepare("price", it)} className={`${btn} ml-1 border-rose-300 bg-white text-rose-800`}>바꾸기</button>
                    </td>
                    <td className="py-1.5 pr-2">
                      <span className="block">{it.inventory.stock}개</span>
                      <input className={input} inputMode="numeric" placeholder="새 재고" value={draft[`qty:${it.vendorItemId}`] ?? ""} onChange={(e) => setDraft({ ...draft, [`qty:${it.vendorItemId}`]: e.target.value })} />
                      <button type="button" disabled={pending} onClick={() => prepare("qty", it)} className={`${btn} ml-1 border-rose-300 bg-white text-rose-800`}>바꾸기</button>
                    </td>
                    <td className="py-1.5">
                      <span className={`block font-bold ${it.inventory.onSale ? "text-teal-700" : "text-slate-500"}`}>{it.inventory.onSale ? "판매 중" : "판매 중지"}</span>
                      <button type="button" disabled={pending} onClick={() => prepare("sale", it)} className={`${btn} border-slate-300 bg-white text-slate-700`}>{it.inventory.onSale ? "판매 중지" : "판매 재개"}</button>
                    </td>
                  </>
                ) : (
                  <td colSpan={3} className="py-1.5 text-slate-500">{it.vendorItemId ? "현재값을 읽지 못했습니다(옵션이 많으면 앞 30개만 읽습니다)." : `판매가 ${it.salePrice.toLocaleString()}원`}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {ask && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
          <span className="font-bold">{ask.label}</span>
          <button type="button" disabled={pending} onClick={confirm} className={`${btn} border-rose-600 bg-rose-700 text-white`}>{pending ? "바꾸는 중…" : "네, 쿠팡에 적용"}</button>
          <button type="button" disabled={pending} onClick={() => setAsk(null)} className={`${btn} border-slate-300 bg-white text-slate-700`}>취소</button>
        </div>
      )}
      {note && <p className="text-[12px] text-slate-800">{note}</p>}
    </div>
  );
}
