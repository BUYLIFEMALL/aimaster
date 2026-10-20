"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Flame,
  KeyRound,
  LayoutDashboard,
  LogOut,
  PenLine,
  Send,
  BookOpen,
  Sparkles,
  X,
  ExternalLink,
} from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";
import { APP_VERSION } from "@/lib/version";

const flow = [
  {
    step: 1,
    href: "/collector",
    label: "떡상 콘텐츠 수집",
    description: "실시간 인기 토픽 & 키워드",
    icon: Flame,
    color: "text-rose-500",
  },
  {
    step: 2,
    href: "/",
    label: "콘텐츠 생성",
    description: "AI 원고 & 맞춤 이미지 생성",
    icon: PenLine,
    color: "text-emerald-500",
  },
  {
    step: 3,
    href: "/queue",
    label: "콘텐츠 보관함",
    description: "발행 대기열 & 스마트에디터 주입",
    icon: Send,
    color: "text-indigo-500",
  },
];

interface SidebarProps {
  userEmail: string;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ userEmail, isOpenMobile = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();

  const content = (
    <div className="flex h-full flex-col overflow-y-auto bg-white p-4">
      {/* 1. 상단 브랜딩 & 버전 & 다른 프로그램 보기 */}
      <div>
        <div className="mb-4 border-b border-slate-200/90 pb-4">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              onClick={() => {
                if (onCloseMobile) onCloseMobile();
              }}
              className="flex items-center gap-2.5 hover:opacity-90 transition group"
              title="메인 홈으로 이동"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-100 group-hover:scale-105 transition-transform">
                <Sparkles className="h-4.5 w-4.5" />
              </div>
              <div>
                <h1 className="text-sm font-black text-slate-900 tracking-tight group-hover:text-emerald-600 transition-colors">
                  네이버 블로그 에이전트
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

            {/* 모바일 닫기 버튼 */}
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 md:hidden"
                aria-label="메뉴 닫기"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          <a
            href="https://www.buylife.xyz/programs"
            className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-600 transition-colors font-medium"
            title="AI Master 전체 프로그램 카탈로그 보기"
          >
            <span>← 다른 프로그램 보기</span>
          </a>
        </div>

        {/* 2. 대시보드 & 3단계 작업 흐름 */}
        <div className="space-y-3">
          {/* 최상단 대시보드 */}
          <Link
            href="/dashboard"
            onClick={() => {
              if (onCloseMobile) onCloseMobile();
            }}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
              pathname === "/dashboard"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <LayoutDashboard className={`h-4 w-4 ${pathname === "/dashboard" ? "text-emerald-600" : "text-slate-500"}`} />
            <span>대시보드 메인</span>
          </Link>

          {/* 스텝퍼 섹션 라벨 */}
          <div className="px-1 pt-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              작업 흐름 (STEP 1~3)
            </span>
          </div>

          {/* 1 -> 2 -> 3 플로우 스텝퍼 */}
          <nav className="relative flex flex-col">
            {flow.map((item, idx) => {
              const active = pathname === item.href;
              const isLast = idx === flow.length - 1;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className="group relative flex w-full text-left gap-3 pb-2 transition-all cursor-pointer"
                >
                  {/* 스텝 번호 원형 배지 + 연결선 */}
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black transition-all ${
                        active
                          ? "bg-slate-900 text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                      }`}
                    >
                      {item.step}
                    </span>
                    {!isLast && (
                      <span className="mt-1 h-6 w-px bg-slate-200 group-hover:bg-slate-300" />
                    )}
                  </div>

                  {/* 라벨 + 한 줄 설명 */}
                  <div
                    className={`min-w-0 flex-1 rounded-xl px-2.5 py-1.5 transition-all ${
                      active
                        ? "bg-slate-100/90 border border-slate-200/80 shadow-xs"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className={`h-3.5 w-3.5 ${item.color}`} />
                      <span
                        className={`text-xs font-black truncate ${
                          active ? "text-slate-900" : "text-slate-700"
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-normal">
                      {item.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* 3. 구분선 및 유틸리티 항목 */}
        <div className="mt-4 border-t border-slate-200/90 pt-3 space-y-1">
          <div className="px-1 pb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              유틸리티 & 연동
            </span>
          </div>

          {/* 📖 연동 & 사용 매뉴얼 */}
          <Link
            href="/guide"
            onClick={() => {
              if (onCloseMobile) onCloseMobile();
            }}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
              pathname === "/guide"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <BookOpen className={`h-4 w-4 ${pathname === "/guide" ? "text-emerald-600" : "text-emerald-500"}`} />
            <span>📖 연동 & 사용 매뉴얼</span>
          </Link>

          {/* 🔑 API키등록·플랫폼연동 */}
          <Link
            href="/settings"
            onClick={() => {
              if (onCloseMobile) onCloseMobile();
            }}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
              pathname === "/settings"
                ? "bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <KeyRound className="h-4 w-4 text-amber-500" />
            <span>API키등록·플랫폼연동</span>
          </Link>
        </div>
      </div>

      {/* 4. 하단 고정 사용자 계정 & 로그아웃 */}
      <div className="mt-4 shrink-0 border-t border-slate-200/90 pt-3">
        <p
          className="truncate px-2 py-1 text-xs font-medium text-slate-500"
          title={userEmail}
        >
          {userEmail || "로그인 계정"}
        </p>

        <form action={signOutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>로그아웃</span>
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* 데스크톱 고정 사이드바 */}
      <aside className="hidden h-screen w-64 shrink-0 border-r border-slate-200 bg-white md:sticky md:top-0 md:flex md:flex-col shadow-xs z-20">
        {content}
      </aside>

      {/* 모바일 슬라이드 드로어 오버레이 */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[80vw] bg-white shadow-xl flex flex-col h-full z-10 animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
