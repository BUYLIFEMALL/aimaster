"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_VERSION, APP_NAME } from "@/lib/version";
import { Music2, Cpu, KeyRound, LogOut, Menu, X, BookOpen, ExternalLink, Library, Upload, ListOrdered, Home, Clapperboard, Images } from "lucide-react";
import { SidebarCollections } from "./SidebarCollections";
import { activeCount } from "@/lib/engine";
import { useQueue } from "@/components/engine/useQueue";
import { NewVersionNotice } from "./NewVersionNotice";

interface SidebarProps {
  userEmail?: string;
}

// 공식 표준 작업 흐름 (docs/SIDEBAR_LAYOUT_STANDARD.md): 번호는 실제 사용 순서와 같다.
const FLOW_STEPS = [
  { step: 1, href: "/songs", label: "곡 만들기", description: "가사·스타일 쓰기 & AI 작사", icon: Music2 },
  { step: 2, href: "/queue", label: "작업 대기열", description: "쌓아 둔 작업을 차례로 만들기", icon: ListOrdered },
  { step: 3, href: "/library", label: "모든 음악", description: "만든 노래 다시 듣기·내려받기", icon: Library },
  { step: 4, href: "/import", label: "가져온 음악", description: "내 음원으로 커버·부분 수정", icon: Upload },
  // 앨범은 음악을 만든 뒤 표지를 꾸미는 단계라 영상 만들기 바로 앞으로(2026-11-08 주인님 그림 지시)
  { step: 5, href: "/albums", label: "음악앨범", description: "앨범 그림 만들기·모아 두기", icon: Images },
  { step: 6, href: "/video", label: "영상 만들기", description: "플레이리스트 유튜브 영상(MP4)", icon: Clapperboard },
  // 엔진은 처음 한 번 연결하고 나면 자주 가지 않아 맨 아래로(2026-11-07 주인님 「위치 이동시켜줘」)
  { step: 7, href: "/engine", label: "내 PC 엔진", description: "키 없이 내 PC에서 노래 생성", icon: Cpu },
];

const UTILITY_ITEMS = [
  { href: "/settings", label: "🔑 API키등록·플랫폼연동", icon: KeyRound },
  { href: "/guide", label: "📖 연동 & 사용 매뉴얼", icon: BookOpen },
];

function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="border-b border-[#1e293b] p-5">
      <Link href="/home" onClick={onNavigate} className="flex items-center gap-3 group">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-600 to-rose-500 text-white shadow-lg shadow-emerald-500/20 transition-transform group-hover:scale-105">
          <Music2 size={20} className="text-white" />
          <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-400 text-[8px] font-bold text-black ring-2 ring-[#0a0e1a]">
            ▶
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-bold text-white leading-snug truncate tracking-tight">{APP_NAME}</p>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {/* 버전은 크고 밝게(2026-11-04 주인님 「버전 표시 잘보이게 해줘」) */}
            <span className="inline-flex items-center rounded-md bg-emerald-400 px-2 py-0.5 text-xs font-mono font-extrabold text-[#062018] shadow-sm shadow-emerald-500/30">
              {APP_VERSION}
            </span>
            <span className="text-[10px] text-teal-400 font-mono tracking-wider">LOCAL ENGINE</span>
          </div>
        </div>
      </Link>
      <a
        className="mt-3 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-300 transition-colors"
        href="https://www.buylife.xyz/programs"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span>← 다른 프로그램 보기</span>
        <ExternalLink size={11} className="opacity-70" />
      </a>
      <NewVersionNotice />
    </div>
  );
}

