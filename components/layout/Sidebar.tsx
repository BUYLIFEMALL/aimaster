"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Settings, KeyRound, Menu, X } from "lucide-react";
import GoldGradientText from "@/components/ui/GoldGradientText";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "내 구독" },
  { href: "/affiliate", icon: Users, label: "어필리에이트" },
  { href: "/api-settings", icon: KeyRound, label: "API 설정" },
  { href: "/settings", icon: Settings, label: "설정" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const navContent = (
    <>
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
            onClick={() => setOpen(false)}
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
    </>
  );

  return (
    <>
      {/* 모바일 햄버거 */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-surface border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold to-gold-light flex items-center justify-center">
            <span className="text-black font-bold text-xs">AI</span>
          </div>
          <GoldGradientText className="text-lg font-bold">AI Master</GoldGradientText>
        </Link>
        <button onClick={() => setOpen(!open)} className="text-subtext hover:text-white p-1">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* 모바일 오버레이 */}
      {open && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/60" onClick={() => setOpen(false)} />
      )}

      {/* 모바일 슬라이드 사이드바 */}
      <aside
        className={cn(
          "fixed md:static z-30 top-0 left-0 h-full w-60 bg-surface border-r border-white/10 flex-shrink-0 transition-transform duration-200",
          "md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {navContent}
      </aside>
    </>
  );
}
