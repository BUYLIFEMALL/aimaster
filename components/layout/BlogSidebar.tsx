"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/client";

// threads-affiliate-poster/naver-cafe-poster 등 다른 자동화 프로그램 사이드바(메뉴 레이아웃.png
// 참고)와 동일하게, 순서 개념 없는 대시보드는 번호 없이 최상단에, "글감 수집 → AI 글쓰기 →
// 게시글 관리"는 실제 작업 순서를 따르는 흐름이라 번호+이모지 스텝퍼로 보여준다. API 키 설정은
// 이 흐름과 무관한 유틸리티라 구분선 아래 별도 블록으로 분리한다(2026-09-11).
const OVERVIEW_ITEM = { href: "/blog/dashboard", icon: "🏠", label: "대시보드" };

const FLOW_STEPS = [
  {
    step: 1,
    href: "/blog/candidates",
    icon: "🔍",
    label: "게시글 주제 수집",
    description: "최신 트렌드·키워드로 글감 후보 수집",
  },
  {
    step: 2,
    href: "/blog/write/ai-form",
    icon: "✏️",
    label: "AI 글쓰기",
    description: "주제를 입력하면 AI가 게시글 초안 생성",
  },
  {
    step: 3,
    href: "/blog",
    icon: "📝",
    label: "게시글 관리",
    description: "작성된 게시글 확인 및 게시",
  },
];

const UTILITY_ITEMS = [{ href: "/blog/settings", icon: "🔑", label: "API 키 설정" }];

export default function BlogSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/session/logout", { method: "POST" }).catch(() => {});
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <aside className="flex w-full flex-col border-b border-slate-200 bg-white p-4 md:h-full md:w-64 md:flex-shrink-0 md:justify-between md:self-stretch md:border-b-0 md:border-r">
      <div>
        <div className="mb-4 md:mb-6">
          <div className="px-2 text-lg font-semibold text-slate-900">BLOG(원문)생성 자동화</div>
          <Link href="/programs" className="block px-2 text-xs text-slate-400 hover:text-slate-700">
            ← 다른 프로그램 보기
          </Link>
        </div>

        <nav className="flex flex-col">
          <Link
            href={OVERVIEW_ITEM.href}
            className={cn(
              "mb-2 block rounded-lg px-3 py-2 text-sm font-medium",
              pathname === OVERVIEW_ITEM.href
                ? "bg-indigo-50 text-indigo-600"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            {OVERVIEW_ITEM.icon} {OVERVIEW_ITEM.label}
          </Link>

          <div className="relative flex flex-col">
            {FLOW_STEPS.map((item, idx) => {
              const isActive = pathname === item.href;
              const isLast = idx === FLOW_STEPS.length - 1;
              return (
                <Link key={item.href} href={item.href} className="group relative flex gap-3 pb-1">
                  {/* 스텝 번호 + 연결선 */}
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                        isActive
                          ? "bg-indigo-600 text-white"
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
                      "min-w-0 flex-1 rounded-lg px-2 py-1.5",
                      isActive ? "bg-indigo-50" : "group-hover:bg-slate-50"
                    )}
                  >
                    <p className={cn("text-sm font-bold", isActive ? "text-indigo-600" : "text-slate-800")}>
                      {item.icon} {item.label}
                    </p>
                    <p className="text-xs text-slate-500">{item.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="mt-6 border-t border-slate-200 pt-3">
          {UTILITY_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-lg px-3 py-2 text-sm font-medium",
                pathname === item.href
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              {item.icon} {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-4 border-t border-slate-200 pt-4 md:mt-0">
        <p className="mb-2 truncate px-2 text-xs text-slate-400">{userEmail}</p>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          로그아웃
        </button>
      </div>
    </aside>
  );
}
