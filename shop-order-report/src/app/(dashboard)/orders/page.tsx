"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useData, won } from "@/components/DataProvider";
import { EmptyOrders, Stat } from "@/components/report/Widgets";
import { STATUS_LABEL, type OrderStatus } from "@/lib/orders/parse";
import { MARKETS, marketLabel, type MarketId } from "@/lib/orders/markets";

const STATUSES = Object.keys(STATUS_LABEL) as OrderStatus[];
const PAGE = 100;

export default function OrdersPage() {
  const { lines, ready } = useData();
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [market, setMarket] = useState<MarketId | "all">("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);

  const counts = useMemo(() => {
    const c = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>;
    for (const l of lines) c[l.status] += 1;
    return c;
  }, [lines]);

  const filtered = useMemo(() => {
    const word = q.trim();
    return lines
      .filter((l) => (status === "all" || l.status === status) && (market === "all" || l.market === market) && (!word || l.product.includes(word) || l.orderNo.includes(word) || l.option.includes(word)))
      .slice()
      .reverse();
  }, [lines, status, market, q]);

  if (!ready) return <p className="text-sm text-slate-600">불러오는 중…</p>;
  if (!lines.length) return <EmptyOrders />;
  const shown = filtered.slice(page * PAGE, page * PAGE + PAGE);

  return (
    <div>
      <PageHeader emoji="📦" title="주문 현황" description="올린 파일 기준 주문 상태입니다. 최신 상태를 보려면 판매자센터에서 새 파일을 받아 다시 올리세요." />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {STATUSES.map((s) => (
          <button key={s} type="button" onClick={() => { setStatus(status === s ? "all" : s); setPage(0); }} className={`text-left ${status === s ? "ring-2 ring-teal-600 rounded-2xl" : ""}`}>
            <Stat label={STATUS_LABEL[s]} value={`${counts[s].toLocaleString()}건`} tone={s === "cancel" || s === "return" ? "bad" : s === "new" ? "accent" : "plain"} />
          </button>
        ))}
      </div>
      <section className="slw-card p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select className="slw-field !w-auto" value={market} onChange={(e) => { setMarket(e.target.value as MarketId | "all"); setPage(0); }} aria-label="마켓">
            <option value="all">모든 마켓</option>
            {MARKETS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <select className="slw-field !w-auto" value={status} onChange={(e) => { setStatus(e.target.value as OrderStatus | "all"); setPage(0); }} aria-label="상태">
            <option value="all">모든 상태</option>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <input className="slw-field !w-56" placeholder="상품명·주문번호 찾기" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
          <span className="text-[12px] text-slate-600">{filtered.length.toLocaleString()}건</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[12px] text-slate-600">
                <th className="py-2 pr-2">주문일</th><th className="pr-2">마켓</th><th className="pr-2">상품 · 옵션</th><th className="pr-2 text-right">수량</th><th className="pr-2 text-right">금액</th><th className="pr-2">상태</th><th>주문번호</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((l) => (
                <tr key={l.id} className="border-b border-slate-100">
                  <td className="py-1.5 pr-2 font-mono text-[12px]">{l.orderedAt}</td>
                  <td className="pr-2">{marketLabel(l.market)}</td>
                  <td className="max-w-[320px] truncate pr-2" title={`${l.product} ${l.option}`}>{l.product}{l.option && <span className="text-slate-500"> · {l.option}</span>}</td>
                  <td className="pr-2 text-right">{l.qty}</td>
                  <td className="pr-2 text-right font-mono">{won(l.amount)}</td>
                  <td className="pr-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${l.status === "cancel" || l.status === "return" ? "bg-rose-50 text-rose-700" : l.status === "new" ? "bg-teal-50 text-teal-800" : "bg-slate-100 text-slate-700"}`} title={l.statusRaw}>{STATUS_LABEL[l.status]}</span></td>
                  <td className="font-mono text-[12px] text-slate-500">{l.orderNo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > PAGE && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <button type="button" className="slw-btn" disabled={page === 0} onClick={() => setPage(page - 1)}>이전</button>
            <span className="text-[12px] text-slate-600">{page + 1} / {Math.ceil(filtered.length / PAGE)}</span>
            <button type="button" className="slw-btn" disabled={(page + 1) * PAGE >= filtered.length} onClick={() => setPage(page + 1)}>다음</button>
          </div>
        )}
      </section>
    </div>
  );
}
