import Link from "next/link";

// 2026-10-20 병합 B 2단계: 댓글 답글 이력(/history)과 DM 발송 이력(/dm/history)을 한 화면처럼 오가는 탭
export function HistoryTabs({ active }: { active: "comment" | "dm" }) {
  const tabs = [
    { key: "comment", label: "💬 댓글 답글", href: "/history" },
    { key: "dm", label: "💌 DM 답장", href: "/dm/history" },
  ] as const;
  return (
    <div className="mb-5 inline-flex rounded-xl border border-ig-border bg-ig-surface p-1">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            active === t.key ? "bg-ig-text text-ig-surface" : "text-ig-muted hover:text-ig-text"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
