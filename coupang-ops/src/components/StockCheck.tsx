"use client";

import { useEffect, useState, useTransition } from "react";
import { updateQuantityAction } from "@/lib/actions/items";
import { scanStockAction, type StockRow } from "@/lib/actions/stock";
import { checkQuantity } from "@/lib/coupang/items";
import { cleanStockLimit, DEFAULT_STOCK_LIMIT, STOCK_PAGE_SIZE, stockLevel, type StockLevel } from "@/lib/coupang/stock";

const LIMIT_KEY = "coupang-ops:stock-limit";
const LEVEL: Record<Exclude<StockLevel, "ok">, { label: string; cls: string }> = {
  out: { label: "🔴 품절", cls: "text-rose-700" },
  low: { label: "🟠 부족", cls: "text-amber-700" },
  stopped: { label: "⏸ 판매 중지", cls: "text-slate-500" },
};
const ORDER: Record<StockLevel, number> = { out: 0, low: 1, stopped: 2, ok: 3 };
const parseQty = (raw: string) => Number(raw.replace(/[,\s개]/g, ""));

type Totals = { products: number; calls: number; failed: number; skipped: number };
type Result = { ok: boolean; message: string };

/** 플랜 B1 품절 예방 — 버튼을 눌렀을 때만 20개씩 읽고, 재고 변경은 2단 확인 뒤 1건씩 보낸다 */
export function StockCheck({ keysSaved }: { keysSaved: boolean }) {
  const [limitText, setLimitText] = useState(String(DEFAULT_STOCK_LIMIT));
  const [rows, setRows] = useState<StockRow[]>([]);
  const [next, setNext] = useState("");
  const [scanned, setScanned] = useState(false);
  const [totals, setTotals] = useState<Totals>({ products: 0, calls: 0, failed: 0, skipped: 0 });
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [results, setResults] = useState<Record<number, Result>>({});
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LIMIT_KEY);
      if (saved !== null) setLimitText(String(cleanStockLimit(saved)));
    } catch {}
  }, []);

  const limit = cleanStockLimit(limitText);
  const changeLimit = (v: string) => {
    setLimitText(v);
    try {
      localStorage.setItem(LIMIT_KEY, String(cleanStockLimit(v)));
    } catch {}
  };

  const scan = (more: boolean) =>
    start(async () => {
      setError("");
      const r = await scanStockAction(more ? next : undefined);
      if (!r.ok) return setError(r.error);
      setScanned(true);
      setNext(r.nextToken);
      const add = (t: Totals): Totals => ({ products: t.products + r.products, calls: t.calls + r.calls, failed: t.failed + r.failed, skipped: t.skipped + r.skipped });
      if (more) {
        setRows((old) => [...old, ...r.rows.filter((n) => !old.some((o) => o.vendorItemId === n.vendorItemId))]);
        setTotals(add);
      } else {
        setRows(r.rows);
        setDraft({});
        setResults({});
        setAsking(false);
        setTotals(add({ products: 0, calls: 0, failed: 0, skipped: 0 }));
      }
    });

  const flagged = rows.filter((r) => stockLevel(r, limit) !== "ok").sort((a, b) => ORDER[stockLevel(a, limit)] - ORDER[stockLevel(b, limit)]);
  const count = (level: StockLevel) => rows.filter((r) => stockLevel(r, limit) === level).length;
  const filled = flagged.filter((r) => (draft[r.vendorItemId] ?? "").trim() !== "");
  const problems = filled.map((r) => checkQuantity(r.stock, parseQty(draft[r.vendorItemId]))).filter(Boolean);

  const apply = () =>
    start(async () => {
      for (const r of filled) {
        const qty = parseQty(draft[r.vendorItemId]);
        const res = await updateQuantityAction(r.vendorItemId, qty);
        setResults((old) => ({ ...old, [r.vendorItemId]: res.ok ? { ok: true, message: res.message } : { ok: false, message: res.error } }));
        if (res.ok) {
          setRows((old) => old.map((o) => (o.vendorItemId === r.vendorItemId ? { ...o, stock: qty } : o)));
          setDraft((old) => ({ ...old, [r.vendorItemId]: "" }));
        }
      }
      setAsking(false);
    });

  return (
    <section className="slw-card space-y-3 p-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-bold text-slate-700">
          부족 기준(개 이하)
          <input className="mt-1 block w-24 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal focus:border-rose-500 focus:outline-none" inputMode="numeric" value={limitText} onChange={(e) => changeLimit(e.target.value)} />
        </label>
        <button type="button" disabled={!keysSaved || pending} onClick={() => scan(false)} className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-bold text-white hover:bg-rose-800 disabled:opacity-50">
          {pending && !asking ? "점검 중…" : scanned ? "처음부터 다시 점검" : `재고 점검 시작(상품 ${STOCK_PAGE_SIZE}개)`}
        </button>
        {next && <button type="button" disabled={pending} onClick={() => scan(true)} className="rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-800 disabled:opacity-50">다음 {STOCK_PAGE_SIZE}개 점검</button>}
      </div>
      {!keysSaved && <p className="text-xs text-amber-800">먼저 「🔑 쿠팡 연결」에서 키를 저장해 주세요.</p>}
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-900">❌ {error}</p>}

      {scanned && (
        <>
          <p className="text-[13px] font-bold text-slate-800">승인된 상품 {totals.products}개 · 옵션 {rows.length}개 점검: 품절 {count("out")} · 부족 {count("low")} · 판매 중지 {count("stopped")} · 충분 {count("ok")}</p>
          <p className="text-[11px] text-slate-500">
            쿠팡 호출 약 {totals.calls}회{next ? " · 아직 점검하지 않은 상품이 더 있습니다" : " · 마지막 상품까지 점검했습니다"}
            {totals.failed > 0 && <span className="font-bold text-amber-800"> · 읽지 못한 항목 {totals.failed}개(이 목록에 없을 수 있음)</span>}
            {totals.skipped > 0 && <span className="font-bold text-amber-800"> · 한도로 건너뛴 옵션 {totals.skipped}개(「내 쿠팡 상품」에서 확인)</span>}
          </p>
          {flagged.length === 0 ? (
            <p className="rounded-lg bg-teal-50 px-3 py-2 text-[13px] text-teal-900">✅ 기준 이하인 옵션이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-[12px]">
                <thead className="text-slate-500">
                  <tr><th className="py-1">상태</th><th>상품·옵션</th><th>지금 재고</th><th>새 재고</th></tr>
                </thead>
                <tbody>
                  {flagged.map((r) => {
                    const level = LEVEL[stockLevel(r, limit) as Exclude<StockLevel, "ok">];
                    const res = results[r.vendorItemId];
                    return (
                      <tr key={r.vendorItemId} className="border-t border-slate-200 align-top">
                        <td className={`py-1.5 pr-2 font-bold ${level.cls}`}>{level.label}</td>
                        <td className="py-1.5 pr-2 text-slate-800">
                          <span className="font-bold">{r.productName}</span>
                          <span className="block text-slate-600">{r.itemName || "(이름 없음)"}</span>
                          {res && <span className={`block ${res.ok ? "text-teal-700" : "text-rose-700"}`}>{res.ok ? "✅" : "❌"} {res.message}</span>}
                        </td>
                        <td className="py-1.5 pr-2">{r.stock}개</td>
                        <td className="py-1.5">
                          <input aria-label={`${r.itemName} 새 재고`} className="w-24 rounded border border-slate-300 bg-white px-2 py-1 text-[13px] focus:border-rose-500 focus:outline-none" inputMode="numeric" placeholder="새 재고" value={draft[r.vendorItemId] ?? ""} onChange={(e) => { setAsking(false); setDraft({ ...draft, [r.vendorItemId]: e.target.value }); }} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {filled.length > 0 && (problems.length > 0 ? (
            <p className="text-[12px] text-rose-800">❌ {problems[0]}</p>
          ) : !asking ? (
            <button type="button" disabled={pending} onClick={() => setAsking(true)} className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-bold text-white hover:bg-rose-800 disabled:opacity-50">입력한 {filled.length}건 재고 변경 확인</button>
          ) : (
            <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
              <p className="font-bold">아래 {filled.length}건을 쿠팡에 바로 적용할까요? 판매 중인 재고가 실제로 바뀝니다.</p>
              <ul className="list-disc pl-4">
                {filled.map((r) => <li key={r.vendorItemId}>{r.productName} · {r.itemName}: {r.stock}개 → {parseQty(draft[r.vendorItemId])}개</li>)}
              </ul>
              <div className="flex gap-2">
                <button type="button" disabled={pending} onClick={apply} className="rounded border border-rose-600 bg-rose-700 px-3 py-1 font-bold text-white disabled:opacity-50">{pending ? "적용 중…" : "네, 쿠팡에 적용"}</button>
                <button type="button" disabled={pending} onClick={() => setAsking(false)} className="rounded border border-slate-300 bg-white px-3 py-1 font-bold text-slate-700 disabled:opacity-50">취소</button>
              </div>
            </div>
          ))}
        </>
      )}
    </section>
  );
}
