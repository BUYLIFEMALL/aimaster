"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Printer } from "lucide-react";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { useData, won } from "@/components/DataProvider";
import { Bars, EmptyOrders, Stat, TrendChart } from "@/components/report/Widgets";
import { byMarket, byPeriod, byProduct, inRange, summarize, type GroupRow, type Period } from "@/lib/report/aggregate";
import { MARKETS, marketLabel, type MarketId } from "@/lib/orders/markets";
import { MARKET_FEES } from "@/lib/marketFees";
import { writeWorkbook } from "@/lib/exportSheet";
import { saveBlob } from "@/lib/download";

const PERIODS: { id: Period; label: string }[] = [
  { id: "day", label: "일별" },
  { id: "week", label: "주별" },
  { id: "month", label: "월별" },
];

function GroupTable({ title, rows, labelOf }: { title: string; rows: GroupRow[]; labelOf?: (k: string) => string }) {
  return (
    <section className="slw-card p-4">
      <h2 className="mb-2 text-sm font-extrabold text-slate-900">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-[13px]">
          <thead>
            <tr className="border-b border-slate-200 text-right text-[12px] text-slate-600">
              <th className="py-2 pr-2 text-left">구분</th><th className="pr-2">주문</th><th className="pr-2">수량</th><th className="pr-2">매출</th><th className="pr-2">정산(추정 포함)</th><th className="pr-2">원가</th><th className="pr-2">순이익(택배·광고 전)</th><th>반품·교환</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-slate-100 text-right font-mono">
                <td className="max-w-[260px] truncate py-1.5 pr-2 text-left font-sans" title={r.key}>{labelOf ? labelOf(r.key) : r.key}</td>
                <td className="pr-2">{r.orders}</td>
                <td className="pr-2">{r.qty}</td>
                <td className="pr-2">{won(r.sales)}</td>
                <td className="pr-2">{won(r.settlement)}</td>
                <td className="pr-2">{won(r.cost)}</td>
                <td className={`pr-2 ${r.profit < 0 ? "text-rose-700" : ""}`}>{won(r.profit)}</td>
                <td>{r.returns}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function ReportPage() {
  const { lines, settings, ready } = useData();
  const first = lines[0]?.orderedAt ?? "";
  const last = lines[lines.length - 1]?.orderedAt ?? "";
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [period, setPeriod] = useState<Period>("day");

  const scoped = useMemo(() => inRange(lines, from, to), [lines, from, to]);
  const sum = useMemo(() => summarize(scoped, settings), [scoped, settings]);
  const trend = useMemo(() => byPeriod(scoped, settings, period), [scoped, settings, period]);
  const markets = useMemo(() => byMarket(scoped, settings), [scoped, settings]);
  const products = useMemo(() => byProduct(scoped, settings), [scoped, settings]);

  if (!ready) return <p className="text-sm text-slate-600">불러오는 중…</p>;
  if (!lines.length) return <EmptyOrders />;

  function exportXlsx() {
    const head = ["구분", "주문", "수량", "매출", "정산(추정 포함)", "원가", "순이익(택배·광고 전)", "반품·교환"];
    const rows = (rs: GroupRow[], lab?: (k: string) => string) => [head, ...rs.map((r) => [lab ? lab(r.key) : r.key, r.orders, r.qty, r.sales, r.settlement, r.cost, r.profit, r.returns])];
    const summary: (string | number)[][] = [
      ["기간", `${from || first} ~ ${to || last}`],
      ["매출", sum.sales], ["정산(추정 포함)", sum.settlement], ["원가", sum.cost], ["택배비", sum.courier], ["광고비", sum.adCost], ["순이익", sum.profit], ["순이익률(%)", sum.marginPct],
      ["주문 수", sum.orders], ["객단가", sum.aov], ["취소", sum.cancel], ["반품", sum.returns], ["교환", sum.exchange],
      ["정산액을 수수료로 추정한 줄 비율(%)", sum.estimatedShare], ["원가 미입력 상품 수", sum.missingCost],
    ];
    saveBlob(`매출리포트_${from || first}_${to || last}.xlsx`, writeWorkbook([
      { name: "요약", rows: summary },
      { name: PERIODS.find((p) => p.id === period)?.label ?? "기간", rows: rows(trend) },
      { name: "마켓별", rows: rows(markets, (k) => marketLabel(k as MarketId)) },
      { name: "상품별", rows: rows(products) },
    ]));
  }

  return (
    <div>
      <PageHeader emoji="💰" title="매출·순이익 리포트" description="올린 주문 파일만으로 계산합니다. 취소·반품은 매출에서 뺍니다." />
      <section className="slw-card mb-4 flex flex-wrap items-end gap-3 p-4 print:hidden">
        <label className="block">
          <span className="slw-label">시작일</span>
          <input type="date" className="slw-field" value={from} min={first} max={last} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="block">
          <span className="slw-label">끝일</span>
          <input type="date" className="slw-field" value={to} min={first} max={last} onChange={(e) => setTo(e.target.value)} />
        </label>
        <div className="flex gap-1.5">
          {PERIODS.map((p) => (
            <button key={p.id} type="button" className={period === p.id ? "slw-primary" : "slw-btn"} onClick={() => setPeriod(p.id)}>{p.label}</button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button type="button" className="slw-btn" onClick={exportXlsx}><Download size={14} /> 엑셀로 받기</button>
          <button type="button" className="slw-btn" onClick={() => window.print()}><Printer size={14} /> 인쇄·PDF</button>
        </div>
        <p className="w-full text-[12px] text-slate-600">올린 기간: {first} ~ {last} · 비워 두면 전체 기간</p>
      </section>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="매출(취소·반품 제외)" value={won(sum.sales)} sub={`주문 ${sum.orders.toLocaleString()}건 · 객단가 ${won(sum.aov)}`} />
        <Stat label="정산액" value={won(sum.settlement)} sub={sum.estimatedShare ? `그중 ${sum.estimatedShare}%는 수수료로 추정` : "파일의 정산액 그대로"} />
        <Stat label="순이익" value={won(sum.profit)} sub={`순이익률 ${sum.marginPct}% · 원가 ${won(sum.cost)}`} tone={sum.profit < 0 ? "bad" : "good"} />
        <Stat label="취소·반품·교환" value={`${sum.cancel} · ${sum.returns} · ${sum.exchange}건`} sub={`반품·교환 비율 ${sum.returnRatePct}%`} tone={sum.returnRatePct >= 5 ? "bad" : "plain"} />
      </div>

      {(sum.missingCost > 0 || sum.estimatedShare > 0) && (
        <div className="mb-4 space-y-2 print:hidden">
          {sum.missingCost > 0 && <Notice tone="warn">⚠ 원가를 넣지 않은 상품이 {sum.missingCost}개 있어 순이익이 실제보다 크게 보입니다. <Link href="/settings" className="font-bold underline">원가·수수료 설정</Link>에서 넣어 주세요.</Notice>}
          {sum.estimatedShare > 0 && (
            <Notice>
              ℹ 정산액 열이 없는 줄은 마켓 대표 수수료로 추정했습니다({MARKETS.filter((m) => scoped.some((l) => l.market === m.id && l.settlement == null)).map((m) => `${m.label} ${settings.marketFeePct[m.id] ?? MARKET_FEES[m.id].ratePct}%${MARKET_FEES[m.id].verified ? "" : "⚠"}`).join(", ")}). ⚠ 표시는 공식 표 미확인 값입니다 — 실제 요율은 판매자센터에서 확인해 설정에서 바꾸세요.
            </Notice>
          )}
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="slw-card p-4">
          <h2 className="mb-2 text-sm font-extrabold text-slate-900">{PERIODS.find((p) => p.id === period)?.label} 매출·순이익</h2>
          <TrendChart rows={trend} format={won} />
        </section>
        <section className="slw-card p-4">
          <h2 className="mb-2 text-sm font-extrabold text-slate-900">마켓별 매출</h2>
          <Bars rows={markets.map((m) => ({ label: marketLabel(m.key as MarketId), value: m.sales, color: MARKETS.find((x) => x.id === m.key)?.color }))} format={won} />
          <p className="mt-2 text-[12px] text-slate-600">택배비 {won(sum.courier)} · 광고비 {won(sum.adCost)}는 전체 순이익에서만 뺍니다.</p>
        </section>
      </div>

      <div className="space-y-4">
        <GroupTable title="상품별(매출 큰 순)" rows={products} />
        <GroupTable title="마켓별" rows={markets} labelOf={(k) => marketLabel(k as MarketId)} />
        <GroupTable title={`${PERIODS.find((p) => p.id === period)?.label} 표`} rows={trend} />
      </div>
    </div>
  );
}
