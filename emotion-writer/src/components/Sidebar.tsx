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
    <div className="flex h-full flex-col justify-between overflow-y-auto p-3.5">
      <div className="space-y-2.5">
        {/* 상단 브랜드 헤더 (컴팩트 높이) */}
        <div className="border-b border-slate-200/80 pb-2.5">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 hover:opacity-90 transition group min-w-0"
              title={`${APP_NAME} 홈으로 이동`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-500 via-pink-600 to-rose-400 text-white shadow-2xs group-hover:scale-105 transition-transform">
                <Heart className="h-4 w-4 text-rose-100 fill-rose-200/40" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xs font-black text-slate-900 tracking-tight group-hover:text-rose-600 transition-colors whitespace-nowrap">
                  {APP_NAME}
                </h1>
                <p className="text-[10.5px] font-bold text-slate-400 font-mono mt-0.5">
                  {APP_VERSION}
                </p>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 md:hidden"
              aria-label="메뉴 닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <a
            href="https://www.buylife.xyz/programs"
            className="mt-1.5 block text-[11px] text-slate-400 hover:text-rose-600 transition-colors font-medium"
            title="AI Master 전체 프로그램 카탈로그 보기"
          >
            ← 다른 프로그램 보기
          </a>
        </div>

        {/* 대시보드 / 제작 스튜디오 홈 바로가기 (슬림화) */}
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all ${
            pathname === "/"
              ? "bg-rose-50 text-rose-700"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <LayoutDashboard className="h-3.5 w-3.5 text-rose-500 shrink-0" />
          <span className="truncate">제작 스튜디오 홈</span>
        </Link>

        {/* 번호형 작업 흐름 (스텝퍼 컴팩트 정돈) */}
        <div>
          <div className="mb-1 px-1.5 text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400">
            WORKFLOW
          </div>
          <nav className="space-y-0.5">
            {FLOW_STEPS.map((s) => {
              const Icon = s.icon;
              return (
                <Link
                  key={s.id}
                  href={`/#${s.id}`}
                  onClick={() => handleStepClick(s.id)}
                  className="w-full text-left rounded-xl px-2 py-1.5 transition flex items-center gap-2.5 border border-transparent hover:border-slate-200/60 hover:bg-slate-50 group"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-black bg-slate-100 text-slate-600 group-hover:bg-rose-600 group-hover:text-white transition-all">
                    {s.step}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <Icon className="h-3 w-3 text-slate-400 group-hover:text-rose-600 transition-colors shrink-0" />
                      <span className="text-xs font-bold text-slate-700 group-hover:text-rose-950 truncate tracking-tight">
                        {s.label}
                      </span>
                    </div>
                    <p className="text-[9.5px] truncate leading-tight mt-0.2 text-slate-400 group-hover:text-slate-500">
                      {s.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* 하단 유틸리티 및 사용자 정보 (상단으로 끌어올림) */}
      <div className="space-y-1.5 border-t border-slate-200/80 pt-2.5 mt-2">
        <Link
          href="/settings"
          onClick={() => setOpen(false)}
          className={`w-full flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-bold transition ${
            pathname === "/settings"
              ? "bg-rose-50 text-rose-700 border border-rose-200"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <KeyRound className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <span className="truncate">🔑 API키등록·플랫폼연동</span>
        </Link>

        <div className="flex items-center justify-between border-t border-slate-100 pt-1.5 px-1 text-slate-500">
          <div
            className="truncate text-[10.5px] font-medium max-w-[125px]"
            title={email || "로그인 계정"}
          >
            {email || "로그인 계정"}
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-semibold text-rose-600 hover:bg-rose-50 transition"
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
      <aside className="hidden md:flex h-screen w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white sticky top-0 select-none z-30">
        {navContent}
      </aside>

      {/* 모바일: 상단 바 + 슬라이드 드로어 */}
      <div className="md:hidden sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
        <div className="flex items-center justify-between px-3.5 py-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-600 text-white shadow-2xs">
              <Heart className="h-3 w-3 fill-white/40" />
            </div>
            <span className="text-xs font-bold text-slate-900">
              {APP_NAME}
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {APP_VERSION}
            </span>
          </Link>
          <button
            type="button"
            aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-1 text-slate-700 hover:bg-slate-100"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {open && (
          <div className="fixed inset-0 top-[45px] z-50 bg-slate-900/40 backdrop-blur-2xs flex">
            <div className="w-72 max-w-[85vw] bg-white h-full shadow-2xl overflow-y-auto">
              {navContent}
            </div>
            <div className="flex-1" onClick={() => setOpen(false)} />
          </div>
        )}
      </div>
    </>
  );
}
