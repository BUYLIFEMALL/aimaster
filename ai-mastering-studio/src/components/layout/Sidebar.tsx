"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_VERSION, APP_NAME } from "@/lib/version";
import { AudioWaveform, BookOpen, KeyRound, LogOut, Menu, X, Sparkles, SlidersHorizontal, Download } from "lucide-react";

interface SidebarProps {
  userEmail?: string;
}

const FLOW_STEPS = [
  { step: 1, href: "/studio#upload", label: "마스터 WAV 올리기", description: "고음질 WAV 파일 일괄 업로드", icon: AudioWaveform },
  { step: 2, href: "/studio#rack", label: "프로필 & 랙 튜닝", description: "12종 사운드 프로필 및 5대 랙", icon: SlidersHorizontal },
  { step: 3, href: "/studio#render", label: "일괄 렌더 & 저장", description: "무손실 WAV / ZIP 다운로드", icon: Download },
];

const UTILITY_ITEMS = [
  { href: "/settings", label: "API키등록·플랫폼연동", icon: KeyRound },
];

function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="border-b border-[#1e293b] p-5">
      <Link href="/studio" onClick={onNavigate} className="flex items-center gap-3 group">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#00f0ff] via-[#8b5cf6] to-[#f59e0b] text-[#060911] font-extrabold shadow-md transition-transform group-hover:scale-105">
          <AudioWaveform size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-100 leading-snug line-clamp-1">{APP_NAME}</p>
          <p className="mt-0.5 inline-block text-[10px] text-[#00f0ff] bg-[#00f0ff]/10 border border-[#00f0ff]/20 px-1.5 py-0.5 rounded font-mono font-bold">
            {APP_VERSION} MASTER CONSOLE
          </p>
        </div>
      </Link>
      <a className="mt-3 block text-xs text-slate-400 hover:text-[#00f0ff] transition-colors" href="https://www.buylife.xyz/programs">
        ← 다른 프로그램 보기
      </a>
    </div>
  );
}

function NavBody({ userEmail, onNavigate }: SidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || (href !== "/studio" && pathname.startsWith(`${href}/`));

  return (
    <nav className="min-h-0 shrink overflow-y-auto p-3">
      {/* 핵심 작업 흐름: 원형 번호 배지와 세로 연결선 */}
      <div className="relative">
        <p className="px-2 pb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">Mastering Flow</p>
        {FLOW_STEPS.map(({ step, href, label, description, icon: Icon }, index) => {
          const active = pathname === "/studio";
          return (
            <Link key={href} href={href} onClick={onNavigate} className="group relative flex gap-3 pb-2 transition-all">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    active
                      ? "bg-gradient-to-br from-[#00f0ff] to-[#0284c7] text-[#060911] shadow-sm font-black"
                      : "bg-[#131b2e] text-slate-400 group-hover:bg-[#1a233a] border border-[#1e293b]"
                  }`}
                >
                  {step}
                </span>
                {index < FLOW_STEPS.length - 1 && <span className="mt-1 h-6 w-px bg-[#1e293b]" />}
              </div>
              <div className={`flex-1 rounded-lg px-2.5 py-1.5 transition-all ${active ? "bg-[#00f0ff]/10 border border-[#00f0ff]/20" : "hover:bg-[#131b2e]"}`}>
                <p className={`flex items-center gap-2 text-sm font-bold ${active ? "text-[#00f0ff]" : "text-slate-200"}`}>
                  <Icon size={15} />
                  <span>{label}</span>
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{description}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* 구분선 아래: 연동/유틸리티 */}
      <div className="mt-2 border-t border-[#1e293b] pt-3 space-y-1.5">
        <p className="px-2 pb-1 text-[11px] font-bold tracking-wider text-slate-400 uppercase">Guide & Settings</p>
        
        {/* 사용 매뉴얼 (골드 하이라이트 배지) */}
        <Link
          href="/guide"
          onClick={onNavigate}
          className={`flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-all ${
            pathname === "/guide"
              ? "bg-[#f59e0b]/15 text-[#fbbf24] font-bold border border-[#f59e0b]/30"
              : "text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20"
          }`}
        >
          {/* 아이콘과 📖 이모지가 겹쳐 두 줄로 꺾이던 것 → 이모지 빼고 한 줄 고정(2026-10-23) */}
          <BookOpen size={16} className="shrink-0" />
          <span className="truncate">연동 & 사용 매뉴얼</span>
          <span className="ml-auto shrink-0 text-[10px] bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black px-1.5 py-0.5 rounded">
            GUIDE
          </span>
        </Link>

        {UTILITY_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
              isActive(href)
                ? "bg-[#00f0ff]/10 text-[#00f0ff] font-bold border border-[#00f0ff]/20"
                : "text-slate-300 hover:bg-[#131b2e] hover:text-white"
            }`}
          >
            <Icon size={16} />
            <span>{label}</span>
          </Link>
        ))}
      </div>

      {/* 하단: 사용자 이메일과 로그아웃 */}
      <div className="mt-4 border-t border-[#1e293b] pt-3 space-y-1">
        <p className="truncate px-3 py-1.5 text-xs text-slate-400" title={userEmail}>
          {userEmail || "로그인 계정"}
        </p>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
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
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* 데스크톱 사이드바 (md 이상) */}
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:border-[#1e293b] md:bg-[#0b0f19]">
        <Brand />
        <NavBody userEmail={userEmail} />
      </aside>

      {/* 모바일 상단 바 (md 미만) */}
      <header className="flex h-14 items-center justify-between border-b border-[#1e293b] bg-[#0b0f19] px-4 md:hidden">
        <Link href="/studio" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#00f0ff] to-[#8b5cf6] text-[#060911]">
            <AudioWaveform size={16} />
          </div>
          <span className="text-sm font-bold text-slate-100">{APP_NAME}</span>
          <span className="text-[10px] text-[#00f0ff] bg-[#00f0ff]/10 px-1 rounded">{APP_VERSION}</span>
        </Link>
        <button
          type="button"
          aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"}
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2 text-slate-300 hover:bg-[#131b2e]"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* 모바일 오버레이 드로어 */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setMobileOpen(false)} />
          <div className="relative flex w-4/5 max-w-xs flex-1 flex-col bg-[#0b0f19] border-r border-[#1e293b]">
            <div className="flex items-center justify-between p-4 border-b border-[#1e293b]">
              <span className="text-sm font-bold text-slate-100">메뉴</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-[#131b2e]"
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
