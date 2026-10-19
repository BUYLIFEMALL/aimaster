"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";
import { APP_VERSION } from "@/lib/version";
import { 
  Play, 
  Search, 
  FileText, 
  Image as ImageIcon, 
  Music, 
  Video, 
  Key, 
  BookOpen, 
  LogOut, 
  Menu, 
  X,
  ExternalLink
} from "lucide-react";

const FLOW_STEPS = [
  {
    step: 1,
    href: "/candidates",
    icon: Search,
    label: "최신 쇼츠 주제 수집",
    description: "URL·RSS·Perplexity 실시간 수집",
  },
  {
    step: 2,
    href: "/scripts",
    icon: FileText,
    label: "영상스크립트 생성",
    description: "스토리·6장면 대사·프롬프트",
  },
  {
    step: 3,
    href: "/images",
    icon: ImageIcon,
    label: "장면 이미지 생성",
    description: "나노바나나 9:16 비주얼 렌더",
  },
  {
    step: 4,
    href: "/music",
    icon: Music,
    label: "Suno 배경음악",
    description: "장르별 AI 고화질 BGM 생성",
  },
  {
    step: 5,
    href: "/videos",
    icon: Video,
    label: "영상 포스팅",
    description: "렌더링 후 유튜브/인스타 업로드",
  },
];

const UTILITY_ITEMS = [
  { 
    href: "/guide", 
    icon: BookOpen, 
    label: "연동 & 사용 매뉴얼", 
    badge: "가이드북",
    highlight: true 
  },
  { 
    href: "/settings", 
    icon: Key, 
    label: "API키등록·플랫폼연동",
    badge: null,
    highlight: false
  },
];

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* 모바일 상단 유튜브 다크 헤더 (767px 이하) */}
      <div className="flex h-16 w-full items-center justify-between border-b border-[#282828] bg-[#181818] px-4 md:hidden sticky top-0 z-40 shadow-md">
        <Link href="/candidates" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff0000] text-white shadow-[0_0_12px_rgba(255,0,0,0.5)]">
            <Play className="h-4 w-4 fill-white translate-x-0.5" />
          </div>
          <span className="text-base font-bold text-white tracking-tight">YOUTUBE Shots</span>
          <span className="rounded-full bg-red-950/80 px-2 py-0.5 text-[10px] font-bold text-red-400 border border-red-800">
            {APP_VERSION}
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#333333] bg-[#212121] text-neutral-300 hover:text-white hover:bg-[#282828]"
          aria-label="메뉴 토글"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* 모바일 백드롭 오버레이 */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs md:hidden"
          onClick={closeMobile}
        />
      )}

      {/* 메인 유튜브 다크 사이드바 */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[#262626] bg-[#121212] transition-transform duration-200 ease-in-out md:static md:w-64 md:translate-x-0 md:h-screen md:sticky md:top-0 md:shrink-0 ${
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-1 flex-col overflow-y-auto p-4">
          {/* 유튜브 브랜드 헤더 */}
          <div className="mb-6 px-1 pt-1">
            <div className="flex items-center justify-between">
              <Link href="/candidates" onClick={closeMobile} className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ff0000] text-white shadow-[0_0_15px_rgba(255,0,0,0.5)]">
                  <Play className="h-4.5 w-4.5 fill-white translate-x-0.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold text-white tracking-tight">YOUTUBE Shots</span>
                  <span className="text-[11px] font-medium text-neutral-400">이미지 스토리 자동화</span>
                </div>
              </Link>
              <span className="rounded-md bg-red-950/80 px-2 py-0.5 text-[11px] font-bold text-red-400 border border-red-800">
                {APP_VERSION}
              </span>
            </div>

            <a
              href="https://www.buylife.xyz/programs"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
            >
              <span>← 다른 프로그램 보기</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* 5단계 유튜브 쇼츠 제작 파이프라인 */}
          <nav className="flex flex-col space-y-1">
            <div className="pt-1 pb-2">
              <p className="px-3 text-[11px] font-bold tracking-wider text-neutral-500 uppercase">
                5단계 쇼츠 제작 파이프라인
              </p>
            </div>

            <div className="relative flex flex-col space-y-1.5">
              {FLOW_STEPS.map((item, idx) => {
                const isActive = pathname?.startsWith(item.href);
                const isLast = idx === FLOW_STEPS.length - 1;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobile}
                    className={`group relative flex gap-3 rounded-xl p-2.5 transition-all ${
                      isActive 
                        ? "bg-[#212121] border border-red-950/80 shadow-xs" 
                        : "hover:bg-[#1a1a1a] border border-transparent"
                    }`}
                  >
                    {/* 스텝 번호 + 연결선 */}
                    <div className="flex flex-col items-center">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                          isActive
                            ? "bg-[#ff0000] text-white shadow-[0_0_10px_rgba(255,0,0,0.6)]"
                            : "bg-[#242424] text-neutral-400 group-hover:bg-[#2e2e2e] group-hover:text-white"
                        }`}
                      >
                        {item.step}
                      </span>
                      {!isLast && <span className="mt-1.5 w-px flex-1 bg-[#262626]" />}
                    </div>

                    {/* 라벨 + 설명 */}
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex items-center gap-1.5">
                        <item.icon className={`h-3.5 w-3.5 ${isActive ? "text-[#ff0000]" : "text-neutral-400"}`} />
                        <p className={`text-sm font-bold truncate ${isActive ? "text-white" : "text-neutral-300"}`}>
                          {item.label}
                        </p>
                      </div>
                      <p className="text-[11px] text-neutral-400 truncate mt-0.5">{item.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* 유틸리티 메뉴 (가이드북 & API키 연동) */}
          <div className="mt-6 border-t border-[#262626] pt-4">
            <p className="px-3 mb-2 text-[11px] font-bold tracking-wider text-neutral-500 uppercase">
              설정 & 매뉴얼
            </p>
            <div className="space-y-1">
              {UTILITY_ITEMS.map((item) => {
                const isActive = pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobile}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-[#212121] text-white border border-red-900/60 shadow-xs"
                        : item.highlight
                        ? "bg-amber-950/40 text-amber-300 hover:bg-amber-950/60 border border-amber-900/40"
                        : "text-neutral-300 hover:bg-[#1a1a1a] hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon className={`h-4 w-4 ${
                        isActive ? "text-[#ff0000]" : item.highlight ? "text-amber-400" : "text-neutral-400"
                      }`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="rounded-full bg-amber-500 text-black text-[10px] font-extrabold px-1.5 py-0.5 shadow-xs">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* 하단 사용자 계정 및 다크 로그아웃 */}
        <div className="shrink-0 border-t border-[#262626] bg-[#161616] p-4">
          <div className="mb-2 flex items-center gap-2 px-1">
            <div className="h-2 w-2 rounded-full bg-[#ff0000] shadow-[0_0_6px_#ff0000]" />
            <p className="truncate text-xs font-medium text-neutral-300" title={userEmail}>
              {userEmail}
            </p>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#333333] bg-[#212121] px-3 py-2 text-xs font-semibold text-neutral-300 hover:bg-[#282828] hover:text-red-400 transition-colors shadow-xs"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>로그아웃</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
