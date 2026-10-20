"use client";

import { useState, type ReactNode } from "react";

export interface ChartItem {
  label: string;
  value: number;
  /** 마우스를 올렸을 때 보이는 설명 */
  title: string;
}

/** 세로 막대 차트 (외부 차트 라이브러리 없이 CSS로 그린다) */
export function BarChart({ items, formatValue }: { items: ChartItem[]; formatValue: (n: number) => string }) {
  const max = items.reduce((m, i) => Math.max(m, i.value), 0);
  if (items.length === 0 || max <= 0) {
    return <p className="py-10 text-center text-sm text-yt-muted">표시할 데이터가 없습니다.</p>;
  }
  return (
    <div>
      <div className="relative h-56 border-b border-l border-yt-border pl-1">
        {[0, 1, 2, 3].map((n) => (
          <div key={n} className="absolute left-0 right-0 border-t border-dashed border-yt-border" style={{ bottom: `${(n / 3) * 100}%` }} />
        ))}
        <span className="absolute -left-1 top-0 -translate-x-full pr-2 text-[10px] text-yt-muted">{formatValue(max)}</span>
        <div className="relative flex h-full items-end gap-1">
          {items.map((item, i) => (
            <div key={`${item.label}-${i}`} className="group relative flex h-full flex-1 items-end justify-center" title={item.title}>
              <div
                className="w-full rounded-t bg-red-500 transition-opacity group-hover:opacity-80"
                style={{ height: `${Math.max(1.5, (item.value / max) * 100)}%` }}
              />
              <span className="pointer-events-none absolute bottom-full mb-1 hidden whitespace-nowrap rounded bg-yt-raised px-1.5 py-0.5 text-[10px] text-white group-hover:block">
                {formatValue(item.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1 flex gap-1 pl-1">
        {items.map((item, i) => (
          <span key={`${item.label}-${i}`} className="flex-1 truncate text-center text-[10px] text-yt-muted" title={item.title}>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export interface ShareItem {
  label: string;
  value: number;
  color: string;
}

/** 원형(도넛) 비율 차트 + 범례 */
export function ShareChart({ items, formatValue }: { items: ShareItem[]; formatValue: (n: number) => string }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (items.length === 0 || total <= 0) {
    return <p className="py-10 text-center text-sm text-yt-muted">표시할 데이터가 없습니다.</p>;
  }
  let acc = 0;
  const stops = items
    .map((item) => {
      const start = (acc / total) * 100;
      acc += item.value;
      return `${item.color} ${start}% ${(acc / total) * 100}%`;
    })
    .join(", ");

  return (
    <div className="flex flex-col items-center gap-6 py-2 sm:flex-row sm:items-start">
      <div className="relative h-44 w-44 shrink-0 rounded-full" style={{ background: `conic-gradient(${stops})` }}>
        <div className="absolute inset-8 rounded-full bg-yt-surface" />
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-1.5 text-sm">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: item.color }} />
            <span className="min-w-0 flex-1 truncate text-yt-text" title={item.label}>
              {item.label}
            </span>
            <span className="shrink-0 text-xs text-yt-muted">
              {formatValue(item.value)} · {((item.value / total) * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface ChartTab {
  key: string;
  label: string;
  render: () => ReactNode;
}

/** 차트 탭 묶음 */
export function ChartTabs({ title, tabs }: { title: (activeLabel: string) => string; tabs: ChartTab[] }) {
  const [activeKey, setActiveKey] = useState(tabs[0]?.key);
  const active = tabs.find((t) => t.key === activeKey) ?? tabs[0];
  if (!active) return null;
  return (
    <section className="rounded-2xl border border-yt-border bg-yt-surface p-5 shadow-xs">
      <div className="mb-4 flex flex-wrap gap-1 rounded-xl bg-yt-raised p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveKey(t.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              t.key === active.key ? "bg-yt-red text-white shadow-xs" : "text-yt-muted hover:bg-yt-surface"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <h3 className="mb-4 text-sm font-bold text-yt-text">{title(active.label)}</h3>
      {active.render()}
    </section>
  );
}
