"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_VERSION, APP_NAME } from "@/lib/version";
import {
  LayoutDashboard,
  BarChart3,
  Search,
  Target,
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

// 채널 분석 → 키워드 분석 → 공략 채널 찾기 순서의 단계형 흐름. 대시보드는 흐름 밖(맨 위), 설정·매뉴얼은 유틸리티.
const flow: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/channel-analysis", label: "채널 분석", icon: BarChart3 },
  { href: "/keyword-analysis", label: "키워드 분석", icon: Search },
  { href: "/golden-channels", label: "공략 채널 찾기", icon: Target },
];

const utility: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/settings", label: "API키등록·플랫폼연동", icon: KeyRound },
  { href: "/guide", label: "연동 & 사용 매뉴얼", icon: BookOpen },
];

function YoutubeLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"
        fill="#FF0000"
      />
      <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#FFFFFF" />
    </svg>
  );
}

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <YoutubeLogo />
      <div className="min-w-0">
        <p className="line-clamp-2 break-words text-[13px] font-bold leading-snug tracking-tight text-yt-text">{APP_NAME}</p>
        <p className="text-[11px] text-yt-muted">Studio · {APP_VERSION}</p>
      </div>
    </Link>
  );
}

// 유튜브 스튜디오 왼쪽 메뉴처럼: 선택 항목은 왼쪽 빨간 막대 + 밝은 배경.
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
  step?: number;
}) {
  return (
    <Link
      href={href}
      className={`relative flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
        active ? "bg-yt-raised font-bold text-yt-text" : "text-yt-muted hover:bg-yt-hover hover:text-yt-text"
      }`}
    >
      {active && <span className="absolute bottom-2 left-0 top-2 w-1 rounded-full bg-yt-red" />}
      <Icon size={17} className={active ? "text-yt-red" : ""} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {step && <span className="text-[10px] font-bold text-yt-muted">STEP {step}</span>}
    </Link>
  );
}

const isActive = (pathname: string | null, href: string) => !!pathname && (pathname === href || pathname.startsWith(`${href}/`));

function NavContent({ pathname, userEmail }: { pathname: string | null; userEmail?: string }) {
  return (
    <>
      {/* 계정은 메뉴 바로 아래에 붙인다(SIDEBAR_LAYOUT_STANDARD). 메뉴가 길면 메뉴만 스크롤 */}
      <div className="md:min-h-0 md:overflow-y-auto">
        <NavItem href="/dashboard" label="대시보드" icon={LayoutDashboard} active={isActive(pathname, "/dashboard")} />
        <div className="mt-2 flex flex-col gap-0.5 border-t border-yt-border pt-2">
          {flow.map((item, i) => (
            <NavItem key={item.href} {...item} step={i + 1} active={isActive(pathname, item.href)} />
          ))}
        </div>
        <div className="mt-2 flex flex-col gap-0.5 border-t border-yt-border pt-2">
          {utility.map((item) => (
            <NavItem key={item.href} {...item} active={isActive(pathname, item.href)} />
          ))}
        </div>
      </div>

      <div className="mt-2 shrink-0 border-t border-yt-border pt-2">
        <p className="truncate px-3 py-1.5 text-xs text-yt-muted" title={userEmail}>
          {userEmail || "로그인 계정"}
        </p>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-yt-muted transition-colors hover:bg-yt-hover hover:text-yt-text"
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

  // 휴대폰에서 메뉴를 누르고 다른 화면으로 이동하면 펼친 메뉴를 닫는다.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* 데스크톱(768px 이상): 좌측 고정 메뉴 */}
      <aside className="hidden h-screen w-60 shrink-0 select-none flex-col border-r border-yt-border bg-yt-bg p-3 md:sticky md:top-0 md:flex">
        <div className="mb-3 border-b border-yt-border px-2 pb-3 pt-1">
          <Brand />
          <a className="mt-2.5 block text-xs text-yt-muted transition-colors hover:text-yt-text" href="https://www.buylife.xyz/programs">
            ← 다른 프로그램 보기
          </a>
        </div>
        <NavContent pathname={pathname} userEmail={userEmail} />
      </aside>

      {/* 휴대폰(767px 이하): 위쪽 바 + 접는 메뉴(☰) — 항목·순서는 데스크톱과 같다 */}
      <header className="sticky top-0 z-40 border-b border-yt-border bg-yt-bg md:hidden">
        <div className="flex items-center justify-between px-4 py-2.5">
          <Brand />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
            className="flex h-11 w-11 items-center justify-center rounded-full text-yt-text hover:bg-yt-hover"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {open && (
          <div className="max-h-[calc(100dvh-64px)] overflow-y-auto border-t border-yt-border px-3 pb-4 pt-3">
            <a className="mb-2 block px-3 text-xs text-yt-muted hover:text-yt-text" href="https://www.buylife.xyz/programs">
              ← 다른 프로그램 보기
            </a>
            <NavContent pathname={pathname} userEmail={userEmail} />
          </div>
        )}
      </header>
    </>
  );
}
