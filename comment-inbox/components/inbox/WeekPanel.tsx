"use client";

import type { ChartSeries } from "@/components/weekChart/WeekReplyChart";
import { WeekReplyPanel, type DayReplyResult } from "@/components/weekChart/WeekReplyPanel";
import { loadDayRepliedAction } from "@/lib/actions/inbox";
import type { DayCount } from "@/lib/weekChart/bucket";

// v1.07 최근 7일 응대 — 플랫폼별 색으로 쌓고(카드 칩과 같은 색), 막대를 누르면 그날 답한 목록을 아래에 펼친다.
// v1.08 그래프·목록을 공용 기준 코드 `week-reply-panel`로 옮기고, 목록에 상대가 남긴 원래 댓글·메시지도 보여 준다.
const SERIES: ChartSeries[] = [
  { key: "ig_comment", label: "📸 인스타 댓글", color: "#ec4899" },
  { key: "ig_dm", label: "💌 인스타 DM", color: "#a855f7" },
  { key: "threads", label: "🧵 쓰레드", color: "#94a3b8" },
  { key: "youtube", label: "▶️ 유튜브", color: "#ef4444" },
];
const LABEL = Object.fromEntries(SERIES.map((s) => [s.key, s.label]));
const COLOR = Object.fromEntries(SERIES.map((s) => [s.key, s.color]));
const CLASSES = { border: "border-ig-border", item: "bg-ig-bg", muted: "text-ig-muted", danger: "text-ig-danger" };

async function loadDay(key: string): Promise<DayReplyResult> {
  const r = await loadDayRepliedAction(key);
  if (r.error) return { error: r.error };
  return {
    items: (r.items ?? []).map((it) => ({
      key: `${it.platform}-${it.id}`,
      tag: LABEL[it.platform],
      color: COLOR[it.platform],
      author: it.authorLabel,
      at: it.at,
      comment: it.comment,
      reply: it.reply,
      href: it.sourceHref,
    })),
  };
}

export function WeekPanel({ days }: { days: DayCount[] }) {
  return (
    <div className="rounded-2xl border border-ig-border bg-ig-surface p-5 text-ig-text">
      <WeekReplyPanel days={days} series={SERIES} loadDay={loadDay} classes={CLASSES} />
    </div>
  );
}
