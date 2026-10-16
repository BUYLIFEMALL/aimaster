"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";
import { APP_VERSION } from "@/lib/version";

const FLOW_STEPS = [
  {
    step: 1,
    href: "/products/new",
    icon: "🔍",
    label: "상품 및 상세페이지 분석",
    description: "상품 사진 등록 + AI 소구점 분석",
  },
  {
    step: 2,
    href: "/products",
    icon: "🖼️",
    label: "상세페이지 생성·관리",
    description: "15단 섹션 생성 및 롱 이미지 병합",
  },
];

const UTILITY_ITEMS = [
  { href: "/settings", icon: "🔑", label: "API키등록·플랫폼연동" },
];

function isFlowStepActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/products/new") {
    return pathname === "/products/new";
  }
  return pathname.startsWith("/products") && pathname !== "/products/new";
}

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* 모바일 상단 바 (md 이하) */}
      <div className="flex md:hidden items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white text-xs font-black shadow-xs">
            🛍️
          </span>
          <div>
            <span className="text-sm font-black text-slate-900 tracking-tight">상세페이지 자동화</span>
            <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-200">
              {APP_VERSION}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="메뉴 열기"
        >
          {mobileOpen ? (
            <span className="text-xl font-bold leading-none">✕</span>
          ) : (
            <span className="text-xl font-bold leading-none">☰</span>
          )}
        </button>
      </div>

      {/* 사이드바 본체 */}
      <aside
        className={`${
          mobileOpen ? "flex" : "hidden"
        } md:flex w-full md:w-64 flex-col border-b md:border-b-0 md:border-r border-slate-200 bg-white p-4 md:sticky md:top-0 md:h-screen md:shrink-0 z-30 transition-all`}
      >
        <div className="md:min-h-0 md:overflow-y-auto pr-1">
          {/* 브랜드 헤더 */}
          <div className="mb-5 px-1">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white text-xs font-black shadow-sm shadow-blue-500/25">
                  🛍️
                </span>
                <span className="text-sm font-black text-slate-900 tracking-tight">상세페이지 자동화</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-200/80">
                {APP_VERSION}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-2 pl-9 font-medium">15-Section Commerce Studio</p>
            <a
              href="https://www.buylife.xyz/programs"
              className="inline-flex items-center gap-1 pl-1 text-[11px] font-semibold text-slate-500 hover:text-blue-600 transition-colors"
            >
              <span>← 다른 프로그램 보기</span>
            </a>
          </div>

          {/* 작업 흐름 스텝퍼 */}
          <div className="mb-2 px-1">
            <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-2">SELLER WORKFLOW</p>
          </div>
          <nav className="relative flex flex-col space-y-1">
            {FLOW_STEPS.map((item, idx) => {
              const isActive = isFlowStepActive(pathname, item.href);
              const isLast = idx === FLOW_STEPS.length - 1;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`group relative flex gap-3 p-2.5 rounded-xl transition-all ${
                    isActive
                      ? "bg-blue-50/80 border border-blue-200/70 shadow-2xs"
                      : "hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  {/* 스텝 번호 + 연결선 */}
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black transition-all ${
                        isActive
                          ? "bg-blue-600 text-white shadow-xs shadow-blue-500/30"
                          : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                      }`}
                    >
                      {item.step}
                    </span>
                    {!isLast && <span className="mt-1 w-px flex-1 bg-slate-200" />}
                  </div>

                  {/* 라벨 + 설명 */}
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-bold flex items-center gap-1.5 ${isActive ? "text-blue-700" : "text-slate-800"}`}>
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{item.description}</p>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* 유틸리티 메뉴 */}
          <div className="mt-5 border-t border-slate-100 pt-3">
            <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1.5 px-2">SETTINGS</p>
            {UTILITY_ITEMS.map((item) => {
              const isActive = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                    isActive
                      ? "bg-blue-50 text-blue-700 border border-blue-200/70"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span className="text-sm">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* 이커머스 하단 엔진 소개 카드 */}
          <div className="mt-5 p-3 rounded-xl bg-gradient-to-br from-blue-50/60 to-slate-50 border border-blue-200/60 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-blue-800 mb-1">
              <span>✨</span>
              <span>Gemini 15단 생성 엔진</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              상품 맞춤형 소구점 분석과 15개 섹션 고해상도 생성 및 세로 롱 이미지 병합을 지원합니다.
            </p>
          </div>
        </div>

        {/* 하단 로그인 계정 정보 및 로그아웃 */}
        <div className="mt-auto shrink-0 border-t border-slate-200 pt-3 px-1">
          <div className="flex items-center justify-between mb-1.5">
            <div className="min-w-0 pr-2">
              <p className="text-[10px] font-semibold text-slate-400">접속 계정</p>
              <p className="truncate text-xs font-bold text-slate-700">{userEmail}</p>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="접속 중" />
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full rounded-lg px-2.5 py-1.5 text-center text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              로그아웃
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
