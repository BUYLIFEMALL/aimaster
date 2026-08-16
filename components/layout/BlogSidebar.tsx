"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PenSquare, FileText, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/blog", icon: Home, label: "홈 (전체 글)" },
  { href: "/blog/write/ai-form", icon: PenSquare, label: "AI 글쓰기" },
  { href: "/blog/my-posts", icon: FileText, label: "내 글" },
  { href: "/api-settings", icon: KeyRound, label: "API 키 설정" },
];

export default function BlogSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-full flex-col border-b border-white/10 md:h-full md:w-60 md:flex-shrink-0 md:border-b-0 md:border-r">
      <nav className="flex gap-1 overflow-x-auto p-3 md:flex-col md:overflow-visible">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              pathname === href
                ? "bg-gold/10 text-gold"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
