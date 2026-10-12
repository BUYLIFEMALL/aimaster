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
    description: "명언, 인생 지혜, 따뜻한 위로",
    icon: Sparkles,
  },
  {
    step: 2,
    id: "step-2",
    label: "이미지 방식",
    description: "AI 나노바나나, Pixabay, Pexels",
    icon: ImageIcon,
  },
  {
    step: 3,
    id: "step-3",
    label: "이미지 비율",
    description: "9:16 릴스·쇼츠, 1:1 피드",
    icon: Maximize2,
  },
  {
    step: 4,
    id: "step-4",
    label: "문구 줄 수",
    description: "5줄 ~ 8줄 분량 조절",
    icon: Sliders,
  },
  {
    step: 5,
    id: "step-5",
    label: "글귀 만들기",
    description: "AI 글귀 생성 및 감성 문구 편집",
    icon: PenLine,
  },
  {
    step: 6,
    id: "step-6",
    label: "완성 & 저장",
    description: "실시간 캔버스 미리보기 & 다운로드",
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
    <div className="flex h-full flex-col justify-between overflow-y-auto p-4">
      <div className="space-y-4">
        {/* 상단 브랜드 헤더 */}
        <div className="border-b border-slate-200/80 pb-3">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 hover:opacity-90 transition group"
              title={`${APP_NAME} 홈으로 이동`}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-500 via-pink-600 to-rose-400 text-white shadow-sm shadow-rose-100 group-hover:scale-105 transition-transform">
                <Heart className="h-4.5 w-4.5 text-rose-100 fill-rose-200/40" />
              </div>
              <div>
                <h1 className="text-sm font-black text-slate-900 tracking-tight group-hover:text-rose-600 transition-colors">
                  {APP_NAME}
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] font-bold text-slate-500">
                    {APP_VERSION}
                  </span>
                  <span className="px-1.5 py-0.2 text-[9px] font-extrabold bg-emerald-500 text-white rounded tracking-wide">
                    FREE
                  </span>
                </div>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 md:hidden"
              aria-label="메뉴 닫기"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <a
            href="https://www.buylife.xyz/programs"
            className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 hover:text-rose-600 transition-colors font-medium"
            title="AI Master 전체 프로그램 카탈로그 보기"
          >
            <span>← 다른 프로그램 보기</span>
          </a>
        </div>

        {/* 대시보드 / 제작 스튜디오 홈 바로가기 */}
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
            pathname === "/"
              ? "bg-rose-50 text-rose-700"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <LayoutDashboard className="h-4 w-4 text-rose-500" />
          <span>감성 글귀 제작 스튜디오</span>
        </Link>

        {/* 번호형 작업 흐름 (스텝퍼) */}
        <div>
          <div className="mb-2 px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            WORKFLOW
          </div>
          <nav className="space-y-1">
            {FLOW_STEPS.map((s, index) => {
              const Icon = s.icon;
              return (
                <div key={s.id} className="relative">
                  <Link
                    href={`/#${s.id}`}
                    onClick={() => handleStepClick(s.id)}
                    className="w-full text-left rounded-xl p-2.5 transition flex items-start gap-3 border border-transparent hover:border-slate-200 hover:bg-slate-50/80 group"
                  >
                    <div className="flex flex-col items-center">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-black bg-slate-100 text-slate-600 group-hover:bg-rose-600 group-hover:text-white transition-all">
                        {s.step}
                      </span>
                      {index < FLOW_STEPS.length - 1 && (
                        <span className="mt-1 h-3 w-px bg-slate-200/70" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5 text-slate-400 group-hover:text-rose-600 transition-colors" />
                        <span className="text-xs font-bold text-slate-700 group-hover:text-rose-950 truncate tracking-tight">
                          {s.label}
                        </span>
                      </div>
                      <p className="text-[10px] truncate leading-tight mt-0.5 text-slate-400 group-hover:text-slate-500">
                        {s.description}
                      </p>
                    </div>
                  </Link>
                </div>
              );
            })}
          </nav>
        </div>
      </div>

      {/* 하단 유틸리티 및 사용자 정보 */}
      <div className="space-y-2 border-t border-slate-200/80 pt-3">
        <Link
          href="/settings"
          onClick={() => setOpen(false)}
          className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
            pathname === "/settings"
              ? "bg-rose-50 text-rose-700 border border-rose-200"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <KeyRound className="h-4 w-4 text-amber-500" />
          <span>🔑 API키등록·플랫폼연동</span>
        </Link>

        <div className="flex items-center justify-between border-t border-slate-100 pt-2 px-1 text-slate-500">
          <div
            className="truncate text-[11px] font-medium max-w-[130px]"
            title={email || "로그인 계정"}
          >
            {email || "로그인 계정"}
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-1 rounded px-1.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 transition"
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
        <div className="flex items-center justify-between px-4 py-2.5">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 text-white shadow-2xs">
              <Heart className="h-3.5 w-3.5 fill-white/40" />
            </div>
            <span className="text-sm font-bold text-slate-900">
              {APP_NAME}
            </span>
            <span className="text-xs font-mono text-slate-400">
              {APP_VERSION}
            </span>
          </Link>
          <button
            type="button"
            aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-1.5 text-slate-700 hover:bg-slate-100"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {open && (
          <div className="fixed inset-0 top-[53px] z-50 bg-slate-900/40 backdrop-blur-2xs flex">
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