function NavBody({ userEmail, onNavigate, queued = 0 }: SidebarProps & { onNavigate?: () => void; queued?: number }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || (href !== "/songs" && pathname.startsWith(`${href}/`));

  return (
    <nav className="min-h-0 shrink overflow-y-auto p-3 flex flex-col">
      <div>
        {/* 네온 콘솔 헤더 라벨 */}
        <div className="px-2 pt-1 pb-2 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Music Pipeline</p>
          <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-xs shadow-emerald-400" />
        </div>

        {/* 홈(원본 boks-music 첫 화면) */}
        <Link
          href="/home"
          onClick={onNavigate}
          className={`mb-1 flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
            isActive("/home") ? "border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 to-teal-950/30 text-emerald-200" : "text-slate-200 hover:bg-[#0e1424]"
          }`}
        >
          <Home size={15} className={isActive("/home") ? "text-emerald-400" : "text-slate-400"} />
          <span>홈</span>
        </Link>

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
                        ? "bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400/40"
                        : "bg-[#0e1424] text-slate-400 border border-[#1e293b] group-hover:border-emerald-500/40 group-hover:text-slate-200"
                    }`}
                  >
                    0{step}
                  </span>
                  {index < FLOW_STEPS.length - 1 && <span className="mt-1 h-5 w-px bg-[#1e293b]" />}
                </div>
                <div
                  className={`flex-1 rounded-xl px-2.5 py-1.5 transition-all ${
                    active
                      ? "bg-gradient-to-r from-emerald-950/40 to-teal-950/30 border border-emerald-500/30 text-white shadow-xs"
                      : "group-hover:bg-[#0e1424] text-slate-300"
                  }`}
                >
                  <p className={`flex items-center gap-1.5 text-xs font-bold ${active ? "text-emerald-200" : "text-slate-200"}`}>
                    <Icon size={14} className={active ? "text-emerald-400" : "text-slate-400"} />
                    <span>{label}</span>
                    {href === "/queue" && queued > 0 && (
                      <span className="ml-auto rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-black" aria-label={`대기·진행 ${queued}개`}>
                        {queued}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{description}</p>
                </div>
              </Link>
            );
          })}
        </div>

        <SidebarCollections onNavigate={onNavigate} />

        {/* 구분선 아래: 연동/유틸리티 */}
        <div className="mt-4 border-t border-[#1e293b] pt-3">
          <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Settings</p>
          <div className="space-y-1">
            {UTILITY_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                  isActive(href)
                    ? "bg-gradient-to-r from-teal-950/60 to-emerald-950/40 border border-teal-500/40 text-teal-200 font-bold shadow-xs"
                    : "text-slate-400 hover:bg-[#0e1424] hover:text-slate-200"
                }`}
              >
                <Icon size={15} className={isActive(href) ? "text-teal-400" : "text-slate-400"} />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* 하단: 사용자 이메일과 로그아웃 */}
      <div className="mt-6 border-t border-[#1e293b] pt-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#080c14] border border-[#1e293b] mb-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-xs shadow-emerald-400" />
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
  // 대기열 확인은 여기 한 곳에서 — 어느 화면에 있든 끝난 곡을 「모든 음악」에 기록하고 개수를 보여 준다.
  const queued = activeCount(useQueue().jobs);

  return (
    <>
      {/* 데스크톱: 고정 좌측 네온 앰프 콘솔 사이드바 (w-64) */}
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-[#1e293b] bg-[#0a0e1a] md:sticky md:top-0 md:flex select-none">
        <Brand />
        <NavBody userEmail={userEmail} queued={queued} />
      </aside>

      {/* 모바일: 56px 상단 슬림 헤더 (sticky top-0 z-40) */}
      <div className="md:hidden sticky top-0 z-40 h-14 flex items-center justify-between px-4 border-b border-[#1e293b] bg-[#0a0e1a]/95 backdrop-blur-md">
        <Link href="/home" className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-emerald-500 via-teal-600 to-rose-500 text-white shadow-xs">
            <Music2 size={15} />
          </div>
          <span className="text-sm font-bold text-white truncate tracking-tight">{APP_NAME}</span>
          <span className="shrink-0 rounded-md bg-emerald-400 px-2 py-0.5 text-xs font-mono font-extrabold text-[#062018]">{APP_VERSION}</span>
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
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-600 to-rose-500 text-white">
                  <Music2 size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{APP_NAME}</p>
                  <p className="mt-0.5 inline-block rounded bg-emerald-400 px-1.5 text-xs font-mono font-extrabold text-[#062018]">{APP_VERSION}</p>
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

            <NavBody userEmail={userEmail} queued={queued} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
