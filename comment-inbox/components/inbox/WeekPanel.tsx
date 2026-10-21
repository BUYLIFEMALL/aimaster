"use client";

import { useRef, useState, useTransition } from "react";
import { WeekReplyChart, type ChartSeries } from "@/components/weekChart/WeekReplyChart";
import { loadDayRepliedAction } from "@/lib/actions/inbox";
import { formatDateTimeKo } from "@/lib/formatDate";
import type { DayCount } from "@/lib/weekChart/bucket";
import type { RepliedItem } from "@/lib/inbox/load";

// v1.07 최근 7일 응대 — 플랫폼별 색으로 쌓고(카드 칩과 같은 색), 막대를 누르면 그날 답한 목록을 아래에 펼친다.
const SERIES: ChartSeries[] = [
  { key: "ig_comment", label: "📸 인스타 댓글", color: "#ec4899" },
  { key: "ig_dm", label: "💌 인스타 DM", color: "#a855f7" },
  { key: "threads", label: "🧵 쓰레드", color: "#94a3b8" },
  { key: "youtube", label: "▶️ 유튜브", color: "#ef4444" },
];
const LABEL = Object.fromEntries(SERIES.map((s) => [s.key, s.label]));
const COLOR = Object.fromEntries(SERIES.map((s) => [s.key, s.color]));

export function WeekPanel({ days }: { days: DayCount[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [items, setItems] = useState<RepliedItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const latest = useRef<string | null>(null); // 빠르게 다른 막대를 눌렀을 때 늦게 온 이전 응답은 버린다
  const day = days.find((d) => d.key === selected);

  function select(key: string) {
    if (key === selected) {
      setSelected(null);
      return;
    }
    setSelected(key);
    latest.current = key;
    setItems(null);
    setError(null);
    start(async () => {
      const r = await loadDayRepliedAction(key);
      if (latest.current !== key) return;
      if (r.error) setError(r.error);
      else setItems(r.items ?? []);
    });
  }

  return (
    <div className="rounded-2xl border border-ig-border bg-ig-surface p-5 text-ig-text">
      <WeekReplyChart days={days} series={SERIES} selectedKey={selected} onSelect={select} />
      {day && (
        <div className="mt-4 border-t border-ig-border pt-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-bold">
              {day.label}({day.weekday}) 답한 목록 <span className="font-normal text-ig-muted">{day.count}건</span>
            </p>
            <button type="button" onClick={() => setSelected(null)} className="text-[11px] text-ig-muted hover:text-ig-text">
              닫기 ✕
            </button>
          </div>
          {pending || (!items && !error) ? (
            <p className="py-3 text-xs text-ig-muted">불러오는 중…</p>
          ) : error ? (
            <p className="py-3 text-xs text-ig-danger">{error}</p>
          ) : items && items.length === 0 ? (
            <p className="py-3 text-xs text-ig-muted">이날은 게시·발송한 답장이 없어요.</p>
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {items?.map((it) => (
                <li key={`${it.platform}-${it.id}`}>
                  <a
                    href={it.sourceHref}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl border border-ig-border bg-ig-bg px-3 py-2 transition hover:border-pink-500/40"
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-ig-muted">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: COLOR[it.platform] }} />
                      <span>{LABEL[it.platform]}</span>
                      <span className="font-semibold text-ig-text">{it.authorLabel}</span>
                      <span>{formatDateTimeKo(it.at)}</span>
                    </div>
                    <p className="mt-1 break-words text-xs leading-relaxed">↪ {it.reply || "(내용 없음)"}</p>
                  </a>
                </li>
              ))}
            </ul>
          )}
          {items && items.length > 0 && items.length < day.count && (
            <p className="mt-2 text-[11px] text-ig-muted">플랫폼마다 최근 50건까지 보여요. 나머지는 원래 프로그램에서 확인해 주세요.</p>
          )}
        </div>
      )}
    </div>
  );
}
