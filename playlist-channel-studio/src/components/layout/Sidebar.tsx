"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_VERSION, APP_NAME } from "@/lib/version";
import { ListMusic, FolderOpen, BookOpen, KeyRound, LogOut, Menu, X } from "lucide-react";

interface SidebarProps {
  userEmail?: string;
}

// 공식 표준 작업 흐름 (docs/SIDEBAR_LAYOUT_STANDARD.md): 번호는 실제 사용 순서와 같다.
const FLOW_STEPS = [
  { step: 1, href: "/studio", label: "새 플레이리스트", description: "장르 → 제목 → Suno·가사·설명·썸네일", icon: ListMusic },
  { step: 2, href: "/projects", label: "내 프로젝트", description: "만든 플레이리스트 다시 보기·삭제", icon: FolderOpen },
];
// 표준 메뉴명: 📖 연동 & 사용 매뉴얼 (최상단 메인 지침 표준)
const UTILITY_ITEMS = [
  { href: "/guide", label: "📖 연동 & 사용 매뉴얼", icon: BookOpen },
  { href: "/settings", label: "🔑 API키등록·플랫폼연동", icon: KeyRound },
];

function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="border-b border-slate-800/80 p-5">
      <Link href="/studio" onClick={onNavigate} className="flex items-center gap-3 group">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-[0_0_15px_rgba(6,182,212,0.35)] transition-transform group-hover:scale-105">
          <ListMusic size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white leading-snug line-clamp-2">{APP_NAME}</p>
          <p className="mt-0.5 text-xs text-cyan-400/80 font-mono">{APP_VERSION}</p>
        </div>
      </Link>
      <a className="mt-2.5 block text-xs text-slate-400 hover:text-cyan-400 transition-colors" href="https://www.buylife.xyz/programs">
        ← 다른 프로그램 보기
      </a>
    </div>
  );
}

function NavBody({ userEmail, onNavigate }: SidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="flex-1 overflow-y-auto p-3">
      {/* 핵심 작업 흐름: 원형 번호 배지와 세로 연결선 */}
      <div className="relative">
        {FLOW_STEPS.map(({ step, href, label, description, icon: Icon }, index) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href} onClick={onNavigate} className="group relative flex gap-3 pb-2 transition-all">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all ${
                    active
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                      : "bg-slate-800/80 text-slate-400 border border-slate-700/60 group-hover:bg-slate-800 group-hover:text-slate-200"
                  }`}
                >
                  {step}
                </span>
                {index < FLOW_STEPS.length - 1 && <span className="mt-1 h-6 w-px bg-slate-800" />}
              </div>
              <div
                className={`flex-1 rounded-lg px-2.5 py-1.5 transition-all ${
                  active
                    ? "bg-cyan-950/30 border border-cyan-500/30"
                    : "hover:bg-slate-800/50"
                }`}
              >
                <p className={`flex items-center gap-2 text-sm font-bold ${active ? "text-cyan-300" : "text-slate-300 group-hover:text-white"}`}>
                  <Icon size={15} className={active ? "text-cyan-400" : "text-slate-400"} />
                  <span>{label}</span>
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{description}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* 구분선 아래: 연동/유틸리티 */}
      <div className="mt-2 border-t border-slate-800/80 pt-3 space-y-1">
        {UTILITY_ITEMS.map(({ href, label, icon: Icon }, idx) => {
          const active = isActive(href);
          const isGuide = idx === 0;
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all ${
                active
                  ? isGuide
                    ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                    : "bg-slate-800 text-cyan-300 font-bold border border-slate-700"
                  : isGuide
                  ? "bg-cyan-950/25 text-cyan-400 hover:bg-cyan-950/45 border border-cyan-800/40 font-semibold"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              }`}
            >
              <Icon size={16} className={isGuide ? "text-cyan-400" : active ? "text-cyan-400" : "text-slate-400"} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>

      {/* 하단: 사용자 이메일과 로그아웃 */}
      <div className="mt-3 border-t border-slate-800/80 pt-3 space-y-1">
        <p className="truncate px-3 py-1.5 text-xs text-slate-400 font-mono" title={userEmail}>
          {userEmail || "로그인 계정"}
        </p>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800/60 hover:text-rose-400 transition-colors"
          >
            <LogOut size={16} />
            <span>로그아웃</span>
          </button>
        </form>
      </div>
    </nav>
  );
}

export function Sidebar({ userEmail }: SidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* 데스크톱: 고정 좌측 바 */}
      <aside className="hidden h-screen w-60 shrink-0 flex-col border-r border-slate-800/80 bg-[#0a0f1d] md:sticky md:top-0 md:flex select-none">
        <Brand />
        <NavBody userEmail={userEmail} />
      </aside>

      {/* 모바일: 상단 바 + 펼침 메뉴 (같은 항목·순서) */}
      <div className="md:hidden sticky top-0 z-40 border-b border-slate-800/80 bg-[#0a0f1d]">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/studio" className="text-sm font-bold text-white">
            {APP_NAME} <span className="ml-1 text-xs font-mono font-normal text-cyan-400/80">{APP_VERSION}</span>
          </Link>
          <button
            type="button"
            aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-2 text-slate-300 hover:bg-slate-800/60"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {open && (
          <div className="max-h-[80vh] overflow-y-auto border-t border-slate-800/80 bg-[#0a0f1d]">
            <Brand onNavigate={() => setOpen(false)} />
            <NavBody userEmail={userEmail} onNavigate={() => setOpen(false)} />
          </div>
        )}
      </div>
    </>
  );
}
