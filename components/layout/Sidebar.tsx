"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, TrendingUp, Settings } from "lucide-react";
import GoldGradientText from "@/components/ui/GoldGradientText";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "내 구독" },
  { href: "/affiliate", icon: Users, label: "어필리에이트" },
  { href: "/settings", icon: Settings, label: "설정" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 min-h-screen bg-surface border-r border-white/10 flex-shrink-0">
      <div className="p-5 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold to-gold-light flex items-center justify-center">
            <span className="text-black font-bold text-xs">AI</span>
          </div>
          <GoldGradientText className="text-lg font-bold">AI Master</GoldGradientText>
        </Link>
      </div>
      <nav className="p-3">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors mb-1",
              pathname === href
                ? "text-gold bg-gold/10"
                : "text-subtext hover:text-white hover:bg-white/5"
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
