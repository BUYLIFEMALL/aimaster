"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useData, won } from "@/components/DataProvider";
import { EmptyOrders, Stat } from "@/components/report/Widgets";
import { STATUS_LABEL, type OrderStatus } from "@/lib/orders/parse";
import { MARKETS, marketLabel, type MarketId } from "@/lib/orders/markets";
import { MAX_IMPORT_ROWS, labelImportUrl } from "@/lib/shopFlow";
import { readFlowActive } from "@/components/ShopFlowBar";
import { writeWorkbook } from "@/lib/exportSheet";
import { saveBlob } from "@/lib/download";

// E9: 발송 전 주문 → 셀러 라벨(개인정보 없음 — 주문 리포트는 처음부터 이름·주소·전화를 읽지 않는다)
const LABEL_HEADERS = ["상품명", "옵션", "수량", "주문번호", "주문일", "마켓"];

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

  const pending = useMemo(() => lines.filter((l) => l.status === "new"), [lines]);
  const [labelMsg, setLabelMsg] = useState<string | null>(null);

  if (!ready) return <p className="text-sm text-slate-600">불러오는 중…</p>;
  if (!lines.length) return <EmptyOrders />;
  const shown = filtered.slice(page * PAGE, page * PAGE + PAGE);

  function labelRows() {
    return pending.map((l) => [l.product, l.option, String(l.qty), l.orderNo, l.orderedAt, marketLabel(l.market)]);
  }
  function openLabels() {
    const url = labelImportUrl({ from: "주문·매출 리포트 — 발송 전 주문", headers: LABEL_HEADERS, rows: labelRows() }, readFlowActive());
    if (!url) {
      setLabelMsg(`발송 전 주문이 ${pending.length}줄이라 한 번에 넘길 수 있는 ${MAX_IMPORT_ROWS}줄을 넘습니다. 엑셀로 받아 셀러 라벨에서 「엑셀·CSV 열기」로 올려 주세요.`);
      return;
    }
    setLabelMsg(null);
    window.open(url, "_blank", "noopener");
  }
  function downloadLabelSheet() {
    saveBlob(`발송전주문_라벨용_${new Date().toISOString().slice(0, 10)}.xlsx`, writeWorkbook([{ name: "라벨", rows: [LABEL_HEADERS, ...labelRows()] }]));
  }

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
      <section className="slw-card mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-slate-900">🏷 발송 전 주문 {pending.length}건 라벨 만들기</p>
          <p className="text-[12px] text-slate-600">셀러 라벨이 새 탭으로 열리며 상품명·옵션·수량·주문번호가 표로 채워집니다. 구매자 개인정보는 넘기지 않습니다.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="slw-primary" disabled={!pending.length} onClick={openLabels}>🏷 셀러 라벨로 보내기</button>
          <button type="button" className="slw-btn" disabled={!pending.length} onClick={downloadLabelSheet}>엑셀로 받기</button>
        </div>
        {labelMsg && <p className="w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">{labelMsg}</p>}
      </section>

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
