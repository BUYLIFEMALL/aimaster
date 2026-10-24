"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Clapperboard, Film, KeyRound, Layers, LogOut, Menu, X, Sparkles } from "lucide-react";
import { APP_VERSION } from "@/lib/version";
import { signOutAction } from "@/lib/actions/auth";

// 헐리우드 네온 사이버 스튜디오 스타일 네비게이션 아이템
const MAIN_ITEMS = [
  { 
    href: "/create", 
    icon: Clapperboard, 
    badgeIcon: "🎬",
    label: "영상 생성 작업실", 
    description: "텍스트·사진 한 장으로 고화질 AI 영상 렌더링",
    badge: "3초 완성",
    badgeColor: "border-pink-500/40 bg-pink-500/10 text-pink-300"
  },
  { 
    href: "/edit", 
    icon: Layers, 
    badgeIcon: "✂️",
    label: "영상 합치기 & 믹싱", 
    description: "클립·배경음악·자막 원클릭 믹싱 (내 PC 무료)",
    badge: "무제한",
    badgeColor: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
  },
  { 
    href: "/library", 
    icon: Film, 
    badgeIcon: "🏆",
    label: "작업 결과 갤러리", 
    description: "완성 비디오 감상 및 4K 고화질 다운로드",
    badge: "30일 보관",
    badgeColor: "border-amber-500/40 bg-amber-500/10 text-amber-300"
  },
  { 
    href: "/prompts", 
    icon: Sparkles, 
    badgeIcon: "💡",
    label: "영상 프롬프트 게시판", 
    description: "바로 쓰는 헐리우드 시네마 명장면 24선",
    badge: "원클릭 복사",
    badgeColor: "border-rose-500/40 bg-rose-500/10 text-rose-300"
  },
];

const UTILITY_ITEMS = [
  { href: "/guide", icon: BookOpen, badgeIcon: "📖", label: "3분 비주얼 매뉴얼" },
  { href: "/settings", icon: KeyRound, badgeIcon: "🔑", label: "API키 & 플랫폼 연동" },
];

function BrandMark() {
  return (
    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 via-rose-600 to-cyan-500 text-white shadow-lg shadow-pink-500/30">
      <Clapperboard size={20} className="drop-shadow" aria-hidden="true" />
      <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-[9px] font-black text-slate-950 shadow">
        AI
      </span>
    </span>
  );
}

function Version() {
  return (
    <div className="mt-1 flex items-center gap-1.5">
      <span className="inline-flex items-center gap-1 rounded-full border border-pink-500/30 bg-pink-500/10 px-2 py-0.5 text-[10px] font-bold text-pink-300">
        <span className="h-1.5 w-1.5 rounded-full bg-pink-400 pulse-rec" />
        {APP_VERSION}
      </span>
      <span className="inline-flex rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
        CYBER STUDIO
      </span>
    </div>
  );
}

