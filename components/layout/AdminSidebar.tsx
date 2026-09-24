"use client";

import { useState, useEffect } from "react";
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
  KeyRound,
  UserCheck,
} from "lucide-react";
import GoldGradientText from "@/components/ui/GoldGradientText";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/admin", icon: LayoutDashboard, label: "대시보드" },
  { href: "/admin/programs", icon: Package, label: "프로그램 관리" },
  { href: "/admin/programs/new", icon: PackagePlus, label: "프로그램 추가" },
  { href: "/admin/members", icon: Users, label: "회원 관리 (사용권한/기간)" },
  { href: "/admin/grades", icon: Award, label: "등급 관리" },
  { href: "/admin/access-matrix", icon: Shield, label: "접근 권한 관리" },
  { href: "/admin/coupons", icon: Ticket, label: "쿠폰 관리" },
  { href: "/admin/faq", icon: HelpCircle, label: "FAQ 관리" },
  { href: "/admin/guides", icon: KeyRound, label: "API/플랫폼 가이드 관리" },
  { href: "/admin/notices", icon: Megaphone, label: "공지사항 관리" },
  { href: "/admin/legal", icon: FileText, label: "약관/정책 관리" },
  { href: "/admin/settlements", icon: CreditCard, label: "정산 관리" },
  { href: "/admin/statistics", icon: BarChart2, label: "통계" },
  { href: "/admin/settings", icon: Settings, label: "사이트 설정" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setUserEmail(user.email);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        setUserEmail(session.user.email);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 여러 항목이 겹치는 경로(예: /admin/programs, /admin/programs/new)일 때
  // 가장 구체적인(긴) href 하나만 활성 표시되도록 계산
  const activeHref = NAV_ITEMS
    .filter(({ href }) => href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const navContent = (
    <div className="flex flex-col h-full justify-between overflow-hidden">
      <div className="flex-shrink-0 p-4 border-b border-gold/20">
        <Link href="/" className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold to-gold-light flex items-center justify-center">
            <span className="text-black font-bold text-xs">AI</span>
          </div>
          <GoldGradientText className="text-lg font-bold">AI Master</GoldGradientText>
        </Link>
        <div className="text-xs text-gold/60 font-semibold tracking-widest">ADMIN PANEL</div>
        
        {/* 사이트로 돌아가기: ADMIN PANEL 하단으로 이동 */}
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="inline-flex items-center gap-1.5 mt-2.5 px-2.5 py-1.5 rounded-lg bg-white/5 text-xs text-subtext hover:text-white hover:bg-white/10 transition-colors border border-white/5"
        >
          <ChevronLeft size={14} />
          사이트로 돌아가기
        </Link>
      </div>

      <nav className="p-3 flex-1 overflow-y-auto">
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
      </nav>

      {/* 좌하단 푸터: 관리자 | 로그인 계정 메일 정보 (맨 하단 고정) */}
      <div className="p-4 border-t border-gold/20 bg-black/40 text-xs flex items-center gap-2 overflow-hidden flex-shrink-0">
        <UserCheck size={14} className="text-gold flex-shrink-0" />
        <span className="font-semibold text-gold flex-shrink-0">관리자</span>
        <span className="text-white/30 flex-shrink-0 font-light">|</span>
        <span className="truncate text-subtext font-medium" title={userEmail}>
          {userEmail || "관리자 계정"}
        </span>
      </div>
    </div>
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

      {/* 사이드바 (맨 하단 고정 레이아웃) */}
      <aside
        className={cn(
          "fixed md:sticky top-0 left-0 h-screen w-60 bg-surface border-r border-gold/20 flex-shrink-0 transition-transform duration-200 z-30 flex flex-col overflow-hidden",
          "md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {navContent}
      </aside>
    </>
  );
}
