"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ExternalLink, LogOut, Menu, X } from "lucide-react";
import { APP_NAME, APP_VERSION, MAIN_SITE } from "@/lib/version";
import { TOOLS } from "@/lib/tools";

// 좌측 메뉴(docs/SIDEBAR_LAYOUT_STANDARD.md): 계정·로그아웃은 마지막 메뉴 바로 아래에 붙인다.
function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="border-b border-slate-200 p-5">
      <Link href="/home" onClick={onNavigate} className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-700 text-xl shadow-sm" aria-hidden>
          🛒
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-extrabold leading-snug text-slate-900">{APP_NAME}</span>
          <span className="mt-0.5 inline-block rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-rose-800">
            {APP_VERSION}
          </span>
        </span>
      </Link>
      <a className="mt-3 inline-flex items-center gap-1 text-xs text-slate-600 hover:text-rose-800" href={`${MAIN_SITE}/programs`}>
        <span>← 다른 프로그램 보기</span>
        <ExternalLink size={11} />
      </a>
    </div>
  );
}

function NavBody({ userEmail, onNavigate }: { userEmail?: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const item = (href: string) =>
    `flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] transition-colors ${
      pathname === href || pathname.startsWith(`${href}/`)
        ? "bg-rose-50 font-bold text-rose-900 ring-1 ring-rose-200"
        : "font-medium text-slate-700 hover:bg-slate-100"
    }`;

  return (
    <nav className="min-h-0 overflow-y-auto p-3" aria-label="프로그램 메뉴">
      <Link href="/home" onClick={onNavigate} className={item("/home")}>
        <span aria-hidden>🏠</span>
        <span>대시보드</span>
      </Link>
      <p className="px-3 pb-1 pt-3 text-[11px] font-bold text-slate-500">작업 순서</p>
      <div className="space-y-0.5">
        {TOOLS.map((t) => (
          <Link key={t.href} href={t.href} onClick={onNavigate} className={item(t.href)}>
            <span aria-hidden>{t.emoji}</span>
            <span className="min-w-0">
              <span className="block">{t.label}</span>
              <span className="block truncate text-[11px] font-normal text-slate-500">{t.short}</span>
            </span>
          </Link>
        ))}
      </div>
      <div className="mt-3 border-t border-slate-200 pt-3">
        <Link href="/guide" onClick={onNavigate} className={item("/guide")}>
          <BookOpen size={15} className="text-rose-700" />
          <span>📖 연동 & 사용 매뉴얼</span>
        </Link>
      </div>

      <div className="mt-3 border-t border-slate-200 pt-3">
        <p className="truncate px-3 font-mono text-[11px] text-slate-600" title={userEmail}>
          {userEmail || "회원 로그인"}
        </p>
        <form action="/api/auth/logout" method="POST">
          <button type="submit" className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-700">
            <LogOut size={14} />
            <span>로그아웃</span>
          </button>
        </form>
      </div>
    </nav>
  );
}

export function Sidebar({ userEmail }: { userEmail?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <aside className="hidden print:!hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:sticky md:top-0 md:flex">
        <Brand />
        <NavBody userEmail={userEmail} />
      </aside>

      <div className="sticky top-0 z-40 flex h-14 print:hidden items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:hidden">
        <Link href="/home" className="flex min-w-0 items-center gap-2">
          <span aria-hidden>🛒</span>
          <span className="truncate text-sm font-extrabold text-slate-900">{APP_NAME}</span>
          <span className="rounded-md bg-rose-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-rose-800">{APP_VERSION}</span>
        </Link>
        <button
          type="button"
          aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <div className="relative z-10 flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-2xl">
            <Brand onNavigate={() => setOpen(false)} />
            <NavBody userEmail={userEmail} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
