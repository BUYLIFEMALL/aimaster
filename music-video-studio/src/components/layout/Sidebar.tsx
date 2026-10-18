"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_VERSION, APP_NAME } from "@/lib/version";
import { Music2, FileText, Clapperboard, Film, KeyRound, LogOut, Menu, X, BookOpen, ExternalLink, Disc, Sparkles } from "lucide-react";

interface SidebarProps {
  userEmail?: string;
}

// 공식 표준 작업 흐름 (docs/SIDEBAR_LAYOUT_STANDARD.md): 번호는 실제 사용 순서와 같다.
const FLOW_STEPS = [
  { step: 1, href: "/music", label: "음악·가사 기획", description: "주제·장르 가사 & Suno 스타일", icon: FileText },
  { step: 2, href: "/storyboard", label: "스토리보드 분할", description: "가사 타임코드별 장면 기획", icon: Clapperboard },
  { step: 3, href: "/scenes", label: "장면 영상 제작", description: "장면 이미지 & Veo 영상 렌더링", icon: Film },
];

const UTILITY_ITEMS = [
  { href: "/settings", label: "🔑 API키등록·플랫폼연동", icon: KeyRound },
  { href: "/guide", label: "📖 연동 & 사용 매뉴얼", icon: BookOpen },
];

function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="border-b border-[#1e293b] p-5">
      <Link href="/music" onClick={onNavigate} className="flex items-center gap-3 group">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 via-purple-600 to-rose-500 text-white shadow-lg shadow-cyan-500/20 transition-transform group-hover:scale-105">
          <Clapperboard size={20} className="text-white" />
          <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-cyan-400 text-[8px] font-bold text-black ring-2 ring-[#0a0e1a]">
            ▶
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-bold text-white leading-snug truncate tracking-tight">{APP_NAME}</p>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="inline-flex items-center rounded-md bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-cyan-400 border border-cyan-500/25">
              {APP_VERSION}
            </span>
            <span className="text-[10px] text-purple-400 font-mono tracking-wider">NEON DECK</span>
          </div>
        </div>
      </Link>
      <a
        className="mt-3 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-300 transition-colors"
        href="https://www.buylife.xyz/programs"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span>← 다른 프로그램 보기</span>
        <ExternalLink size={11} className="opacity-70" />
      </a>
    </div>
  );
}

function NavBody({ userEmail, onNavigate }: SidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || (href !== "/music" && pathname.startsWith(`${href}/`));

  return (
    <nav className="flex-1 overflow-y-auto p-3 flex flex-col justify-between">
      <div>
        {/* 네온 콘솔 헤더 라벨 */}
        <div className="px-2 pt-1 pb-2 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Rackmount Pipeline</p>
          <span className="flex h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse shadow-xs shadow-cyan-400" />
        </div>

        {/* 핵심 작업 흐름: 앰프 데크 원형/사각 스텝퍼 */}
        <div className="relative space-y-1">
          {FLOW_STEPS.map(({ step, href, label, description, icon: Icon }, index) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                className="group relative flex gap-3 p-2 rounded-xl transition-all"
              >
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold font-mono transition-all ${
                      active
                        ? "bg-gradient-to-tr from-cyan-500 to-purple-600 text-white shadow-md shadow-cyan-500/30 ring-2 ring-cyan-400/40"
                        : "bg-[#0e1424] text-slate-400 border border-[#1e293b] group-hover:border-cyan-500/40 group-hover:text-slate-200"
                    }`}
                  >
                    0{step}
                  </span>
                  {index < FLOW_STEPS.length - 1 && <span className="mt-1 h-5 w-px bg-[#1e293b]" />}
                </div>
                <div
                  className={`flex-1 rounded-xl px-2.5 py-1.5 transition-all ${
                    active
                      ? "bg-gradient-to-r from-cyan-950/40 to-purple-950/30 border border-cyan-500/30 text-white shadow-xs"
                      : "group-hover:bg-[#0e1424] text-slate-300"
                  }`}
                >
                  <p className={`flex items-center gap-1.5 text-xs font-bold ${active ? "text-cyan-200" : "text-slate-200"}`}>
                    <Icon size={14} className={active ? "text-cyan-400" : "text-slate-400"} />
                    <span>{label}</span>
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{description}</p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* 구분선 아래: 연동/유틸리티 */}
        <div className="mt-4 border-t border-[#1e293b] pt-3">
          <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Console Deck Control</p>
          <div className="space-y-1">
            {UTILITY_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                  isActive(href)
                    ? "bg-gradient-to-r from-purple-950/60 to-cyan-950/40 border border-purple-500/40 text-purple-200 font-bold shadow-xs"
                    : "text-slate-400 hover:bg-[#0e1424] hover:text-slate-200"
                }`}
              >
                <Icon size={15} className={isActive(href) ? "text-purple-400" : "text-slate-400"} />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* 하단: 사용자 이메일과 로그아웃 */}
      <div className="mt-6 border-t border-[#1e293b] pt-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#080c14] border border-[#1e293b] mb-2">
          <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-xs shadow-cyan-400" />
          <p className="truncate text-[11px] text-slate-400 font-mono" title={userEmail}>
            {userEmail || "회원 로그인"}
          </p>
        </div>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-400 hover:bg-rose-950/30 hover:text-rose-300 hover:border hover:border-rose-900/40 transition-colors"
          >
            <LogOut size={14} />
            <span>로그아웃</span>
          </button>
        </form>
      </div>
    </nav>
  );
}

export function Sidebar({ userEmail }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* 데스크톱: 고정 좌측 네온 앰프 콘솔 사이드바 (w-64) */}
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-[#1e293b] bg-[#0a0e1a] md:sticky md:top-0 md:flex select-none">
        <Brand />
        <NavBody userEmail={userEmail} />
      </aside>

      {/* 모바일: 56px 상단 슬림 헤더 (sticky top-0 z-40) */}
      <div className="md:hidden sticky top-0 z-40 h-14 flex items-center justify-between px-4 border-b border-[#1e293b] bg-[#0a0e1a]/95 backdrop-blur-md">
        <Link href="/music" className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-cyan-500 via-purple-600 to-rose-500 text-white shadow-xs">
            <Clapperboard size={15} />
          </div>
          <span className="text-sm font-bold text-white truncate tracking-tight">{APP_NAME}</span>
          <span className="rounded-md bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-mono text-cyan-400 border border-cyan-500/25">
            {APP_VERSION}
          </span>
        </Link>
        <button
          type="button"
          aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"}
          onClick={() => setMobileOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#1e293b] bg-[#0e1424] text-slate-300 hover:text-white transition-colors"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* 모바일: 슬라이딩 드로어 메뉴 & 백드롭 오버레이 */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* 백드롭 */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />

          {/* 슬라이딩 드로어 */}
          <div className="relative z-10 flex h-full w-72 max-w-[80vw] flex-col bg-[#0a0e1a] border-r border-[#1e293b] shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between border-b border-[#1e293b] p-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 via-purple-600 to-rose-500 text-white">
                  <Clapperboard size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{APP_NAME}</p>
                  <p className="text-[10px] font-mono text-cyan-400">{APP_VERSION}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-[#0e1424]"
              >
                <X size={18} />
              </button>
            </div>

            <NavBody userEmail={userEmail} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
