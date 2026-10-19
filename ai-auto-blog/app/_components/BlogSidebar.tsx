"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { APP_VERSION } from "@/utils/version";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://www.buylife.xyz";

const OVERVIEW_ITEM = { href: "/dashboard", icon: "🏠", label: "대시보드" };

const FLOW_STEPS = [
  {
    step: 1,
    href: "/candidates",
    icon: "🔍",
    label: "게시글 주제 수집",
    description: "트렌드·키워드 기반 글감 수집",
  },
  {
    step: 2,
    href: "/write/ai-form",
    icon: "✏️",
    label: "AI 글쓰기",
    description: "주제 입력 시 AI 초안 & 삽화 생성",
  },
  {
    step: 3,
    href: "/",
    icon: "📝",
    label: "게시글 관리",
    description: "작성된 게시글 검수 및 블로그 발행",
  },
];

const UTILITY_ITEMS = [
  { href: "/settings", icon: "🔑", label: "API키등록·플랫폼연동" },
  { href: "/guide", icon: "📖", label: "연동 & 사용 매뉴얼" },
];

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function BlogSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
  }, []);

  const handleLogout = async () => {
    await createClient().auth.signOut();
    router.push("/auth");
    router.refresh();
  };

  const closeMobile = () => setMobileOpen(false);

  const navContent = (
    <div className="flex h-full flex-col justify-between">
      <div>
        {/* 헤더 & 로고 & 버전 */}
        <div className="mb-4 md:mb-6 px-2">
          <div className="flex items-center justify-between">
            <Link href="/" onClick={closeMobile} className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>✍️ BLOG 원문 자동화</span>
            </Link>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
              {APP_VERSION}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 font-medium">플로우 위저드 블로그 퍼블리싱</p>
          <a
            href={`${MAIN_SITE_URL}/dashboard`}
            className="mt-2 inline-flex items-center text-xs text-slate-400 hover:text-slate-700 transition-colors"
          >
            ← 다른 프로그램 보기
          </a>
        </div>

        {/* 네비게이션 */}
        <nav className="flex flex-col space-y-1">
          <Link
            href={OVERVIEW_ITEM.href}
            onClick={closeMobile}
            className={cn(
              "mb-2 flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition-all",
              pathname === OVERVIEW_ITEM.href
                ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-200/60"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <span className="text-base">{OVERVIEW_ITEM.icon}</span>
            <span>{OVERVIEW_ITEM.label}</span>
          </Link>

          {/* 3단계 파이프라인 스텝퍼 */}
          <div className="relative flex flex-col py-1">
            <div className="px-2 pb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              발행 파이프라인
            </div>
            {FLOW_STEPS.map((item, idx) => {
              const isActive = pathname === item.href;
              const isLast = idx === FLOW_STEPS.length - 1;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobile}
                  className="group relative flex gap-3 pb-2.5"
                >
                  {/* 스텝 번호 + 연결선 */}
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black transition-all",
                        isActive
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-105"
                          : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                      )}
                    >
                      {item.step}
                    </span>
                    {!isLast && <span className="mt-1 w-px flex-1 bg-slate-200" />}
                  </div>

                  {/* 라벨 + 설명 */}
                  <div
                    className={cn(
                      "min-w-0 flex-1 rounded-xl px-3 py-1.5 transition-all",
                      isActive
                        ? "bg-blue-50 border border-blue-200/60 shadow-sm"
                        : "group-hover:bg-slate-50"
                    )}
                  >
                    <p className={cn("text-xs font-bold flex items-center gap-1.5", isActive ? "text-blue-700" : "text-slate-800")}>
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* 유틸리티 메뉴 */}
        <div className="mt-4 border-t border-slate-200 pt-3">
          <div className="px-2 pb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            설정 및 매뉴얼
          </div>
          {UTILITY_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobile}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition-all mb-1",
                  isActive
                    ? "bg-blue-50 text-blue-700 border border-blue-200/60 shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 사용자 계정 정보 & 로그아웃 */}
      <div className="mt-6 border-t border-slate-200 pt-4">
        <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 mb-2">
          <p className="text-[11px] font-bold text-slate-400">접속 계정</p>
          <p className="truncate text-xs font-semibold text-slate-700 mt-0.5">{userEmail || "회원 인증됨"}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 cursor-pointer border border-transparent hover:border-red-100"
        >
          <span>🚪 로그아웃</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* 모바일 상단 바 (767px 이하) */}
      <header className="flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-base">✍️</span>
          <span className="text-sm font-bold text-slate-900">BLOG 원문 자동화</span>
          <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
            {APP_VERSION}
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
          aria-label="메뉴 열기"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </header>

      {/* 모바일 슬라이드 드로어 */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={closeMobile} />
          <div className="relative flex w-4/5 max-w-xs flex-col bg-white p-5 shadow-2xl z-10 overflow-y-auto">
            {navContent}
          </div>
        </div>
      )}

      {/* 데스크톱 고정 사이드바 */}
      <aside className="hidden md:flex w-64 flex-col border-r border-slate-200 bg-white p-5 flex-shrink-0 justify-between self-stretch h-full overflow-y-auto">
        {navContent}
      </aside>
    </>
  );
}
