"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ExternalLink, LogOut, Menu, X, ShieldCheck, Zap, Activity } from "lucide-react";
import { APP_NAME, APP_VERSION, MAIN_SITE } from "@/lib/version";
import { MENU_GROUPS, TOOLS } from "@/lib/tools";

// 좌측 메뉴(docs/SIDEBAR_LAYOUT_STANDARD.md): 계정·로그아웃은 마지막 메뉴 바로 아래에 붙인다.
function BackLink() {
  return (
    <a className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 hover:text-indigo-600 transition-colors" href={`${MAIN_SITE}/programs`}>
      <span>← 다른 프로그램 보기</span>
      <ExternalLink size={11} />
    </a>
  );
}

function BrandName({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link href="/home" onClick={onNavigate} className="flex min-w-0 items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-sm font-bold text-sm">
        WP
      </div>
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-extrabold text-slate-900 tracking-tight">{APP_NAME}</span>
          <span className="rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-indigo-700">
            {APP_VERSION}
          </span>
        </div>
        <span className="text-[10px] font-medium text-slate-500 tracking-tight">아이템위너 알고리즘 랩</span>
      </div>
    </Link>
  );
}

function NavBody({ userEmail, onNavigate }: { userEmail?: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const item = (href: string) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return `flex items-center gap-2.5 rounded-lg py-2 pl-9 pr-3 text-[13.5px] transition-all ${
      active
        ? "font-bold text-indigo-700 bg-indigo-50/80 border-r-2 border-indigo-600"
        : "font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;
  };

  return (
    <nav className="min-h-0 overflow-y-auto p-2.5 space-y-3" aria-label="프로그램 메뉴">
      <Link
        href="/home"
        onClick={onNavigate}
        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] font-extrabold transition-all ${
          pathname === "/home"
            ? "bg-indigo-600 text-white shadow-sm"
            : "text-slate-900 hover:bg-slate-100"
        }`}
      >
        <Activity size={16} />
        <span>위너 관제 대시보드</span>
      </Link>

      {MENU_GROUPS.map((g) => (
        <div key={g.title} className="space-y-0.5">
          <p className="flex items-center gap-2 px-3 py-1.5 text-[12px] font-extrabold text-slate-400 uppercase tracking-wider">
            <span aria-hidden>{g.emoji}</span>
            <span>{g.title}</span>
          </p>
          {TOOLS.filter((t) => t.group === g.title)
            .sort((a, b) => Number(a.href === "/connect") - Number(b.href === "/connect"))
            .map((t) => (
              <div key={t.href} className={t.href === "/connect" ? "mx-3 mt-1.5 border-t border-slate-200 pt-1.5" : undefined}>
                <Link href={t.href} onClick={onNavigate} className={t.href === "/connect" ? `${item(t.href)} -mx-3` : item(t.href)}>
                  {t.label}
                </Link>
              </div>
            ))}
        </div>
      ))}

      <div className="pt-1">
        <Link href="/guide" onClick={onNavigate} className={item("/guide")}>
          <BookOpen size={15} className="text-indigo-600" />
          <span>연동 & 사용 매뉴얼</span>
        </Link>
      </div>

      {/* 위너 알고리즘 실시간 HUD 상태 카드 */}
      <div className="mx-1 rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5 text-xs">
        <div className="flex items-center justify-between text-emerald-800 font-bold mb-1">
          <span className="flex items-center gap-1">
            <ShieldCheck size={13} className="text-emerald-600" />
            위너 방어 모드
          </span>
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <p className="text-[11px] text-emerald-700">실시간 최저가 추적 활성화됨 (마진 하한 15%)</p>
      </div>

      <div className="mt-2 border-t border-slate-200 pt-2.5">
        <div className="px-3">
          <p className="text-[11px] text-slate-400 font-semibold">로그인 계정</p>
          <p className="truncate font-mono text-xs font-bold text-slate-700" title={userEmail}>
            {userEmail || "회원 로그인"}
          </p>
        </div>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-red-600 transition-colors"
          >
            <LogOut size={14} />
            <span>로그아웃</span>
          </button>
        </form>
      </div>
    </nav>
  );
}

/** WING처럼 맨 위 흰 헤더(데스크톱). 3안의 슬레이트 쿨 화이트 + 인디고 포인트 */
export function TopBar({ userEmail }: { userEmail?: string }) {
  return (
    <header className="sticky top-0 z-40 hidden h-14 items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur px-6 print:hidden md:flex">
      <BrandName />
      <div className="flex items-center gap-4 text-xs text-slate-700">
        <div className="flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50/80 px-2.5 py-1 text-[11px] font-bold text-indigo-700">
          <Zap size={12} className="text-indigo-600" />
          <span>WING 10원 최저가 실시간 매칭 엔진 가동중</span>
        </div>
        <a
          href="https://wing.coupang.com"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-indigo-700 transition-colors"
        >
          <span>쿠팡 WING 열기</span>
          <ExternalLink size={11} />
        </a>
        <Link href="/guide" className="font-semibold text-slate-600 hover:text-indigo-700 transition-colors">
          도움말
        </Link>
        <span className="max-w-48 truncate rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] font-bold text-slate-700" title={userEmail}>
          {userEmail}
        </span>
      </div>
    </header>
  );
}

export function Sidebar({ userEmail }: { userEmail?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <aside className="hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 flex-col border-r border-slate-200 bg-white print:!hidden md:sticky md:top-14 md:flex">
        <div className="border-b border-slate-200 px-4 py-2.5 bg-slate-50/50">
          <BackLink />
        </div>
        <NavBody userEmail={userEmail} />
      </aside>

      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur print:hidden md:hidden">
        <BrandName />
        <button
          type="button"
          aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
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
