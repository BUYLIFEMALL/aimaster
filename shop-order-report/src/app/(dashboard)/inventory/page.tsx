"use client";

import { useMemo, useState } from "react";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { useData } from "@/components/DataProvider";
import { EmptyOrders } from "@/components/report/Widgets";
import { forecastStock, lastOrderDate } from "@/lib/report/inventory";

const LEVEL = {
  danger: { label: "7일 안 품절", cls: "bg-rose-50 text-rose-700" },
  warn: { label: "14일 안 품절", cls: "bg-amber-50 text-amber-800" },
  ok: { label: "여유", cls: "bg-emerald-50 text-emerald-800" },
  unknown: { label: "재고 미입력", cls: "bg-slate-100 text-slate-600" },
};

export default function InventoryPage() {
  const { lines, settings, setSettings, ready } = useData();
  const [windowDays, setWindowDays] = useState(14);
  const end = lastOrderDate(lines);
  const stocks = useMemo(() => Object.fromEntries(Object.entries(settings.products).map(([k, p]) => [k, p.stock ?? null])), [settings.products]);
  const rows = useMemo(() => (end ? forecastStock(lines, stocks, end, windowDays) : []), [lines, stocks, end, windowDays]);

  if (!ready) return <p className="text-sm text-slate-600">불러오는 중…</p>;
  if (!lines.length) return <EmptyOrders />;

  const setStock = (key: string, value: string) =>
    setSettings((s) => ({ ...s, products: { ...s.products, [key]: { ...(s.products[key] ?? { unitCost: 0, packCost: 0 }), stock: value === "" ? null : Math.max(0, Math.floor(Number(value) || 0)) } } }));

  return (
    <div>
      <PageHeader emoji="📉" title="재고 소진 예측" description={`마지막 주문일(${end})까지 최근 ${windowDays}일 판매 수량으로 하루 평균을 내어 현재 재고가 며칠 버틸지 계산합니다.`} />
      <section className="slw-card mb-4 flex flex-wrap items-center gap-2 p-4">
        <span className="text-[13px] font-bold text-slate-700">판매 속도 기준</span>
        {[7, 14, 30].map((d) => (
          <button key={d} type="button" className={windowDays === d ? "slw-primary" : "slw-btn"} onClick={() => setWindowDays(d)}>최근 {d}일</button>
        ))}
        <span className="text-[12px] text-slate-600">재고는 이 표에서 바로 고치면 저장됩니다.</span>
      </section>
      <section className="slw-card p-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-[13px]">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[12px] text-slate-600">
                <th className="py-2 pr-2">상품 · 옵션</th><th className="pr-2 text-right">최근 판매</th><th className="pr-2 text-right">하루 평균</th><th className="w-28 pr-2">현재 재고</th><th className="pr-2 text-right">남은 날</th><th>상태</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-b border-slate-100">
                  <td className="max-w-[280px] truncate py-1.5 pr-2" title={r.key}>{r.key}</td>
                  <td className="pr-2 text-right font-mono">{r.soldInWindow}개</td>
                  <td className="pr-2 text-right font-mono">{r.perDay}</td>
                  <td className="pr-2">
                    <input type="number" min={0} className="slw-field !py-1 text-right font-mono" value={r.stock ?? ""} placeholder="—" onChange={(e) => setStock(r.key, e.target.value)} />
                  </td>
                  <td className="pr-2 text-right font-mono">{r.daysLeft == null ? "—" : `약 ${r.daysLeft}일`}</td>
                  <td><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${LEVEL[r.level].cls}`}>{LEVEL[r.level].label}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="mt-4">
        <Notice tone="tip">💡 행사·계절에 따라 판매 속도가 바뀌면 예측도 달라집니다. 새 주문 파일을 올리고 재고를 고칠 때마다 다시 계산됩니다.</Notice>
      </div>
    </div>
  );
}
