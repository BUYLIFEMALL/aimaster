"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { APP_VERSION } from "@/lib/version";
import { signOutAction } from "@/lib/actions/auth";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

interface NavItem {
  href: string;
  icon: string;
  label: string;
  badge?: string;
  desc?: string;
}

const PRIMARY_MENU: NavItem[] = [
  {
    href: "/",
    icon: "🛍️",
    label: "상세페이지 제작",
    desc: "쿠팡·스마트스토어·럭셔리 기획",
  },
  {
    href: "/guide",
    icon: "📖",
    label: "연동 & 사용 매뉴얼",
    badge: "가이드북",
    desc: "규격 매트릭스 및 7대 수칙",
  },
  {
    href: "/settings",
    icon: "🔑",
    label: "API 키 설정",
    desc: "Claude & Gemini 연동",
  },
];

const TEMPLATE_STEPS = [
  { step: 1, label: "템플릿 선정", desc: "쿠팡/네이버/럭셔리" },
  { step: 2, label: "제품 정보 & 이미지", desc: "스펙/소재/AI생성" },
  { step: 3, label: "신뢰 & 보장 데이터", desc: "판매량/리뷰/배송" },
  { step: 4, label: "AI 카피 & 프리뷰", desc: "원클릭 고화질 출력" },
];

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function DetailSidebar() {
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
  }, []);

  const closeMobile = () => setMobileOpen(false);

  const navContent = (
    <div className="flex h-full flex-col">
      <div>
        {/* 헤더 & 로고 & 버전 */}
        <div className="mb-5 px-1">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              onClick={closeMobile}
              className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2 group"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">🛍️</span>
              <span className="bg-gradient-to-r from-blue-700 via-indigo-700 to-amber-600 bg-clip-text text-transparent">
                상세페이지 자동생성기
              </span>
            </Link>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 border border-blue-200 shadow-xs">
              {APP_VERSION}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-500 font-medium">이커머스 셀러 스튜디오 에디션</p>
          <a
            href={`${MAIN_SITE_URL}/programs`}
            className="mt-2.5 inline-flex items-center text-xs font-medium text-slate-400 hover:text-slate-800 transition-colors"
          >
            ← 전체 프로그램 목록
          </a>
        </div>

        {/* 메인 메뉴 네비게이션 */}
        <nav className="flex flex-col space-y-1.5 pt-2">
          <div className="px-2 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            스튜디오 메뉴
          </div>
          {PRIMARY_MENU.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobile}
                className={cn(
                  "flex items-start gap-3 rounded-xl px-3 py-2.5 transition-all text-left",
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                    : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
                )}
              >
                <span className="text-lg shrink-0 mt-0.5">{item.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className={cn("text-xs font-bold", isActive ? "text-white" : "text-slate-800")}>
                      {item.label}
                    </span>
                    {item.badge && (
                      <span
                        className={cn(
                          "px-1.5 py-0.2 rounded text-[10px] font-bold",
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-amber-100 text-amber-700 border border-amber-200"
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                  {item.desc && (
                    <p className={cn("text-[11px] mt-0.5 truncate", isActive ? "text-blue-100" : "text-slate-400")}>
                      {item.desc}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* 4단계 상세페이지 제작 파이프라인 */}
        <div className="mt-5 border-t border-slate-200/80 pt-4">
          <div className="px-2 pb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>제작 파이프라인</span>
            <span className="text-[10px] text-blue-600 font-semibold">4-STEP</span>
          </div>
          <div className="space-y-2 px-1">
            {TEMPLATE_STEPS.map((stepItem, idx) => (
              <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-600">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-[10px] text-slate-600 border border-slate-200">
                  {stepItem.step}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-slate-800 block text-[11px]">{stepItem.label}</span>
                  <span className="text-[10px] text-slate-400 truncate block">{stepItem.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 사용자 계정 정보 & 로그아웃 */}
      <div className="mt-3 border-t border-slate-200/80 pt-4">
        <div className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 mb-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">셀러 계정</p>
          <p className="truncate text-xs font-bold text-slate-700 mt-0.5">{userEmail || "회원 인증됨"}</p>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 cursor-pointer border border-transparent hover:border-red-100"
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
      <header className="flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-sm px-4 lg:hidden sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">🛍️</span>
          <span className="text-sm font-black text-slate-900">상세페이지 자동생성기</span>
          <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
            {APP_VERSION}
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/guide"
            className="text-xs font-bold px-2 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-200"
          >
            가이드북
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
            aria-label="메뉴 열기"
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
      </header>

      {/* 모바일 슬라이드 드로어 */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={closeMobile} />
          <div className="relative flex w-4/5 max-w-xs flex-col bg-white p-5 shadow-2xl z-10 overflow-y-auto">
            {navContent}
          </div>
        </div>
      )}

      {/* 데스크톱 고정 사이드바 */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-slate-200 bg-white p-5 shrink-0 self-stretch min-h-screen sticky top-0 h-screen overflow-y-auto">
        {navContent}
      </aside>
    </>
  );
}
