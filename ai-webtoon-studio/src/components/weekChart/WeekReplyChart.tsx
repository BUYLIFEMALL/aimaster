"use client";

// 최근 7일 응대 막대그래프 — 공용 기준 코드(docs/SHARED_MODULES.md 「week-reply-chart」).
// 기준: comment-inbox. 사본은 직접 고치지 말고 기준을 고친 뒤 node scripts/check-shared-modules.mjs --sync.
// 그림 라이브러리 없이 CSS 막대. 맨 오른쪽이 오늘. 테두리·배경 카드는 부르는 쪽이 감싼다(글자색은 물려받음).
// 묶음(series)이 여럿이면 플랫폼별 색으로 쌓고, onSelect를 주면 막대를 눌러 그날을 고를 수 있다.
import type { DayCount } from "@/lib/weekChart/bucket";

export type ChartSeries = { key: string; label: string; color: string };

export function WeekReplyChart({
  days,
  series = [],
  title = "📊 최근 7일 응대",
  selectedKey = null,
  onSelect,
  noun = "응대",
  selectHint = "막대를 누르면 그날 답한 목록을 볼 수 있어요.",
}: {
  days: DayCount[];
  series?: ChartSeries[];
  title?: string;
  selectedKey?: string | null;
  onSelect?: (key: string) => void;
  /** 흐름 문장에 쓰는 말(기본 「응대」, 자동 게시 프로그램은 「게시」) */
  noun?: string;
  /** 막대를 고를 수 있을 때 그래프 아래 안내 */
  selectHint?: string;
}) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const total = days.reduce((s, d) => s + d.count, 0);
  const sum = (a: DayCount[]) => a.reduce((s, d) => s + d.count, 0);
  // 앞 3일과 뒤 3일(오늘 포함)을 비교해 흐름 한 줄
  const before = sum(days.slice(0, 3));
  const after = sum(days.slice(4));
  const trend = total === 0 ? `아직 ${noun} 기록이 없어요` : after > before ? `📈 ${noun}가 늘고 있어요` : after < before ? `📉 ${noun}가 줄고 있어요` : `➖ 비슷하게 ${noun}하고 있어요`;
  // 7일 동안 한 번이라도 나온 묶음만 범례에 보인다
  const shown = series.filter((s) => days.some((d) => (d.bySeries[s.key] ?? 0) > 0));
  const describe = (d: DayCount) =>
    `${d.label}(${d.weekday}) ${d.count}건` +
    (shown.length > 1 ? ` — ${shown.filter((s) => d.bySeries[s.key]).map((s) => `${s.label} ${d.bySeries[s.key]}`).join(", ")}` : "");

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold">{title}</h2>
        <p className="text-xs opacity-70">
          합계 <span className="font-bold opacity-100">{total}</span>건 · {trend}
        </p>
      </div>
      <div className="flex h-32 items-end gap-2" role={onSelect ? undefined : "img"} aria-label={onSelect ? undefined : days.map(describe).join(", ")}>
        {days.map((d, i) => {
          const today = i === days.length - 1;
          const selected = selectedKey === d.key;
          const height = d.count === 0 ? 2 : Math.max(6, (d.count / max) * 100);
          const parts = shown.map((s) => ({ s, n: d.bySeries[s.key] ?? 0 })).filter((p) => p.n > 0);
          const rest = d.count - parts.reduce((s, p) => s + p.n, 0);
          const bar = (
            <>
              <span className={`text-[11px] font-bold ${today || selected ? "text-pink-400" : "opacity-60"}`}>{d.count}</span>
              <div
                className={`flex w-full max-w-[40px] flex-col-reverse overflow-hidden rounded-t-md ${selected ? "ring-2 ring-pink-400 ring-offset-1 ring-offset-transparent" : ""}`}
                style={{ height: `${height}%` }}
              >
                {d.count === 0 ? (
                  <div className="h-full w-full bg-current opacity-20" />
                ) : (
                  <>
                    {parts.map((p) => (
                      <div key={p.s.key} style={{ flexGrow: p.n, backgroundColor: p.s.color }} />
                    ))}
                    {rest > 0 && <div className={today ? "bg-gradient-to-t from-rose-500 to-pink-400" : "bg-current opacity-30"} style={{ flexGrow: rest }} />}
                  </>
                )}
              </div>
            </>
          );
          return onSelect ? (
            <button
              key={d.key}
              type="button"
              onClick={() => onSelect(d.key)}
              aria-pressed={selected}
              aria-label={`${describe(d)} — 눌러서 그날 목록 보기`}
              title={describe(d)}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1 rounded-md transition hover:bg-pink-500/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
            >
              {bar}
            </button>
          ) : (
            <div key={d.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={describe(d)}>
              {bar}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2">
        {days.map((d, i) => (
          <p
            key={d.key}
            className={`flex-1 text-center text-[10px] leading-tight ${i === days.length - 1 || selectedKey === d.key ? "font-bold text-pink-400" : "opacity-60"}`}
          >
            {i === days.length - 1 ? "오늘" : d.label}
            <br />
            {d.weekday}
          </p>
        ))}
      </div>
      {shown.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] opacity-80">
          {shown.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      {onSelect && total > 0 && <p className="mt-2 text-[11px] opacity-60">{selectHint}</p>}
    </div>
  );
}
