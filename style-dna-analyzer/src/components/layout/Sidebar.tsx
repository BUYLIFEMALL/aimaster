"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_VERSION, APP_NAME } from "@/lib/version";
import {
  LayoutDashboard,
  Microscope,
  Wand2,
  FlaskConical,
  Dna,
  KeyRound,
  LogOut,
  Menu,
  X,
  BookOpen,
  Sparkles,
} from "lucide-react";

interface SidebarProps {
  userEmail?: string;
}

// 공식 표준 작업 흐름 (docs/SIDEBAR_LAYOUT_STANDARD.md): 번호는 실제 사용 순서와 같다.
const OVERVIEW_ITEM = { href: "/dashboard", label: "보관함", icon: LayoutDashboard };
const FLOW_STEPS = [
  { step: 1, href: "/analyze", label: "이미지 분석", description: "카메라·조명·색상·스타일 → 마스터 프롬프트", icon: Microscope },
  { step: 2, href: "/refine", label: "프롬프트 보정", description: "피드백으로 프롬프트 미세 조정", icon: Wand2 },
  { step: 3, href: "/test", label: "결과 테스트", description: "프롬프트로 이미지 생성·원본과 비교", icon: FlaskConical },
];

const UTILITY_ITEMS = [
  { href: "/guide", label: "📖 연동 & 사용 매뉴얼", icon: BookOpen, isGuide: true },
  { href: "/settings", label: "🔑 API키등록·플랫폼연동", icon: KeyRound, isGuide: false },
];

function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="border-b border-[#222d42] p-5 bg-[#0c0f17]">
      <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-3 group">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-violet-600 text-white shadow-lg shadow-cyan-500/20 transition-transform group-hover:scale-105">
          <Dna size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-[#f8fafc] leading-snug line-clamp-1">{APP_NAME}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded">
              {APP_VERSION}
            </span>
            <span className="text-[10px] text-violet-400 font-semibold tracking-wider">DNA LAB</span>
          </div>
        </div>
      </Link>
      <a
        className="mt-3.5 block text-xs text-slate-400 hover:text-cyan-400 transition-colors font-medium"
        href="https://www.buylife.xyz/programs"
      >
        <span>← 다른 프로그램 보기</span>
      </a>
    </div>
  );
}

function NavBody({ userEmail, onNavigate }: SidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const OverviewIcon = OVERVIEW_ITEM.icon;
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="flex-1 flex flex-col justify-between overflow-y-auto p-3.5 bg-[#0c0f17]">
      <div className="space-y-1.5">
        <Link
          href={OVERVIEW_ITEM.href}
          onClick={onNavigate}
          className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all ${
            isActive(OVERVIEW_ITEM.href)
              ? "bg-[#182030] text-cyan-400 border border-cyan-500/30 shadow-xs"
              : "text-slate-300 hover:bg-[#131824] hover:text-white"
          }`}
        >
          <OverviewIcon size={16} className={isActive(OVERVIEW_ITEM.href) ? "text-cyan-400" : "text-slate-400"} />
          <span>{OVERVIEW_ITEM.label}</span>
        </Link>

        {/* 핵심 작업 흐름: 원형 번호 배지와 세로 연결선 */}
        <div className="pt-2">
          <p className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            작업 워크플로우
          </p>
          <div className="relative pt-1">
            {FLOW_STEPS.map(({ step, href, label, description, icon: Icon }, index) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  className="group relative flex gap-3 pb-3 transition-all"
                >
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                        active
                          ? "bg-gradient-to-br from-cyan-500 to-violet-600 text-white shadow-md shadow-cyan-500/30 ring-4 ring-cyan-500/20"
                          : "bg-[#182030] text-slate-400 group-hover:bg-[#222d42] group-hover:text-slate-200"
                      }`}
                    >
                      {step}
                    </span>
                    {index < FLOW_STEPS.length - 1 && <span className="mt-1 h-7 w-px bg-[#222d42]" />}
                  </div>
                  <div
                    className={`flex-1 rounded-xl px-3 py-2 transition-all ${
                      active
                        ? "bg-[#131824] border border-cyan-500/40 shadow-sm"
                        : "hover:bg-[#131824]/60 border border-transparent"
                    }`}
                  >
                    <p
                      className={`flex items-center gap-1.5 text-xs font-bold ${
                        active ? "text-white" : "text-slate-300"
                      }`}
                    >
                      <Icon size={14} className={active ? "text-cyan-400" : "text-slate-500"} />
                      <span>{label}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* 구분선 아래: 매뉴얼 & 연동/유틸리티 */}
        <div className="mt-3 border-t border-[#222d42] pt-3 space-y-1">
          {UTILITY_ITEMS.map(({ href, label, icon: Icon, isGuide }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all border ${
                  active
                    ? isGuide
                      ? "bg-amber-500/10 text-amber-300 border-amber-500/30 font-bold"
                      : "bg-[#182030] text-cyan-400 border-cyan-500/30 font-bold"
                    : isGuide
                    ? "text-slate-300 hover:bg-[#182030] hover:text-amber-300 border-transparent hover:border-[#222d42]"
                    : "text-slate-300 hover:bg-[#182030] hover:text-cyan-400 border-transparent hover:border-[#222d42]"
                }`}
              >
                <Icon size={15} className={isGuide ? "text-amber-400" : "text-cyan-400"} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 하단 고정: 사용자 이메일과 로그아웃 */}
      <div className="mt-6 border-t border-[#222d42] pt-4 space-y-2">
        <div className="px-3 py-2 bg-[#131824] rounded-xl border border-[#222d42]">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">로그인 계정</p>
          <p className="truncate text-xs font-bold text-slate-200" title={userEmail}>
            {userEmail || "회원"}
          </p>
        </div>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-rose-950/40 hover:text-rose-400 transition-colors"
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
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* 데스크톱: 고정 좌측 바 (md:w-64) */}
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-[#222d42] bg-[#0c0f17] md:sticky md:top-0 md:flex select-none z-30">
        <Brand />
        <NavBody userEmail={userEmail} />
      </aside>

      {/* 모바일: 상단 바 + 펼침 메뉴 */}
      <div className="md:hidden sticky top-0 z-40 border-b border-[#222d42] bg-[#0c0f17]">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-cyan-600 to-violet-600 text-white shadow-xs">
              <Dna size={15} />
            </div>
            <span className="text-sm font-extrabold text-[#f8fafc]">{APP_NAME}</span>
            <span className="text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded">
              {APP_VERSION}
            </span>
          </Link>
          <button
            type="button"
            aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-2 text-slate-300 hover:bg-[#182030]"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {open && (
          <div className="max-h-[85vh] overflow-y-auto border-t border-[#222d42] bg-[#0c0f17]">
            <Brand onNavigate={() => setOpen(false)} />
            <NavBody userEmail={userEmail} onNavigate={() => setOpen(false)} />
          </div>
        )}
      </div>
    </>
  );
}
