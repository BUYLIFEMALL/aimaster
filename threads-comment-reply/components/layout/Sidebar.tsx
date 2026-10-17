"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";
import { APP_VERSION } from "@/lib/version";
import { ThLogo } from "@/components/ui/ThLogo";

// 스튜디오 왼쪽 메뉴처럼: 선택된 항목은 왼쪽 흰 막대 + 밝은 배경.
// 댓글자동화는 "게시물 관리 → 댓글 검토/게시" 순서의 단계형 흐름이라 그 두 항목에 번호를 붙이고,
// 대시보드(순서 밖)는 맨 위, 답글 이력은 조회용, 설정·매뉴얼은 유틸리티로 아래에 둔다.
type NavItem = { href: string; icon: string; label: string; step?: number; description?: string; badge?: boolean };

const MAIN_ITEMS: NavItem[] = [
  { href: "/dashboard", icon: "🏠", label: "대시보드" },
  { href: "/media", icon: "🧵", label: "게시물 관리", step: 1, description: "게시물 동기화 + 모니터링 대상" },
  { href: "/comments", icon: "💬", label: "댓글 검토/게시", step: 2, description: "AI 답글 초안 검토 후 게시", badge: true },
  { href: "/history", icon: "📊", label: "답글 이력" },
];

const UTILITY_ITEMS: NavItem[] = [
  { href: "/settings", icon: "🔑", label: "API키등록·플랫폼연동" },
  { href: "/guide", icon: "📖", label: "연동 & 사용 매뉴얼" },
];

export function Sidebar({ userEmail, pendingCount }: { userEmail: string; pendingCount: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function renderItem(item: NavItem) {
    const isActive = pathname?.startsWith(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setOpen(false)}
        className={`relative flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
          isActive ? "bg-th-raised font-bold text-th-text" : "text-th-muted hover:bg-th-hover hover:text-th-text"
        }`}
      >
        {isActive && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-th-primary" />}
        <span className="w-5 text-center text-base">{item.icon}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            {item.step && <span className="text-[10px] font-bold text-th-muted">STEP {item.step}</span>}
            <span className="truncate">{item.label}</span>
          </span>
          {item.description && <span className="block truncate text-[11px] font-normal text-th-muted">{item.description}</span>}
        </span>
        {item.badge && pendingCount > 0 && (
          <span className="rounded-full bg-th-primary px-2 py-0.5 text-[11px] font-bold text-black">{pendingCount}</span>
        )}
      </Link>
    );
  }

  const menu = (
    <>
      <nav className="flex flex-col gap-0.5">{MAIN_ITEMS.map(renderItem)}</nav>
      <div className="mt-3 flex flex-col gap-0.5 border-t border-th-border pt-3">{UTILITY_ITEMS.map(renderItem)}</div>
      {/* 계정은 메뉴 바로 아래에 붙인다(SIDEBAR_LAYOUT_STANDARD). */}
      <div className="mt-3 shrink-0 border-t border-th-border pt-3">
        <p className="mb-1 truncate px-3 text-xs text-th-muted">{userEmail}</p>
        <form action={signOutAction}>
          <button
            type="submit"
            className="min-h-[40px] w-full rounded-xl px-3 text-left text-sm font-medium text-th-muted hover:bg-th-hover hover:text-th-text"
          >
            ↪ 로그아웃
          </button>
        </form>
      </div>
    </>
  );

  const brand = (
    <div className="flex items-center gap-2.5">
      <ThLogo size={26} />
      <div className="min-w-0">
        <p className="truncate text-[15px] font-bold leading-tight tracking-tight text-th-text">THREADS 댓글 자동화</p>
        <p className="text-[11px] text-th-muted">Studio · {APP_VERSION}</p>
      </div>
    </div>
  );

  return (
    <>
      {/* 휴대폰(767px 이하): 위쪽 바 + ☰ 접는 메뉴 */}
      <header className="sticky top-0 z-30 border-b border-th-border bg-th-bg md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          {brand}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="메뉴 열기"
            aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-th-text hover:bg-th-hover"
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
        {open && (
          <div className="max-h-[calc(100vh-64px)] overflow-y-auto border-t border-th-border px-3 pb-4 pt-3">
            <a href="https://www.buylife.xyz/programs" className="mb-2 block px-3 text-xs text-th-muted hover:text-th-text">
              ← 다른 프로그램 보기
            </a>
            {menu}
          </div>
        )}
      </header>

      {/* 데스크톱 */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-th-border bg-th-bg p-3 md:sticky md:top-0 md:flex md:h-screen">
        <div className="mb-4 px-2 pt-1">
          {brand}
          <a href="https://www.buylife.xyz/programs" className="mt-2 block text-xs text-th-muted hover:text-th-text">
            ← 다른 프로그램 보기
          </a>
        </div>
        <div className="md:min-h-0 md:overflow-y-auto">{menu}</div>
      </aside>
    </>
  );
}
