"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME, APP_VERSION } from "@/lib/version";
import { signOutAction } from "@/lib/actions/auth";
import { useDismiss } from "@/components/studio/useDismiss";

// 메뉴는 화면이 생길 때마다 여기에 한 줄씩 넣는다(데스크톱과 위쪽 접는 메뉴가 같은 목록을 쓴다).
const MENU = [
  { href: "/start", label: "🚀 시작하기" },
  { href: "/create", label: "🎨 만들기" },
  { href: "/jobs", label: "📋 작업 기록" },
  { href: "/settings", label: "⚙ API키등록·플랫폼연동" },
  { href: "/guide", label: "📖 연동 & 사용 매뉴얼" },
];

export function Sidebar({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // 위쪽 접는 메뉴: Esc로 닫고, 닫히면 메뉴 버튼으로 초점이 돌아간다(키보드만으로 여닫을 수 있게).
  const menuButton = useDismiss(open, () => setOpen(false));

  const nav = (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <div className="border-b border-[var(--line)] pb-3">
        <Link href="/start" onClick={() => setOpen(false)} className="block text-sm font-bold">
          🎨 {APP_NAME}
        </Link>
        <div className="mt-0.5 text-[11px] text-[var(--muted)]">{APP_VERSION}</div>
        <a href="https://www.buylife.xyz/programs" className="mt-2 block text-[11px] text-[var(--muted)] hover:text-[var(--accent)]">
          ← 다른 프로그램 보기
        </a>
      </div>

      {/* 메뉴만 늘어나고 줄어든다. 계정은 마지막 메뉴 바로 아래에 붙인다(SIDEBAR_LAYOUT_STANDARD). */}
      <nav className="mt-3 min-h-0 space-y-1 overflow-y-auto">
        {MENU.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            onClick={() => setOpen(false)}
            aria-current={pathname === m.href ? "page" : undefined}
            className={`block rounded-lg px-3 py-2 text-sm ${pathname === m.href ? "bg-[var(--line)] font-bold" : "text-[var(--muted)] hover:bg-[var(--line)]"}`}
          >
            {m.label}
          </Link>
        ))}
      </nav>

      <div className="mt-3 flex shrink-0 items-center justify-between gap-2 border-t border-[var(--line)] pt-3 text-[11px] text-[var(--muted)]">
        <span className="truncate" title={email}>
          {email || "로그인 계정"}
        </span>
        <form action={signOutAction}>
          <button type="submit" className="shrink-0 rounded px-2 py-1 hover:bg-[var(--line)]">
            로그아웃
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-[var(--line)] bg-[var(--surface)] md:flex">{nav}</aside>

      <div className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--surface)] md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/start" className="text-sm font-bold">
            🎨 {APP_NAME}
          </Link>
          <button type="button" ref={menuButton} aria-label={open ? "메뉴 닫기" : "메뉴 열기"} aria-expanded={open} aria-controls="top-menu" onClick={() => setOpen((v) => !v)} className="h-10 w-10 rounded-lg text-xl">
            {open ? "✕" : "☰"}
          </button>
        </div>
        {open && (
          <div id="top-menu" className="max-h-[calc(100vh-3.5rem)] overflow-y-auto border-t border-[var(--line)]">
            {nav}
          </div>
        )}
      </div>
    </>
  );
}
