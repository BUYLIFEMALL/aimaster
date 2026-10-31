"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { loadRevenueAction, loadSettlementsAction, loadStocksAction } from "@/lib/actions/revenue";
import { cleanTargetMargin, daysBetween, defaultRevenueRange, revenueToTsv, revenueWarnings, RUNOUT_MAX_OPTIONS, runoutDays, summarizeOptions, type RevenueLine, type RevenueOrderShipping, type SettlementRow } from "@/lib/coupang/revenue";

const COST_KEY = "coupang-ops:unit-costs";
const TARGET_KEY = "coupang-ops:target-margin";
const REPORT_URL = "https://shop-order-report.buylife.xyz/upload";
const input = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-rose-500 focus:outline-none";
const won = (v: number) => `${Math.round(v).toLocaleString("ko-KR")}원`;

const readLocal = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const writeLocal = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {}
};

/** 플랜 묶음 4 매출·정산 — 버튼을 눌렀을 때만 읽고 서버에 저장하지 않는다. 원가·광고비는 이 브라우저에만 둔다 */
export function RevenueReport({ keysSaved }: { keysSaved: boolean }) {
  const [range, setRange] = useState({ from: "", to: "" });
  const [lines, setLines] = useState<RevenueLine[] | null>(null);
  const [shipping, setShipping] = useState<RevenueOrderShipping[]>([]);
  const [next, setNext] = useState("");
  const [loadedRange, setLoadedRange] = useState({ from: "", to: "" });
  const [costs, setCosts] = useState<Record<string, string>>({});
  const [target, setTarget] = useState("15");
  const [ad, setAd] = useState("");
  const [stocks, setStocks] = useState<Record<string, number>>({});
  const [month, setMonth] = useState("");
  const [settlements, setSettlements] = useState<SettlementRow[] | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    const now = Date.now();
    setRange(defaultRevenueRange(now));
    setMonth(new Date(now + 9 * 3_600_000).toISOString().slice(0, 7));
    try {
      const saved = readLocal(COST_KEY);
      if (saved) setCosts(JSON.parse(saved) as Record<string, string>);
    } catch {}
    const savedTarget = readLocal(TARGET_KEY);
    if (savedTarget !== null) setTarget(savedTarget);
  }, []);

  const costNumbers = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(costs)) {
      const num = Number(v.replace(/[,\s원]/g, ""));
      if (v.trim() && Number.isFinite(num) && num >= 0) out[k] = num;
    }
    return out;
  }, [costs]);
  const rows = useMemo(() => summarizeOptions(lines ?? [], costNumbers), [lines, costNumbers]);
  const targetMargin = cleanTargetMargin(target);
  const warnings = useMemo(() => revenueWarnings(rows, targetMargin), [rows, targetMargin]);
  const totals = useMemo(() => {
    const sum = (f: (o: (typeof rows)[number]) => number) => rows.reduce((acc, o) => acc + f(o), 0);
    const adSpend = Number(ad.replace(/[,\s원]/g, "")) || 0;
    const shipSettle = shipping.reduce((acc, x) => acc + x.settlement, 0);
    const missing = rows.filter((o) => o.profit === null).length;
    const sales = sum((o) => o.sales);
    return {
      sales,
      fee: sum((o) => o.fee),
      settlement: sum((o) => o.settlement) + shipSettle,
      shipSettle,
      adSpend,
      roas: adSpend > 0 ? Math.round((sales / adSpend) * 100) : null,
      missing,
      profit: missing ? null : sum((o) => o.profit ?? 0) + shipSettle - adSpend,
    };
  }, [rows, shipping, ad]);
  const periodDays = loadedRange.from ? daysBetween(loadedRange.from, loadedRange.to) + 1 : 0;

  const load = (more: boolean) =>
    start(async () => {
      setError("");
      setNote("");
      const opt = more ? { ...loadedRange, token: next } : range;
      const r = await loadRevenueAction(opt);
      if (!r.ok) return setError(r.error);
      setLines(more ? [...(lines ?? []), ...r.lines] : r.lines);
      setShipping(more ? [...shipping, ...r.shipping] : r.shipping);
      setNext(r.nextToken);
      if (!more) {
        setLoadedRange({ from: range.from, to: range.to });
        setStocks({});
      }
    });
  const loadStocks = () =>
    start(async () => {
      setError("");
      const ids = [...rows].filter((o) => o.netQty > 0).sort((a, b) => b.netQty - a.netQty).map((o) => o.vendorItemId);
      const r = await loadStocksAction(ids);
      if (!r.ok) return setError(r.error);
      setStocks(r.stocks);
      setNote(r.failed ? `재고를 읽지 못한 옵션이 ${r.failed}개 있습니다.` : "");
    });
  const loadMonth = () =>
    start(async () => {
      setError("");
      const r = await loadSettlementsAction(month);
      if (!r.ok) return setError(r.error);
      setSettlements(r.rows);
    });
  const saveFile = () => {
    const blob = new Blob([`﻿${revenueToTsv(lines ?? [])}`], { type: "text/tab-separated-values;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `쿠팡_매출_${loadedRange.from}_${loadedRange.to}.tsv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };
  const setCost = (id: number, value: string) => {
    const nextCosts = { ...costs, [String(id)]: value };
    setCosts(nextCosts);
    writeLocal(COST_KEY, JSON.stringify(nextCosts));
  };

  return (
    <div className="space-y-5">
      <section className="slw-card space-y-3 p-5">
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-bold text-slate-700">시작일<input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} className={`mt-1 block ${input}`} /></label>
          <label className="text-xs font-bold text-slate-700">종료일<input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} className={`mt-1 block ${input}`} /></label>
          <button type="button" disabled={!keysSaved || pending} onClick={() => load(false)} className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-bold text-white hover:bg-rose-800 disabled:opacity-50">{pending ? "불러오는 중…" : "매출 불러오기"}</button>
          {next && <button type="button" disabled={pending} onClick={() => load(true)} className="rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-800 disabled:opacity-50">다음 50건</button>}
        </div>
        <p className="text-[11px] text-slate-500">기준일은 매출인식일(구매확정 또는 배송완료 + 7일)이라 최근 주문은 아직 없을 수 있습니다. 어제까지, 한 번에 30일까지 조회됩니다.</p>
        {!keysSaved && <p className="text-xs text-amber-800">먼저 「🔑 쿠팡 연결」에서 키를 저장해 주세요.</p>}
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-900">❌ {error}</p>}
        {note && <p className="text-[12px] text-amber-800">⚠ {note}</p>}
        {lines?.length === 0 && <p className="rounded-lg bg-slate-50 px-3 py-2 text-[13px] text-slate-700">이 기간에 인식된 매출이 없습니다.</p>}
        {next && <p className="text-[12px] font-bold text-amber-800">⚠ 아직 불러오지 않은 매출이 있어 아래 합계는 일부입니다.</p>}
      </section>

      {rows.length > 0 && (
        <>
          <section className="slw-card space-y-3 p-5">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 p-3"><p className="text-xs font-bold text-slate-600">매출(반품 차감)</p><p className="mt-1 text-xl font-black text-slate-900">{won(totals.sales)}</p></div>
              <div className="rounded-xl border border-slate-200 p-3"><p className="text-xs font-bold text-slate-600">수수료(부가세 포함)</p><p className="mt-1 text-xl font-black text-slate-900">{won(totals.fee)}</p></div>
              <div className="rounded-xl border border-slate-200 p-3"><p className="text-xs font-bold text-slate-600">정산액(배송비 포함)</p><p className="mt-1 text-xl font-black text-slate-900">{won(totals.settlement)}</p></div>
              <div className="rounded-xl border border-slate-200 p-3"><p className="text-xs font-bold text-slate-600">순이익</p><p className="mt-1 text-xl font-black text-slate-900">{totals.profit === null ? "원가 입력 필요" : won(totals.profit)}</p>{totals.missing > 0 && <p className="text-[11px] text-slate-500">원가 없는 옵션 {totals.missing}개</p>}</div>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-xs font-bold text-slate-700">기간 광고비(선택)<input inputMode="numeric" value={ad} onChange={(e) => setAd(e.target.value)} placeholder="WING 광고 보고서 값" className={`mt-1 block w-44 ${input}`} /></label>
              <label className="text-xs font-bold text-slate-700">목표 이익률(%)<input inputMode="numeric" value={target} onChange={(e) => { setTarget(e.target.value); writeLocal(TARGET_KEY, e.target.value); }} className={`mt-1 block w-24 ${input}`} /></label>
              {totals.roas !== null && <p className="pb-2 text-[13px] font-bold text-slate-800">광고 수익률(ROAS) {totals.roas.toLocaleString()}%</p>}
              <button type="button" onClick={saveFile} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] font-bold text-slate-800">📄 주문 리포트용 파일 받기</button>
              <a href={REPORT_URL} target="_blank" rel="noopener noreferrer" className="pb-2 text-[12px] font-bold text-rose-800 underline">주문 리포트에 올리기 ↗</a>
            </div>
            {warnings.length > 0 && (
              <ul className="space-y-1 rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
                {warnings.map((w, i) => <li key={`${w.vendorItemId}-${i}`}>⚠ {w.text}</li>)}
              </ul>
            )}
          </section>

          <section className="slw-card space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-extrabold text-slate-900">옵션별 손익</h2>
              <button type="button" disabled={pending} onClick={loadStocks} className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-[12px] font-bold text-rose-800 disabled:opacity-50">재고 소진일 계산(많이 팔린 {RUNOUT_MAX_OPTIONS}개까지)</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-[12px]">
                <thead className="text-slate-500"><tr><th className="py-1">옵션</th><th>판매/반품</th><th>매출</th><th>수수료율</th><th>정산액</th><th>개당 원가</th><th>순이익(률)</th><th>재고·소진</th></tr></thead>
                <tbody>
                  {rows.map((o) => {
                    const stock = stocks[String(o.vendorItemId)];
                    const left = stock === undefined ? null : runoutDays(stock, o.netQty, periodDays);
                    return (
                      <tr key={o.vendorItemId} className="border-t border-slate-200 align-top">
                        <td className="py-1.5 pr-2"><span className="font-bold text-slate-900">{o.optionName || o.productName}</span></td>
                        <td className="py-1.5 pr-2">{o.soldQty} / {o.refundQty}</td>
                        <td className="py-1.5 pr-2">{won(o.sales)}</td>
                        <td className="py-1.5 pr-2">{o.feeRate === null ? "-" : `${o.feeRate}%`}</td>
                        <td className="py-1.5 pr-2">{won(o.settlement)}</td>
                        <td className="py-1.5 pr-2"><input aria-label={`${o.optionName} 개당 원가`} inputMode="numeric" value={costs[String(o.vendorItemId)] ?? ""} onChange={(e) => setCost(o.vendorItemId, e.target.value)} placeholder="원" className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-[12px]" /></td>
                        <td className={`py-1.5 pr-2 font-bold ${o.margin !== null && o.margin < targetMargin ? "text-rose-700" : "text-slate-900"}`}>{o.profit === null ? "-" : `${won(o.profit)} (${o.margin ?? "-"}%)`}</td>
                        <td className="py-1.5">{stock === undefined ? "-" : `${stock}개${left === null ? "" : ` · 약 ${left}일`}`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-500">수수료율은 쿠팡이 실제로 뗀 값입니다. 순이익은 정산액 − 판매자 쿠폰 − 원가이며 택배비·포장비는 원가에 넣어 주세요. 원가는 이 브라우저에만 저장됩니다. 소진일은 기간 평균 판매량 기준의 추정입니다.</p>
          </section>
        </>
      )}

      <section className="slw-card space-y-3 p-5">
        <div className="flex flex-wrap items-end gap-2">
          <h2 className="w-full text-base font-extrabold text-slate-900">지급 내역</h2>
          <label className="text-xs font-bold text-slate-700">매출인식월<input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={`mt-1 block ${input}`} /></label>
          <button type="button" disabled={!keysSaved || pending} onClick={loadMonth} className="rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-800 disabled:opacity-50">지급 내역 불러오기</button>
        </div>
        {settlements?.length === 0 && <p className="rounded-lg bg-slate-50 px-3 py-2 text-[13px] text-slate-700">이 달의 지급 내역이 없습니다.</p>}
        {!!settlements?.length && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[12px]">
              <thead className="text-slate-500"><tr><th className="py-1">지급일</th><th>유형</th><th>매출 기간</th><th>총판매액</th><th>수수료</th><th>지급액</th><th>상태</th></tr></thead>
              <tbody>
                {settlements.map((x, i) => (
                  <tr key={`${x.date}-${i}`} className="border-t border-slate-200">
                    <td className="py-1.5 pr-2">{x.date}</td><td className="pr-2">{x.type}</td><td className="pr-2">{x.from} ~ {x.to}</td><td className="pr-2">{won(x.totalSale)}</td><td className="pr-2">{won(x.fee)}</td><td className="pr-2 font-bold">{won(x.finalAmount)}</td><td>{x.done ? "지급 완료" : "지급 예정"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
