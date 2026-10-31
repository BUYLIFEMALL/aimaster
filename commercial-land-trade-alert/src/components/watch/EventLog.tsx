"use client";

// 변동 기록 표. 기준: realty-listing-alert/app/results/StatsDashboard.tsx EventLog
// 기록은 회원 PC의 확장에만 1년 쌓이며 중개사 정보는 넣지 않는다.
import { useMemo, useState } from "react";

export type EventRow = { at: string; type: "new" | "priceDown" | "priceUp" | "gone"; watch: string; kind: string; price: string; area: string | number | null; floor: string; url: string };
type Period = "last" | "7" | "30" | "90" | "180" | "365";

const TABS: { id: EventRow["type"] | "all"; label: string }[] = [
  { id: "all", label: "전체" }, { id: "new", label: "🆕 새 매물" }, { id: "priceDown", label: "📉 가격 내림" }, { id: "priceUp", label: "📈 가격 오름" }, { id: "gone", label: "👋 사라짐" },
];
const PERIODS: [Period, string][] = [["last", "이번 회차"], ["7", "7일"], ["30", "1개월"], ["90", "3개월"], ["180", "6개월"], ["365", "1년"]];
const MAX_ROWS = 300;
const when = (iso: string) => new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
const isNaver = (u: string) => /^https:\/\/(new|fin|m)\.land\.naver\.com\//.test(String(u));

export function EventLog({ events, lastAt, short }: { events: EventRow[]; lastAt: string; short: (watch: string) => string }) {
  const [period, setPeriod] = useState<Period>("last");
  const [type, setType] = useState<EventRow["type"] | "all">("all");
  const [area, setArea] = useState("");

  const inPeriod = useMemo(() => {
    if (period === "last") return events.filter((e) => e.at === lastAt);
    const cut = new Date(lastAt).getTime() - Number(period) * 24 * 3600 * 1000;
    return events.filter((e) => new Date(e.at).getTime() >= cut);
  }, [events, period, lastAt]);
  const areas = useMemo(() => [...new Set(inPeriod.map((e) => short(e.watch)))].filter(Boolean), [inPeriod, short]);
  const scoped = area && areas.includes(area) ? inPeriod.filter((e) => short(e.watch) === area) : inPeriod;
  const counts: Record<string, number> = { all: scoped.length, new: 0, priceDown: 0, priceUp: 0, gone: 0 };
  for (const e of scoped) counts[e.type]++;
  const rows = (type === "all" ? scoped : scoped.filter((e) => e.type === type)).slice().reverse();

  return (
    <div id="event-log" className="mt-5">
      <h3 className="text-base font-bold">🔔 변동 기록</h3>
      <p className="mt-1 text-xs text-mx-muted">새 매물·가격 변동·사라진 매물을 기간·지역별로 모아 봅니다. 기록은 회원님 PC의 확장에만 1년 쌓입니다.</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div role="group" aria-label="기간" className="inline-flex flex-wrap overflow-hidden rounded-xl border border-mx-border">
          {PERIODS.map(([id, text]) => (
            <button key={id} type="button" aria-pressed={period === id} onClick={() => setPeriod(id)} className={`min-h-[40px] border-r border-mx-border px-3 text-sm last:border-r-0 ${period === id ? "bg-mx-primary/10 font-bold text-mx-primary" : "bg-white"}`}>{text}</button>
          ))}
        </div>
        <select value={area} onChange={(e) => setArea(e.target.value)} aria-label="지역" className="mx-input min-h-[40px] w-auto py-2 text-sm">
          <option value="">전체 지역</option>
          {areas.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <div role="tablist" aria-label="변동 종류" className="mt-2 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={type === t.id} onClick={() => setType(t.id)} className={`min-h-[36px] rounded-lg border px-3 text-sm ${type === t.id ? "border-mx-primary bg-mx-primary/10 font-bold text-mx-primary" : "border-mx-border bg-white"}`}>
            {t.label} <b>{counts[t.id]}</b>
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-mx-muted">{period === "last" ? "이번 회차에는 이 종류의 변동이 없습니다. 기간을 넓혀 보세요." : "이 기간에는 이 종류의 변동 기록이 없습니다."}</p>
      ) : (
        <div className="mt-2 overflow-x-auto rounded-2xl border border-mx-border">
          <table className="mx-table [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
            <thead><tr><th>수집 시각</th><th>변동</th><th>지역</th><th>유형</th><th>가격</th><th>면적(㎡)</th><th>층</th><th>네이버</th></tr></thead>
            <tbody>
              {rows.slice(0, MAX_ROWS).map((e, i) => (
                <tr key={`${e.at}-${e.url}-${i}`}>
                  <td>{when(e.at)}</td>
                  <td>{TABS.find((t) => t.id === e.type)?.label}</td>
                  <td title={e.watch}>{short(e.watch)}</td>
                  <td>{e.kind}</td>
                  <td>{e.price}</td>
                  <td>{e.area ?? ""}</td>
                  <td>{e.floor}</td>
                  <td>{isNaver(e.url) ? <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-mx-link underline">보기 ↗</a> : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > MAX_ROWS && <p className="mt-1 text-xs text-mx-muted">최근 {MAX_ROWS}건만 보여 드립니다. 기간이나 지역을 좁혀 보세요.</p>}
    </div>
  );
}
