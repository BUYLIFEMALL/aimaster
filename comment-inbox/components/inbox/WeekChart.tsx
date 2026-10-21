import type { DayCount } from "@/lib/inbox/load";

// v1.06 최근 7일 응대 막대그래프 — 그림 라이브러리 없이 CSS 막대. 맨 오른쪽이 오늘.
export function WeekChart({ days }: { days: DayCount[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const total = days.reduce((s, d) => s + d.count, 0);
  const half = (a: DayCount[]) => a.reduce((s, d) => s + d.count, 0);
  // 앞 3일과 뒤 3일(오늘 포함)을 비교해 흐름 한 줄
  const before = half(days.slice(0, 3));
  const after = half(days.slice(4));
  const trend = total === 0 ? "아직 응대 기록이 없어요" : after > before ? "📈 응대가 늘고 있어요" : after < before ? "📉 응대가 줄고 있어요" : "➖ 비슷하게 응대하고 있어요";

  return (
    <div className="rounded-2xl border border-ig-border bg-ig-surface p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold text-ig-text">📊 최근 7일 응대</h2>
        <p className="text-xs text-ig-muted">
          합계 <span className="font-bold text-ig-text">{total}</span>건 · {trend}
        </p>
      </div>
      <div className="flex h-32 items-end gap-2" role="img" aria-label={days.map((d) => `${d.label} ${d.count}건`).join(", ")}>
        {days.map((d, i) => {
          const today = i === days.length - 1;
          return (
            <div key={d.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${d.label}(${d.weekday}) ${d.count}건`}>
              <span className={`text-[11px] font-bold ${today ? "text-pink-400" : "text-ig-muted"}`}>{d.count}</span>
              <div
                className={`w-full max-w-[40px] rounded-t-md ${today ? "bg-gradient-to-t from-rose-500 to-pink-400" : "bg-ig-border"}`}
                style={{ height: `${d.count === 0 ? 2 : Math.max(6, (d.count / max) * 100)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2">
        {days.map((d, i) => (
          <p key={d.key} className={`flex-1 text-center text-[10px] leading-tight ${i === days.length - 1 ? "font-bold text-pink-400" : "text-ig-muted"}`}>
            {i === days.length - 1 ? "오늘" : d.label}
            <br />
            {d.weekday}
          </p>
        ))}
      </div>
    </div>
  );
}
