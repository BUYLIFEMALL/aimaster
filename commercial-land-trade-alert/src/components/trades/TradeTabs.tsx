import Link from "next/link";

// 실거래 메뉴 하나 안에서 내역·지역 설정·조건을 오가는 탭(2026-10-31 주인님 지시로 메뉴 3칸을 1칸으로).
const TABS = [
  { id: "trades", href: "/trades", label: "🏢 내역" },
  { id: "districts", href: "/districts", label: "📍 실거래 지역 추가" },
  { id: "conditions", href: "/conditions", label: "🧾 조건" },
];

export function TradeTabs({ active }: { active: "trades" | "districts" | "conditions" }) {
  return (
    <nav aria-label="실거래 화면" className="mt-4 flex flex-wrap gap-1 border-b border-mx-border">
      {TABS.map((t) => (
        <Link
          key={t.id}
          href={t.href}
          aria-current={active === t.id ? "page" : undefined}
          className={`-mb-px min-h-[44px] rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-bold ${active === t.id ? "border-mx-primary text-mx-primary" : "border-transparent text-mx-muted hover:text-mx-text"}`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
