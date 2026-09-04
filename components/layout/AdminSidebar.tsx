"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  PackagePlus,
  Users,
  Award,
  CreditCard,
  BarChart2,
  Shield,
  Settings,
  ChevronLeft,
  Menu,
  X,
  Ticket,
  HelpCircle,
  Megaphone,
  FileText,
} from "lucide-react";
import GoldGradientText from "@/components/ui/GoldGradientText";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/admin", icon: LayoutDashboard, label: "대시보드" },
  { href: "/admin/programs", icon: Package, label: "프로그램 관리" },
  { href: "/admin/programs/new", icon: PackagePlus, label: "프로그램 추가" },
  { href: "/admin/members", icon: Users, label: "회원 관리 (사용권한/기간)" },
  { href: "/admin/grades", icon: Award, label: "등급 관리" },
  { href: "/admin/access-matrix", icon: Shield, label: "접근 권한 관리" },
  { href: "/admin/coupons", icon: Ticket, label: "쿠폰 관리" },
  { href: "/admin/faq", icon: HelpCircle, label: "FAQ 관리" },
  { href: "/admin/notices", icon: Megaphone, label: "공지사항 관리" },
  { href: "/admin/legal", icon: FileText, label: "약관/정책 관리" },
  { href: "/admin/settlements", icon: CreditCard, label: "정산 관리" },
  { href: "/admin/statistics", icon: BarChart2, label: "통계" },
  { href: "/admin/settings", icon: Settings, label: "사이트 설정" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // 여러 항목이 겹치는 경로(예: /admin/programs, /admin/programs/new)일 때
  // 가장 구체적인(긴) href 하나만 활성 표시되도록 계산
  const activeHref = NAV_ITEMS
    .filter(({ href }) => href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const navContent = (
    <>
      <div className="p-5 border-b border-gold/20">
        <Link href="/" className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold to-gold-light flex items-center justify-center">
            <span className="text-black font-bold text-xs">AI</span>
          </div>
          <GoldGradientText className="text-lg font-bold">AI Master</GoldGradientText>
        </Link>
        <span className="text-xs text-gold/60 font-semibold tracking-widest">ADMIN PANEL</span>
      </div>

      <nav className="p-3">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors mb-1",
              href === activeHref
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
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-subtext hover:text-white hover:bg-white/5 transition-colors"
          >
            <ChevronLeft size={16} />
            사이트로 돌아가기
          </Link>
        </div>
      </nav>
    </>
  );

  return (
    <>
      {/* 모바일 헤더 */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-surface border-b border-gold/20 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold to-gold-light flex items-center justify-center">
            <span className="text-black font-bold text-xs">AI</span>
          </div>
          <GoldGradientText className="text-sm font-bold">ADMIN</GoldGradientText>
        </Link>
        <button onClick={() => setOpen(!open)} className="text-subtext hover:text-white p-1">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* 모바일 오버레이 */}
      {open && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/60" onClick={() => setOpen(false)} />
      )}

      {/* 사이드바 */}
      <aside
        className={cn(
          "fixed md:static z-30 top-0 left-0 h-full w-60 bg-surface border-r border-gold/20 flex-shrink-0 transition-transform duration-200",
          "md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {navContent}
      </aside>
    </>
  );
}
