"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";
import { APP_VERSION } from "@/lib/version";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

// 대시보드는 순서 개념이 없는 개요 화면이라 번호 없이 스텝퍼 위에 별도로 둔다.
const OVERVIEW_ITEM = { href: "/dashboard", icon: "🏠", label: "대시보드" };

// 4단계 핵심 작업 흐름 파이프라인
const FLOW_STEPS = [
  {
    step: 1,
    href: "/topics",
    icon: "📌",
    label: "관심 주제 등록",
    description: "정보를 받아볼 주제/키워드 등록",
  },
  {
    step: 2,
    href: "/reports",
    icon: "📰",
    label: "생성리포트 목록",
    description: "AI가 생성한 정보 콘텐츠 보기",
  },
  {
    step: 3,
    href: "/recipients",
    icon: "📣",
    label: "카카오톡 수신자 목록",
    description: "함께 받아볼 사람 등록/관리",
  },
  {
    step: 4,
    href: "/broadcast-log",
    icon: "📨",
    label: "발송 내역",
    description: "수동 발송 결과 확인",
  },
];

// 유틸리티 설정 및 매뉴얼 메뉴 (DESIGN.md 9번 원칙 충족)
const UTILITY_ITEMS = [
  { href: "/settings", icon: "🔑", label: "API키등록·플랫폼연동", desc: "OpenAI·Perplexity·카카오" },
  { href: "/guide", icon: "📖", label: "연동 & 사용 매뉴얼", badge: "가이드", desc: "발송 채널 매트릭스·7대 수칙" },
];

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  const navContent = (
    <div className="flex h-full flex-col justify-between">
      <div>
        {/* 헤더 & 로고 & 버전 */}
        <div className="mb-5 px-1">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              onClick={closeMobile}
              className="text-base font-black text-neutral-900 tracking-tight flex items-center gap-2 group"
            >
              <span className="text-xl group-hover:scale-110 transition-transform">💬</span>
              <span className="bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
                카카오톡 뉴스레터
              </span>
            </Link>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 shadow-xs">
              {APP_VERSION}
            </span>
          </div>
          <p className="mt-1 text-xs text-neutral-500 font-medium">뉴스레터 마케팅 에디션</p>
          <a
            href={`${MAIN_SITE_URL}/programs`}
            className="mt-2 inline-flex items-center text-xs font-medium text-neutral-400 hover:text-neutral-800 transition-colors"
          >
            ← 전체 프로그램 목록
          </a>
        </div>

        {/* 대시보드 개요 메뉴 */}
        <Link
          href={OVERVIEW_ITEM.href}
          onClick={closeMobile}
          className={cn(
            "mb-3 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold transition-all",
            pathname === OVERVIEW_ITEM.href || pathname === "/"
              ? "bg-amber-400/20 text-neutral-900 border border-amber-400/40 shadow-xs font-black"
              : "text-neutral-700 hover:bg-neutral-100/80 hover:text-neutral-900"
          )}
        >
          <span className="text-base">{OVERVIEW_ITEM.icon}</span>
          <span>{OVERVIEW_ITEM.label}</span>
        </Link>

        {/* 4단계 파이프라인 스텝퍼 */}
        <div className="relative flex flex-col py-1">
          <div className="px-2 pb-2 text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
            <span>발송 파이프라인</span>
            <span className="text-[10px] text-amber-600 font-bold">4-STEP</span>
          </div>
          {FLOW_STEPS.map((item, idx) => {
            const isActive = pathname?.startsWith(item.href);
            const isLast = idx === FLOW_STEPS.length - 1;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobile}
                className="group relative flex gap-3 pb-2"
              >
                {/* 스텝 번호 + 연결선 */}
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black transition-all",
                      isActive
                        ? "bg-amber-500 text-white shadow-md shadow-amber-500/30 scale-105"
                        : "bg-neutral-100 text-neutral-500 group-hover:bg-neutral-200"
                    )}
                  >
                    {item.step}
                  </span>
                  {!isLast && <span className="mt-1 w-px flex-1 bg-neutral-200" />}
                </div>

                {/* 라벨 + 설명 */}
                <div
                  className={cn(
                    "min-w-0 flex-1 rounded-xl px-2.5 py-1.5 transition-all",
                    isActive
                      ? "bg-amber-50 border border-amber-200/80 shadow-xs"
                      : "group-hover:bg-neutral-50"
                  )}
                >
                  <p
                    className={cn(
                      "text-xs font-bold flex items-center gap-1.5",
                      isActive ? "text-amber-900" : "text-neutral-800"
                    )}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </p>
                  <p className="text-[11px] text-neutral-500 truncate mt-0.5">{item.description}</p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* 유틸리티 메뉴 (설정 & 매뉴얼) */}
        <div className="mt-4 border-t border-neutral-200 pt-3">
          <div className="px-2 pb-1.5 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
            설정 및 매뉴얼
          </div>
          {UTILITY_ITEMS.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobile}
                className={cn(
                  "flex items-start gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition-all mb-1",
                  isActive
                    ? "bg-amber-50 text-amber-900 border border-amber-200 shadow-xs"
                    : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900"
                )}
              >
                <span className="text-base shrink-0 mt-0.5">{item.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  {item.desc && (
                    <p className="text-[10px] text-neutral-400 font-normal truncate mt-0.5">
                      {item.desc}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 사용자 계정 정보 & 로그아웃 */}
      <div className="mt-6 border-t border-neutral-200 pt-4">
        <div className="px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-100 mb-2">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">접속 계정</p>
          <p className="truncate text-xs font-bold text-neutral-700 mt-0.5">{userEmail || "회원 인증됨"}</p>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-neutral-600 transition-colors hover:bg-red-50 hover:text-red-600 cursor-pointer border border-transparent hover:border-red-100"
          >
            <span>🚪 로그아웃</span>
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* 모바일 상단 바 (767px 이하) */}
      <header className="flex h-14 w-full items-center justify-between border-b border-neutral-200 bg-white/95 backdrop-blur-sm px-4 md:hidden sticky top-0 z-40">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-lg">💬</span>
          <span className="text-sm font-black text-neutral-900">카카오톡 뉴스레터</span>
          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
            {APP_VERSION}
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/guide"
            className="text-xs font-bold px-2 py-1 bg-amber-50 text-amber-800 rounded-lg border border-amber-300"
          >
            매뉴얼
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
            aria-label="메뉴 열기"
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
      </header>

      {/* 모바일 슬라이드 드로어 */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={closeMobile} />
          <div className="relative flex w-4/5 max-w-xs flex-col bg-white p-5 shadow-2xl z-10 overflow-y-auto">
            {navContent}
          </div>
        </div>
      )}

      {/* 데스크톱 고정 사이드바 */}
      <aside className="hidden md:flex w-64 flex-col border-r border-neutral-200 bg-white p-5 shrink-0 justify-between self-stretch min-h-screen sticky top-0 h-screen overflow-y-auto">
        {navContent}
      </aside>
    </>
  );
}
