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

  // /api-settings는 콘텐츠 영역 자체가 화이트 테마(다른 자동화 프로그램들의 설정 페이지와
  // 동일한 톤)라서, 사이드바도 다크(bg-surface/골드)가 아니라 threads/blog/naver-cafe-poster
  // 등 서브 자동화 사이드바와 같은 화이트 플랫 스타일로 맞춘다(2026-09-11, 좌측 메뉴.png 참고).
  // 대시보드/어필리에이트/설정은 여전히 다크 럭셔리 테마(GlassCard 등)를 쓰므로 그대로 둔다.
  const isLight = pathname === "/api-settings";

  const navContent = (
    <>
      <div className={cn("p-5 border-b", isLight ? "border-slate-200" : "border-white/10")}>
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold to-gold-light flex items-center justify-center">
            <span className="text-black font-bold text-xs">AI</span>
          </div>
          {isLight ? (
            <span className="text-lg font-bold text-slate-900">AI Master</span>
          ) : (
            <GoldGradientText className="text-lg font-bold">AI Master</GoldGradientText>
          )}
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
              isLight
                ? pathname === href
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                : pathname === href
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
      <div
        className={cn(
          "md:hidden fixed top-0 left-0 right-0 z-40 border-b px-4 py-3 flex items-center justify-between",
          isLight ? "bg-white border-slate-200" : "bg-surface border-white/10"
        )}
      >
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold to-gold-light flex items-center justify-center">
            <span className="text-black font-bold text-xs">AI</span>
          </div>
          {isLight ? (
            <span className="text-lg font-bold text-slate-900">AI Master</span>
          ) : (
            <GoldGradientText className="text-lg font-bold">AI Master</GoldGradientText>
          )}
        </Link>
        <button
          onClick={() => setOpen(!open)}
          className={isLight ? "text-slate-500 hover:text-slate-900 p-1" : "text-subtext hover:text-white p-1"}
        >
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
          "fixed md:static z-30 top-0 left-0 h-full w-60 border-r flex-shrink-0 transition-transform duration-200",
          isLight ? "bg-white border-slate-200" : "bg-surface border-white/10",
          "md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {navContent}
      </aside>
    </>
  );
}
