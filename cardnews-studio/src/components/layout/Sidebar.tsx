"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_VERSION, APP_NAME } from "@/lib/version";
import { 
  LayoutDashboard, 
  Lightbulb, 
  PenLine, 
  Palette, 
  ImageIcon, 
  Download, 
  Layers, 
  KeyRound, 
  LogOut, 
  Menu, 
  X,
  BookOpen
} from "lucide-react";

interface SidebarProps {
  userEmail?: string;
}

// 공식 표준 작업 흐름 (docs/SIDEBAR_LAYOUT_STANDARD.md): 번호는 실제 사용 순서와 같다.
const OVERVIEW_ITEM = { href: "/dashboard", label: "대시보드", icon: LayoutDashboard };
const FLOW_STEPS = [
  { step: 1, href: "/plan", label: "기획", description: "분야·주제·어조·페이지 수", icon: Lightbulb },
  { step: 2, href: "/copy", label: "문구", description: "AI가 쓴 페이지별 문구 다듬기", icon: PenLine },
  { step: 3, href: "/design", label: "디자인", description: "화풍·글자·배치·효과", icon: Palette },
  { step: 4, href: "/background", label: "배경 생성", description: "페이지별 배경 이미지", icon: ImageIcon },
  { step: 5, href: "/export", label: "내보내기", description: "완성 카드 PNG & 인스타 캡션", icon: Download },
];
const UTILITY_ITEMS = [
  { href: "/guide", label: "📖 연동 & 사용 매뉴얼", icon: BookOpen },
  { href: "/settings", label: "API키등록·플랫폼연동", icon: KeyRound }
];

function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="border-b border-[#1f2433] p-5">
      <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-3 group">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-pink-500 via-purple-500 to-amber-500 text-white shadow-md shadow-pink-500/20 transition-transform group-hover:scale-105">
          <Layers size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-100 leading-snug line-clamp-2">{APP_NAME}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="inline-flex items-center px-1.5 py-0.2 text-[10px] font-mono font-medium rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20">
              {APP_VERSION}
            </span>
          </div>
        </div>
      </Link>
      <a className="mt-2.5 block text-xs text-slate-400 hover:text-slate-200 transition-colors" href="https://www.buylife.xyz/programs">
        ← 다른 프로그램 보기
      </a>
    </div>
  );
}

function NavBody({ userEmail, onNavigate }: SidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const OverviewIcon = OVERVIEW_ITEM.icon;
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="flex-1 overflow-y-auto p-3 flex flex-col justify-between">
      <div>
        <Link
          href={OVERVIEW_ITEM.href}
          onClick={onNavigate}
          className={`mb-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
            isActive(OVERVIEW_ITEM.href) 
              ? "bg-purple-500/15 text-purple-300 font-bold border border-purple-500/30 shadow-xs" 
              : "text-slate-400 hover:bg-[#161922] hover:text-slate-200"
          }`}
        >
          <OverviewIcon size={16} className={isActive(OVERVIEW_ITEM.href) ? "text-purple-400" : "text-slate-400"} />
          <span>{OVERVIEW_ITEM.label}</span>
        </Link>

        {/* 핵심 작업 흐름: 원형 번호 배지와 세로 연결선 */}
        <div className="relative pt-1">
          <p className="px-2 mb-2 text-[11px] font-medium text-slate-500 tracking-wider">제작 파이프라인</p>
          {FLOW_STEPS.map(({ step, href, label, description, icon: Icon }, index) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href} onClick={onNavigate} className="group relative flex gap-3 pb-2 transition-all">
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all ${
                      active 
                        ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md shadow-pink-500/20" 
                        : "bg-[#161922] text-slate-400 border border-[#262c3d] group-hover:border-purple-500/40 group-hover:text-slate-200"
                    }`}
                  >
                    {step}
                  </span>
                  {index < FLOW_STEPS.length - 1 && <span className="mt-1 h-6 w-px bg-[#262c3d]" />}
                </div>
                <div className={`flex-1 rounded-lg px-2.5 py-1.5 transition-all ${active ? "bg-[#161922] border border-purple-500/30" : "group-hover:bg-[#161922]/60"}`}>
                  <p className={`flex items-center gap-2 text-sm font-bold ${active ? "text-purple-300" : "text-slate-300"}`}>
                    <Icon size={14} className={active ? "text-pink-400" : "text-slate-400"} />
                    <span>{label}</span>
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{description}</p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* 구분선 아래: 연동/유틸리티 */}
        <div className="mt-2 border-t border-[#1f2433] pt-3 space-y-1">
          <p className="px-2 mb-1.5 text-[11px] font-medium text-slate-500 tracking-wider">도움말 & 설정</p>
          {UTILITY_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                  active 
                    ? "bg-purple-500/15 text-purple-300 font-bold border border-purple-500/30" 
                    : "text-slate-400 hover:bg-[#161922] hover:text-slate-200"
                }`}
              >
                <Icon size={16} className={active ? "text-pink-400" : "text-slate-400"} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 하단: 사용자 이메일과 로그아웃 */}
      <div className="mt-4 border-t border-[#1f2433] pt-3 space-y-1">
        <p className="truncate px-3 py-1.5 text-xs text-slate-500" title={userEmail}>
          {userEmail || "로그인 계정"}
        </p>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-400 hover:bg-[#161922] hover:text-slate-200 transition-colors"
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
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-[#1f2433] bg-[#090b10] md:sticky md:top-0 md:flex select-none">
        <Brand />
        <NavBody userEmail={userEmail} />
      </aside>

      {/* 모바일: 상단 고정 헤더 (h-14) */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 h-14 border-b border-[#1f2433] bg-[#090b10]/95 backdrop-blur-md px-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-pink-500 to-purple-600 text-white">
            <Layers size={15} />
          </div>
          <span className="text-sm font-bold text-slate-100">{APP_NAME}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20">
            {APP_VERSION}
          </span>
        </Link>
        <button
          type="button"
          aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-2 text-slate-300 hover:bg-[#161922] transition-colors"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* 모바일: 슬라이드 오버레이 드로어 메뉴 */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* 어두운 백드롭 */}
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity" 
            onClick={() => setOpen(false)} 
          />
          {/* 슬라이드 드로어 본체 */}
          <div className="relative w-72 max-w-[80vw] h-full bg-[#090b10] border-r border-[#1f2433] flex flex-col z-10 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-[#1f2433]">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-pink-500 to-purple-600 text-white">
                  <Layers size={15} />
                </div>
                <span className="text-sm font-bold text-slate-100">{APP_NAME}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20">
                  {APP_VERSION}
                </span>
              </div>
              <button 
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#161922]"
              >
                <X size={18} />
              </button>
            </div>
            <NavBody userEmail={userEmail} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      {/* 모바일 상단 바 여백 보정용 더미 (컨텐츠 가림 방지) */}
      <div className="md:hidden h-14 w-full shrink-0" />
    </>
  );
}
