"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_VERSION, APP_NAME_LINE1, APP_NAME_LINE2 } from "@/lib/version";
import {
  LayoutDashboard,
  Flame,
  Sparkles,
  TrendingUp,
  Link2,
  Bookmark,
  BarChart3,
  Search,
  KeyRound,
  BookOpen,
  LogOut,
  Menu,
  X,
  PlaySquare,
  type LucideIcon,
} from "lucide-react";

interface SidebarProps {
  userEmail?: string;
}

// 공식 트렌드 워크플로우
const flow: { href: string; label: string; icon: LucideIcon; step?: string }[] = [
  { href: "/dashboard", label: "실시간 대시보드", icon: LayoutDashboard },
  { href: "/trending-videos", label: "급상승 동영상 피드", icon: TrendingUp, step: "1" },
  { href: "/golden-channels", label: "황금·공략 채널 발굴", icon: Sparkles, step: "2" },
  { href: "/viral-shorts", label: "떡상 쇼츠 발굴", icon: Flame, step: "3" },
  { href: "/source-finder", label: "쇼츠 원본 찾기", icon: Link2, step: "4" },
  { href: "/favorites", label: "보관함·즐겨찾기", icon: Bookmark, step: "5" },
];

const diagnose: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/channel-analysis", label: "채널 심층 분석", icon: BarChart3 },
  { href: "/keyword-analysis", label: "키워드 점유율 분석", icon: Search },
];

const utility: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/guide", label: "실전 가이드북", icon: BookOpen },
  { href: "/settings", label: "API 키 설정", icon: KeyRound },
];

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF1A1A] to-[#EA3323] text-white shadow-md shadow-red-500/20">
        <PlaySquare size={20} className="fill-white text-[#EA3323]" />
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-black leading-tight tracking-tight text-[#0F172A]">{APP_NAME_LINE1}</p>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-[#DC2626]">{APP_NAME_LINE2}</span>
          <span className="rounded bg-red-100 px-1 py-0.2 text-[10px] font-extrabold text-red-600">{APP_VERSION}</span>
        </div>
      </div>
    </Link>
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
          ? "border-l-4 border-[#EA3323] bg-red-50/80 font-bold text-[#DC2626] shadow-sm shadow-red-500/5"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-semibold"
      }`}
    >
      <Icon
        size={17}
        className={`shrink-0 transition-colors ${
          active ? "text-[#EA3323]" : "text-slate-400 group-hover:text-slate-600"
        }`}
      />
      <span className="flex-1 truncate">{label}</span>
      {step && (
        <span
          className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
            active ? "bg-red-200 text-red-700" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
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
        <p className="px-3 pb-1 pt-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">🔥 트렌드 발굴 피드</p>
        {flow.map((item) => (
          <NavItem key={item.href} {...item} active={pathname === item.href} />
        ))}

        <div className="mt-2 flex flex-col gap-1 border-t border-slate-200 pt-2">
          <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">📊 채널·키워드 진단</p>
          {diagnose.map((item) => (
            <NavItem key={item.href} {...item} active={pathname === item.href} />
          ))}
        </div>

        <div className="mt-2 flex flex-col gap-1 border-t border-slate-200 pt-2">
          <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">⚙️ 시스템</p>
          {utility.map((item) => (
            <NavItem key={item.href} {...item} active={pathname === item.href} />
          ))}
        </div>

        {/* 원스톱 파이프라인 직결 배너 */}
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50/70 p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-black text-red-700">
            <span>🎬</span>
            <span>원스톱 영상 파이프라인 직결</span>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-slate-600">
            발굴한 떡상 공식을 9:16 쇼츠 원스톱 영상 제작실로 전달합니다.
          </p>
          <a
            href="https://shorts-onestop-studio.buylife.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-3d-red mt-2.5 flex w-full items-center justify-center py-1.5 text-[11px]"
          >
            원스톱 영상 스튜디오 ➔
          </a>
        </div>
      </div>

      <div className="mt-2 shrink-0 border-t border-slate-200 pt-2">
        <p className="truncate px-3 py-1.5 text-xs text-slate-500" title={userEmail}>
          {userEmail || "로그인 계정"}
        </p>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex min-h-[40px] w-full items-center gap-2.5 rounded-xl px-3 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
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
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* 데스크탑(768px 이상): 좌측 고정 메뉴 */}
      <aside className="hidden h-screen w-64 shrink-0 select-none flex-col border-r border-slate-200 bg-white p-3.5 md:sticky md:top-0 md:flex">
        <div className="mb-3 border-b border-slate-100 px-2 pb-3 pt-1">
          <Brand />
          <a
            className="mt-2.5 block text-[11px] font-medium text-slate-400 transition-colors hover:text-slate-700"
            href="https://www.buylife.xyz/programs"
          >
            ← 다른 프로그램 보기
          </a>
        </div>
        <NavContent pathname={pathname} userEmail={userEmail} />
      </aside>

      {/* 모바일(767px 이하): 위쪽 바 + 모바일 드로어 */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white md:hidden">
        <div className="flex items-center justify-between px-4 py-2.5">
          <Brand />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {open && (
          <div className="max-h-[calc(100dvh-60px)] overflow-y-auto border-t border-slate-200 bg-white px-3.5 pb-4 pt-3">
            <a className="mb-2 block px-3 text-xs text-slate-400 hover:text-slate-700" href="https://www.buylife.xyz/programs">
              ← 다른 프로그램 보기
            </a>
            <NavContent pathname={pathname} userEmail={userEmail} />
          </div>
        )}
      </header>
    </>
  );
}
