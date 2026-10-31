"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ExternalLink, LogOut, Menu, X } from "lucide-react";
import { APP_NAME, APP_VERSION, MAIN_SITE } from "@/lib/version";
import { MENU_GROUPS, TOOLS } from "@/lib/tools";

// 좌측 메뉴(docs/SIDEBAR_LAYOUT_STANDARD.md): 계정·로그아웃은 마지막 메뉴 바로 아래에 붙인다.
function BackLink() {
  return (
    <a className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-blue-800" href={`${MAIN_SITE}/programs`}>
      <span>← 다른 프로그램 보기</span>
      <ExternalLink size={11} />
    </a>
  );
}

function BrandName({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link href="/home" onClick={onNavigate} className="flex min-w-0 items-center gap-2">
      <span aria-hidden>🛒</span>
      <span className="truncate text-sm font-extrabold text-slate-900">{APP_NAME}</span>
      <span className="rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-blue-800">{APP_VERSION}</span>
    </Link>
  );
}

function NavBody({ userEmail, onNavigate }: { userEmail?: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const item = (href: string) =>
    `flex items-center gap-2 rounded-md py-2 pl-9 pr-3 text-[13px] transition-colors ${
      pathname === href || pathname.startsWith(`${href}/`) ? "font-bold text-blue-700" : "font-medium text-slate-700 hover:bg-slate-50"
    }`;

  return (
    <nav className="min-h-0 overflow-y-auto p-2" aria-label="프로그램 메뉴">
      <Link href="/home" onClick={onNavigate} className={`mb-1 flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-extrabold hover:bg-slate-50 ${pathname === "/home" ? "text-blue-700" : "text-slate-900"}`}>
        <span aria-hidden>🏠</span>
        <span>대시보드</span>
      </Link>
      {MENU_GROUPS.map((g) => (
        <div key={g.title} className="mb-1">
          <p className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-extrabold text-slate-900">
            <span aria-hidden>{g.emoji}</span>
            <span>{g.title}</span>
          </p>
          {TOOLS.filter((t) => t.group === g.title).sort((a, b) => Number(a.href === "/connect") - Number(b.href === "/connect")).map((t) => (
            <Link key={t.href} href={t.href} onClick={onNavigate} className={item(t.href)}>
              {t.label}
            </Link>
          ))}
        </div>
      ))}
      <Link href="/guide" onClick={onNavigate} className={item("/guide")}>
        <BookOpen size={14} className="text-blue-700" />
        <span>연동 & 사용 매뉴얼</span>
      </Link>

      <div className="mt-2 border-t border-slate-200 pt-2">
        <p className="truncate px-3 font-mono text-[11px] text-slate-600" title={userEmail}>
          {userEmail || "회원 로그인"}
        </p>
        <form action="/api/auth/logout" method="POST">
          <button type="submit" className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-700">
            <LogOut size={14} />
            <span>로그아웃</span>
          </button>
        </form>
      </div>
    </nav>
  );
}

/** WING처럼 맨 위 흰 헤더(데스크톱). 휴대폰은 Sidebar의 ☰ 줄을 쓴다 */
export function TopBar({ userEmail }: { userEmail?: string }) {
  return (
    <header className="sticky top-0 z-40 hidden h-14 items-center justify-between border-b border-slate-200 bg-white px-5 print:hidden md:flex">
      <BrandName />
      <div className="flex items-center gap-4 text-xs text-slate-700">
        <a href="https://wing.coupang.com" target="_blank" rel="noreferrer" className="font-medium hover:text-blue-700">쿠팡 WING 열기 ↗</a>
        <Link href="/guide" className="font-medium hover:text-blue-700">도움말</Link>
        <span className="max-w-56 truncate font-bold" title={userEmail}>{userEmail}</span>
      </div>
    </header>
  );
}

export function Sidebar({ userEmail }: { userEmail?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <aside className="hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 flex-col border-r border-slate-200 bg-white print:!hidden md:sticky md:top-14 md:flex">
        <div className="border-b border-slate-200 px-4 py-2.5"><BackLink /></div>
        <NavBody userEmail={userEmail} />
      </aside>

      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur print:hidden md:hidden">
        <BrandName />
        <button
          type="button"
          aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <div className="relative z-10 flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-2xl">
            <div className="space-y-2 border-b border-slate-200 p-4">
              <BrandName onNavigate={() => setOpen(false)} />
              <BackLink />
            </div>
            <NavBody userEmail={userEmail} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
