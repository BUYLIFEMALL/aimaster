"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/** 숫자 요약 카드 */
export function Stat({ label, value, sub, tone = "plain" }: { label: string; value: string; sub?: string; tone?: "plain" | "good" | "bad" | "accent" }) {
  const color = tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-rose-700" : tone === "accent" ? "text-teal-800" : "text-slate-900";
  return (
    <div className="slw-card min-w-0 p-4">
      <p className="text-[12px] font-bold text-slate-600">{label}</p>
      <p className={`mt-1 truncate text-xl font-extrabold ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[12px] text-slate-500">{sub}</p>}
    </div>
  );
}

/** 라이브러리 없이 그리는 가로 막대(값이 음수면 빨간색). */
export function Bars({ rows, format }: { rows: { label: string; value: number; color?: string }[]; format: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-2 text-[12px]">
          <span className="truncate text-slate-700" title={r.label}>{r.label}</span>
          <span className="h-3 overflow-hidden rounded bg-slate-100">
            <span className="block h-full rounded" style={{ width: `${(Math.abs(r.value) / max) * 100}%`, background: r.value < 0 ? "#e11d48" : r.color ?? "#0f766e" }} />
          </span>
          <span className={`text-right font-mono ${r.value < 0 ? "text-rose-700" : "text-slate-800"}`}>{format(r.value)}</span>
        </div>
      ))}
    </div>
  );
}

/** 기간 추이 — 세로 막대(매출)와 점(순이익) */
export function TrendChart({ rows, format }: { rows: { key: string; sales: number; profit: number }[]; format: (n: number) => string }) {
  const h = 160;
  const max = Math.max(1, ...rows.map((r) => Math.max(r.sales, r.profit)));
  const min = Math.min(0, ...rows.map((r) => r.profit));
  const span = max - min || 1;
  const y = (v: number) => h - ((v - min) / span) * h;
  const w = Math.max(8, Math.min(40, 640 / Math.max(1, rows.length)));
  const width = rows.length * (w + 4);
  return (
    <div className="overflow-x-auto">
      <svg width={Math.max(width, 280)} height={h + 28} role="img" aria-label="기간별 매출·순이익 그래프">
        <line x1={0} x2={Math.max(width, 280)} y1={y(0)} y2={y(0)} stroke="#cbd5e1" />
        {rows.map((r, i) => {
          const x = i * (w + 4);
          return (
            <g key={r.key}>
              <title>{`${r.key} 매출 ${format(r.sales)} · 순이익 ${format(r.profit)}`}</title>
              <rect x={x} y={y(r.sales)} width={w} height={Math.max(0, y(0) - y(r.sales))} fill="#99d5cd" rx={2} />
              <circle cx={x + w / 2} cy={y(r.profit)} r={3.5} fill={r.profit < 0 ? "#e11d48" : "#0f766e"} />
              {(rows.length <= 16 || i % Math.ceil(rows.length / 12) === 0) && (
                <text x={x + w / 2} y={h + 18} fontSize={10} textAnchor="middle" fill="#475569">
                  {r.key.length > 7 ? r.key.slice(5) : r.key}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="mt-1 text-[12px] text-slate-600">
        <span className="mr-3"><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-[#99d5cd]" />매출</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-teal-700" />순이익</span>
      </p>
    </div>
  );
}

/** 주문이 아직 없을 때 */
export function EmptyOrders({ children }: { children?: ReactNode }) {
  return (
    <div className="slw-card p-8 text-center">
      <p className="text-3xl" aria-hidden>📥</p>
      <p className="mt-2 font-extrabold text-slate-900">아직 올린 주문이 없습니다</p>
      <p className="mt-1 text-sm text-slate-600">판매자센터에서 받은 주문 엑셀을 먼저 올려 주세요. 처음이면 예시 파일로 연습해 볼 수 있습니다.</p>
      <Link href="/upload" className="slw-primary mt-4">주문 파일 올리러 가기 →</Link>
      {children}
    </div>
  );
}