function NavBody({ userEmail, onNavigate }: { userEmail: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-3">
      <nav aria-label="사이버 영상 스튜디오 메뉴">
        <div className="mb-2 flex items-center justify-between px-2">
          <p className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
            🎬 STUDIO WORKSPACE
          </p>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400">
            <span className="h-2 w-2 rounded-full bg-rose-500 pulse-rec" />
            LIVE
          </span>
        </div>

        <div className="space-y-1.5">
          {MAIN_ITEMS.map(({ href, label, description, badge, badgeColor }) => {
            const isActive = active(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                className={`group block rounded-xl border p-2.5 transition-all duration-200 ${
                  isActive
                    ? "border-pink-500/50 bg-gradient-to-r from-pink-500/20 via-purple-500/10 to-cyan-500/10 shadow-lg shadow-pink-500/10"
                    : "border-transparent bg-slate-900/40 hover:border-slate-700/60 hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <p className={`flex items-center gap-2 text-sm font-bold ${isActive ? "text-white" : "text-slate-200 group-hover:text-white"}`}>
                    <span className="text-base" aria-hidden="true">
                      {href === "/create" ? "🎬" : href === "/edit" ? "✂️" : href === "/library" ? "🏆" : "💡"}
                    </span>
                    {label}
                  </p>
                  <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${badgeColor}`}>
                    {badge}
                  </span>
                </div>
                <p className="mt-1 pl-6 text-[11px] leading-snug text-slate-400 group-hover:text-slate-300">
                  {description}
                </p>
              </Link>
            );
          })}
        </div>

        <div className="mt-4 space-y-1 border-t border-slate-800/80 pt-3">
          <p className="mb-2 px-2 text-[11px] font-bold tracking-wider uppercase text-slate-400">
            ⚡ SUPPORT & TOOLS
          </p>
          {UTILITY_ITEMS.map(({ href, badgeIcon, label }) => {
            const isActive = active(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                  isActive
                    ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-200 shadow-md shadow-cyan-500/10"
                    : "border-transparent text-slate-300 hover:border-slate-700/60 hover:bg-slate-800/50 hover:text-white"
                }`}
              >
                <span className="text-sm">{badgeIcon}</span>
                <span className="whitespace-nowrap">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* 계정 정보 카드 */}
      <div className="mt-4 rounded-xl border border-slate-800/80 bg-slate-900/60 p-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-pink-500/20 text-xs font-bold text-pink-300 border border-pink-500/30">
            👤
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-slate-400">스튜디오 크리에이터</p>
            <p className="truncate text-xs font-bold text-slate-200" title={userEmail}>
              {userEmail || "로그인 계정"}
            </p>
          </div>
        </div>
        <form action={signOutAction} className="mt-2 pt-2 border-t border-slate-800/80">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-800/60 py-1.5 text-xs font-bold text-slate-400 transition-colors hover:bg-rose-500/20 hover:text-rose-300"
          >
            <LogOut size={13} aria-hidden="true" />
            <span>로그아웃</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export function Sidebar({ userEmail = "" }: { userEmail?: string }) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const close = () => setOpen(false);

  return (
    <>
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-slate-800/80 bg-[#0b0d1b]/95 backdrop-blur-md md:sticky md:top-0 md:flex">
        <div className="shrink-0 border-b border-slate-800/80 p-4">
          <Link href="/create" className="flex items-center gap-3">
            <BrandMark />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                AI 영상 스튜디오
              </p>
              <Version />
            </div>
          </Link>
          <a
            href="https://www.buylife.xyz/programs"
            className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 transition-colors hover:text-cyan-300"
          >
            <span>←</span> AIMaster 프로그램 전체보기
          </a>
        </div>
        <NavBody userEmail={userEmail} />
      </aside>

      {/* 모바일 상단 바 */}
      <div
        className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#0b0d1b]/95 backdrop-blur-md md:hidden"
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) {
            close();
            toggle.current?.focus();
          }
        }}
      >
        <div className="flex h-14 items-center justify-between gap-2 px-4">
          <Link href="/create" onClick={close} className="flex min-w-0 items-center gap-2">
            <BrandMark />
            <span className="truncate text-sm font-black text-white">AI 영상 스튜디오</span>
            <Version />
          </Link>
          <button
            ref={toggle}
            type="button"
            aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="shrink-0 rounded-lg p-2 text-slate-300 hover:bg-slate-800"
          >
            {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
        <div id="cyber-studio-mobile-menu" hidden={!open} className="max-h-[calc(100dvh-56px)] overflow-y-auto">
          <a
            href="https://www.buylife.xyz/programs"
            className="mx-5 mt-3 block text-xs font-bold text-slate-400 hover:text-cyan-300"
          >
            ← AIMaster 프로그램 전체보기
          </a>
          <NavBody userEmail={userEmail} onNavigate={close} />
        </div>
      </div>
    </>
  );
}
