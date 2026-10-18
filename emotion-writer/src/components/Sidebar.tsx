"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME, APP_VERSION } from "@/lib/version";
import {
  Sparkles,
  ImageIcon,
  Maximize2,
  Sliders,
  PenLine,
  Download,
  KeyRound,
  LogOut,
  Menu,
  X,
  Heart,
  LayoutDashboard,
  BookOpen,
} from "lucide-react";

interface SidebarProps {
  email: string;
}

const FLOW_STEPS = [
  {
    step: 1,
    id: "step-1",
    label: "주제 선택",
    description: "명언·인생지혜·위로",
    icon: Sparkles,
  },
  {
    step: 2,
    id: "step-2",
    label: "이미지 방식",
    description: "AI 나노바나나·무료사진",
    icon: ImageIcon,
  },
  {
    step: 3,
    id: "step-3",
    label: "이미지 비율",
    description: "9:16 릴스·1:1 피드",
    icon: Maximize2,
  },
  {
    step: 4,
    id: "step-4",
    label: "문구 줄 수",
    description: "5줄 ~ 8줄 분량",
    icon: Sliders,
  },
  {
    step: 5,
    id: "step-5",
    label: "글귀 만들기",
    description: "AI 생성 및 문구 편집",
    icon: PenLine,
  },
  {
    step: 6,
    id: "step-6",
    label: "완성 & 저장",
    description: "미리보기 & PNG/JPG",
    icon: Download,
  },
];

export function Sidebar({ email }: SidebarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const handleStepClick = (stepId: string) => {
    setOpen(false);
    const target = document.getElementById(stepId);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const navContent = (
    <div className="flex h-full flex-col justify-between overflow-y-auto p-3.5 bg-[#fcfaf5]">
      <div className="space-y-3">
        {/* 상단 브랜드 헤더 */}
        <div className="border-b border-[#e7e0d3] pb-3">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 hover:opacity-90 transition group min-w-0"
              title={`${APP_NAME} 홈으로 이동`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-600 to-rose-500 text-white shadow-xs group-hover:scale-105 transition-transform">
                <Heart className="h-4 w-4 text-rose-100 fill-rose-200/50" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xs font-black text-stone-900 tracking-tight group-hover:text-rose-600 transition-colors whitespace-nowrap">
                    {APP_NAME}
                  </h1>
                  <span className="rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.2 text-[9px] font-bold text-rose-700">
                    {APP_VERSION}
                  </span>
                </div>
                <p className="text-[10px] font-medium text-stone-500 mt-0.5">
                  감성 캘리그라피 스튜디오
                </p>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 md:hidden"
              aria-label="메뉴 닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <a
            href="https://www.buylife.xyz/programs"
            className="mt-2 block text-[11px] text-stone-400 hover:text-rose-600 transition-colors font-medium"
            title="AI Master 전체 프로그램 카탈로그 보기"
          >
            ← 다른 프로그램 보기
          </a>
        </div>

        {/* 메인 메뉴 바로가기 */}
        <div className="space-y-1">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-bold transition-all ${
              pathname === "/"
                ? "bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs"
                : "text-stone-700 hover:bg-[#f5efe4] hover:text-stone-900"
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5 text-rose-500 shrink-0" />
            <span className="truncate">제작 스튜디오 홈</span>
          </Link>

          {/* 신설: 비주얼 연동 & 사용 매뉴얼 (DESIGN.md 9번 불변 원칙) */}
          <Link
            href="/guide"
            onClick={() => setOpen(false)}
            className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-bold transition-all ${
              pathname === "/guide"
                ? "bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs"
                : "text-stone-700 hover:bg-[#f5efe4] hover:text-stone-900"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5 text-rose-500 shrink-0" />
            <span className="truncate">📖 연동 & 사용 매뉴얼</span>
          </Link>
        </div>

        {/* 6단계 워크플로우 스텝퍼 */}
        <div>
          <div className="mb-1.5 px-1.5 text-[9.5px] font-extrabold uppercase tracking-wider text-stone-400">
            CREATION WORKFLOW
          </div>
          <nav className="space-y-0.5">
            {FLOW_STEPS.map((s) => {
              const Icon = s.icon;
              return (
                <Link
                  key={s.id}
                  href={`/#${s.id}`}
                  onClick={() => handleStepClick(s.id)}
                  className="w-full text-left rounded-xl px-2 py-1.5 transition flex items-center gap-2.5 border border-transparent hover:border-[#ded6c8] hover:bg-[#f7f3ec] group"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-black bg-[#efe8db] text-stone-700 group-hover:bg-rose-600 group-hover:text-white transition-all">
                    {s.step}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <Icon className="h-3 w-3 text-stone-400 group-hover:text-rose-600 transition-colors shrink-0" />
                      <span className="text-xs font-bold text-stone-800 group-hover:text-rose-950 truncate tracking-tight">
                        {s.label}
                      </span>
                    </div>
                    <p className="text-[9.5px] truncate leading-tight mt-0.5 text-stone-400 group-hover:text-stone-600">
                      {s.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* 유틸리티 및 사용자 정보 */}
      <div className="space-y-2 border-t border-[#e7e0d3] pt-3 mt-3">
        <Link
          href="/settings"
          onClick={() => setOpen(false)}
          className={`w-full flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-bold transition ${
            pathname === "/settings"
              ? "bg-rose-50 text-rose-700 border border-rose-200"
              : "text-stone-700 hover:bg-[#f5efe4] hover:text-stone-900"
          }`}
        >
          <KeyRound className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          <span className="truncate">🔑 API키등록·플랫폼연동</span>
        </Link>

        <div className="flex items-center justify-between border-t border-[#f0e9dc] pt-2 px-1 text-stone-500">
          <div
            className="truncate text-[10.5px] font-medium max-w-[125px]"
            title={email || "로그인 계정"}
          >
            {email || "로그인 계정"}
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold text-rose-600 hover:bg-rose-50 transition border border-transparent hover:border-rose-200"
              title="로그아웃"
            >
              <LogOut className="h-3 w-3" />
              <span>로그아웃</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 데스크톱: w-64 고정 좌측 바 */}
      <aside className="hidden md:flex h-screen w-64 shrink-0 flex-col border-r border-[#e7e0d3] bg-[#fcfaf5] sticky top-0 select-none z-30">
        {navContent}
      </aside>

      {/* 모바일: 56px 상단 바 + 슬라이드 드로어 */}
      <div className="md:hidden sticky top-0 z-40 border-b border-[#e7e0d3] bg-[#fdfbf7]/95 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 text-white shadow-xs">
              <Heart className="h-3.5 w-3.5 fill-white/40" />
            </div>
            <span className="text-xs font-extrabold text-stone-900">
              {APP_NAME}
            </span>
            <span className="rounded border border-rose-200 bg-rose-50 px-1 py-0.2 text-[9px] font-mono text-rose-700 font-bold">
              {APP_VERSION}
            </span>
          </Link>
          <button
            type="button"
            aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-1.5 text-stone-700 hover:bg-[#f5efe4] transition-colors"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {open && (
          <div className="fixed inset-0 top-14 z-50 bg-stone-900/40 backdrop-blur-xs flex">
            <div className="w-72 max-w-[85vw] bg-[#fcfaf5] h-full shadow-2xl overflow-y-auto border-r border-[#e7e0d3] animate-in slide-in-from-left duration-200">
              {navContent}
            </div>
            <div className="flex-1" onClick={() => setOpen(false)} />
          </div>
        )}
      </div>
    </>
  );
}
