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
    description: "트렌드·쇼츠·키워드 글감 수집",
  },
  {
    step: 2,
    href: "/write/ai-form",
    icon: "✏️",
    label: "AI 글쓰기",
    description: "프롬프트·이미지 포함 초안 생성",
  },
  {
    step: 3,
    href: "/",
    icon: "📝",
    label: "게시글 관리",
    description: "글 편집 및 티스토리 원스톱 전송",
  },
];

const UTILITY_ITEMS = [
  { href: "/settings", icon: "🔑", label: "API키·플랫폼연동" },
  { href: "/guide", icon: "📖", label: "연동 & 사용 매뉴얼" },
];

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

interface BlogSidebarProps {
  onNavigate?: () => void;
}

export default function BlogSidebar({ onNavigate }: BlogSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
  }, []);

  const handleLogout = async () => {
    await createClient().auth.signOut();
    if (onNavigate) onNavigate();
    router.push("/auth");
    router.refresh();
  };

  const handleItemClick = () => {
    if (onNavigate) onNavigate();
  };

  return (
    <aside className="flex h-full w-full flex-col justify-between bg-white p-4 text-slate-800">
      <div>
        {/* 상단 브랜드 헤더 */}
        <div className="mb-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3 px-1 mb-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 text-white font-black text-lg shadow-sm shadow-orange-500/20">
              T
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-bold text-slate-900 tracking-tight">
                티스토리 원문생성
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center rounded-md bg-orange-50 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 ring-1 ring-inset ring-orange-600/20">
                  {APP_VERSION}
                </span>
                <span className="text-[11px] font-medium text-slate-400">플로우 위저드</span>
              </div>
            </div>
          </div>

          <a
            href={`${MAIN_SITE_URL}/programs`}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-500 hover:text-orange-600 transition-colors rounded-lg hover:bg-orange-50/50"
          >
            <span>←</span> AIMaster 프로그램 목록
          </a>
        </div>

        {/* 내비게이션 메뉴 */}
        <nav className="flex flex-col space-y-1">
          {/* 대시보드 */}
          <Link
            href={OVERVIEW_ITEM.href}
            onClick={handleItemClick}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
              pathname === OVERVIEW_ITEM.href
                ? "bg-orange-50 text-orange-600 shadow-sm border border-orange-200/60"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <span className="text-base">{OVERVIEW_ITEM.icon}</span>
            <span>{OVERVIEW_ITEM.label}</span>
          </Link>

          {/* 파이프라인 단계 헤더 */}
          <div className="pt-3 pb-1 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            글작성 파이프라인
          </div>

          {/* 플로우 스텝퍼 */}
          <div className="relative flex flex-col pt-1">
            {FLOW_STEPS.map((item, idx) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/" || pathname.startsWith("/posts") || pathname.startsWith("/my-posts")
                  : pathname.startsWith(item.href);
              const isLast = idx === FLOW_STEPS.length - 1;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleItemClick}
                  className="group relative flex gap-3 pb-2.5"
                >
                  {/* 스텝 번호 원형 + 연결 선 */}
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold transition-all",
                        isActive
                          ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm ring-4 ring-orange-100"
                          : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-800"
                      )}
                    >
                      {item.step}
                    </span>
                    {!isLast && (
                      <span
                        className={cn(
                          "mt-1.5 w-0.5 flex-1 transition-colors",
                          isActive ? "bg-orange-200" : "bg-slate-200"
                        )}
                      />
                    )}
                  </div>

                  {/* 라벨 + 설명 */}
                  <div
                    className={cn(
                      "min-w-0 flex-1 rounded-xl px-2.5 py-1.5 transition-all border",
                      isActive
                        ? "bg-orange-50/70 border-orange-200/80 shadow-xs"
                        : "border-transparent group-hover:bg-slate-50"
                    )}
                  >
                    <p
                      className={cn(
                        "text-sm font-bold flex items-center gap-1.5",
                        isActive ? "text-orange-950" : "text-slate-800 group-hover:text-slate-900"
                      )}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </p>
                    <p
                      className={cn(
                        "text-[11px] leading-relaxed line-clamp-1 mt-0.5",
                        isActive ? "text-orange-700/80" : "text-slate-400 group-hover:text-slate-500"
                      )}
                    >
                      {item.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* 유틸리티 영역 */}
          <div className="pt-3 pb-1 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            도구 및 매뉴얼
          </div>

          <div className="flex flex-col space-y-1">
            {UTILITY_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleItemClick}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition-all",
                    isActive
                      ? "bg-orange-50 text-orange-600 shadow-sm border border-orange-200/60"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* 하단 사용자 정보 및 로그아웃 */}
      <div className="mt-6 border-t border-slate-100 pt-3">
        <div className="mb-2 px-2 py-1 rounded-lg bg-slate-50 border border-slate-100">
          <p className="text-[10px] font-medium text-slate-400">접속 계정</p>
          <p className="truncate text-xs font-semibold text-slate-700">{userEmail ?? "확인 중..."}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-center text-xs font-semibold text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 hover:border-red-100 border border-transparent"
        >
          <span>🚪</span> 로그아웃
        </button>
      </div>
    </aside>
  );
}
