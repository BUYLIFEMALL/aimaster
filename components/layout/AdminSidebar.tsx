"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Users,
  Award,
  CreditCard,
  BarChart2,
  ChevronLeft,
} from "lucide-react";
import GoldGradientText from "@/components/ui/GoldGradientText";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/admin", icon: LayoutDashboard, label: "대시보드" },
  { href: "/admin/programs", icon: Package, label: "프로그램 관리" },
  { href: "/admin/members", icon: Users, label: "회원 관리" },
  { href: "/admin/grades", icon: Award, label: "등급 관리" },
  { href: "/admin/settlements", icon: CreditCard, label: "정산 관리" },
  { href: "/admin/statistics", icon: BarChart2, label: "통계" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 min-h-screen bg-surface border-r border-gold/20 flex-shrink-0">
      <div className="p-5 border-b border-gold/20">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold to-gold-light flex items-center justify-center">
            <span className="text-black font-bold text-xs">AI</span>
          </div>
          <GoldGradientText className="text-lg font-bold">AI Master</GoldGradientText>
        </div>
        <span className="text-xs text-gold/60 font-semibold tracking-widest">ADMIN PANEL</span>
      </div>

      <nav className="p-3">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors mb-1",
              pathname === href || (href !== "/admin" && pathname.startsWith(href))
                ? "text-gold bg-gold/10"
                : "text-subtext hover:text-white hover:bg-white/5"
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
        <div className="mt-4 pt-4 border-t border-white/10">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-subtext hover:text-white hover:bg-white/5 transition-colors"
          >
            <ChevronLeft size={16} />
            사이트로 돌아가기
          </Link>
        </div>
      </nav>
    </aside>
  );
}
