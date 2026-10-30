"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_VERSION } from "@/lib/version";
import {
  Radar,
  Sparkles,
  TrendingUp,
  Flame,
  Link2,
  Bookmark,
  BarChart3,
  Search,
  KeyRound,
  BookOpen,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";

interface SidebarProps {
  userEmail?: string;
}

// 29. 골든 엠파이어 레이더 워크플로우
const flow: { href: string; label: string; icon: LucideIcon; step?: string }[] = [
  { href: "/dashboard", label: "인텔리전스 레이더", icon: Radar },
  { href: "/golden-channels", label: "황금 채널 스캐너", icon: Sparkles, step: "1" },
  { href: "/trending-videos", label: "급상승 VPH 매트릭스", icon: TrendingUp, step: "2" },
  { href: "/viral-shorts", label: "쇼츠 떡상 트리거", icon: Flame, step: "3" },
  { href: "/source-finder", label: "영상 출처 추적기", icon: Link2, step: "4" },
  { href: "/favorites", label: "황금 공식 보관함", icon: Bookmark, step: "5" },
];

const diagnose: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/channel-analysis", label: "채널 심층 분석", icon: BarChart3 },
  { href: "/keyword-analysis", label: "키워드 점유율 분석", icon: Search },
];

const utility: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/settings", label: "🔑 API키등록·플랫폼연동", icon: KeyRound },
  { href: "/guide", label: "📖 연동 & 사용 매뉴얼", icon: BookOpen },
];

function Brand() {
  return (
    <div className="select-none">
      <Link href="/dashboard" className="flex items-center gap-2.5 group">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FBBF24] to-[#D97706] text-[#0F172A] shadow-md shadow-amber-500/20 transition-transform group-hover:scale-105">
          <span className="text-lg">👑</span>
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-black leading-tight tracking-tight text-[#FBBF24]">골든 엠파이어 레이더</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] font-bold text-slate-300">인텔리전스 콘솔</span>
            <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[10px] font-extrabold text-[#FBBF24] border border-amber-500/30">
              {APP_VERSION}
            </span>
          </div>
        </div>
      </Link>
      <a
        href="https://www.buylife.xyz/programs"
        className="mt-2.5 block text-[11px] text-slate-400 hover:text-amber-400 transition-colors"
      >
        ← 다른 프로그램 보기
      </a>
    </div>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  step,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  step?: string;
}) {
  return (
    <Link
      href={href}
      className={`group flex min-h-[40px] items-center gap-2.5 rounded-xl px-3 py-2 text-xs transition-all ${
        active
          ? "border-l-4 border-[#FBBF24] bg-amber-500/15 font-bold text-[#FBBF24] shadow-sm shadow-amber-500/10"
          : "text-slate-400 hover:bg-[#131B2A] hover:text-[#FBBF24] font-semibold"
      }`}
    >
      <Icon
        size={17}
        className={`shrink-0 transition-colors ${
          active ? "text-[#FBBF24]" : "text-slate-500 group-hover:text-[#FBBF24]"
        }`}
      />
      <span className="flex-1 truncate">{label}</span>
      {step && (
        <span
          className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
            active
              ? "bg-[#FBBF24] text-[#0F172A]"
              : "bg-slate-800 text-slate-400 group-hover:bg-amber-950 group-hover:text-amber-300"
          }`}
        >
          {step}
        </span>
      )}
    </Link>
  );
}

function NavContent({ pathname, userEmail }: { pathname: string; userEmail?: string }) {
  return (
    <>
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto pr-1">
        <p className="px-3 pb-1 pt-1 text-[11px] font-bold uppercase tracking-wider text-amber-500/70">
          🛰️ 인텔리전스 레이더
        </p>
        {flow.map((item) => (
          <NavItem key={item.href} {...item} active={pathname === item.href} />
        ))}

        <div className="mt-2 flex flex-col gap-1 border-t border-slate-800 pt-2">
          <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-amber-500/70">
            📊 채널·키워드 정밀 진단
          </p>
          {diagnose.map((item) => (
            <NavItem key={item.href} {...item} active={pathname === item.href} />
          ))}
        </div>

        <div className="mt-2 flex flex-col gap-1 border-t border-slate-800 pt-2">
          <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-amber-500/70">
            ⚙️ 인텔리전스 시스템
          </p>
          {utility.map((item) => (
            <NavItem key={item.href} {...item} active={pathname === item.href} />
          ))}
        </div>

        {/* 원스톱 파이프라인 직결 배너 */}
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-950/20 p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-black text-[#FBBF24]">
            <span>👑</span>
            <span>원스톱 영상 파이프라인 직결</span>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
            발굴한 황금 공식을 9:16 쇼츠 원스톱 영상 제작실로 전달합니다.
          </p>
          <a
            href="https://shorts-onestop-studio.buylife.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-3d-gold mt-2.5 flex w-full items-center justify-center py-1.5 text-[11px]"
          >
            원스톱 영상 스튜디오 ➔
          </a>
        </div>
      </div>

      <div className="mt-2 shrink-0 border-t border-slate-800 pt-2">
        <p className="truncate px-3 py-1.5 text-xs text-slate-400" title={userEmail}>
          {userEmail || "로그인 계정"}
        </p>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex min-h-[40px] w-full items-center gap-2.5 rounded-xl px-3 text-xs font-semibold text-slate-400 transition-colors hover:bg-slate-900 hover:text-[#FBBF24]"
          >
            <LogOut size={16} />
            <span>로그아웃</span>
          </button>
        </form>
      </div>
    </>
  );
}

export function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile Topbar */}
      <header className="flex h-14 items-center justify-between border-b border-amber-500/20 bg-[#0B0F17] px-4 md:hidden">
        <Brand />
        <button
          type="button"
          aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"}
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-[#131B2A] text-slate-300"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-amber-500/20 bg-[#0B0F17] p-4 transition-transform duration-200 ease-in-out md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-4">
          <Brand />
        </div>
        <NavContent pathname={pathname} userEmail={userEmail} />
      </aside>

      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-amber-500/20 bg-[#0B0F17] p-4 md:flex">
        <div className="mb-5">
          <Brand />
        </div>
        <NavContent pathname={pathname} userEmail={userEmail} />
      </aside>
    </>
  );
}
