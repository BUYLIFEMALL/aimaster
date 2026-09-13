"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

// threads-affiliate-poster의 번호/이모지 스텝퍼 레이아웃을 그대로 참고했다(2026-09-13
// 사용자 요청) — 대시보드는 순서 개념 없는 개요라 번호 없이 최상단에 두고, "글감 수집 →
// 초안 확인·저장 → AI 글쓰기(생성) → 게시글 관리"를 순차 흐름으로 스텝퍼에 보여준다.
// AI 자동 초안생성이 AI 글쓰기보다 먼저 오는 건 사용자가 명시적으로 지정한 순서다.
const OVERVIEW_ITEM = { href: "/dashboard", icon: "🏠", label: "대시보드" };

const FLOW_STEPS = [
  {
    step: 1,
    href: "/candidates",
    icon: "🔍",
    label: "게시글 주제 수집",
    description: "카페에 올릴 글감 자동 수집",
  },
  {
    step: 2,
    href: "/drafts",
    icon: "📝",
    label: "AI 자동 글쓰기(초안)",
    description: "제목/본문 확인·수정 후 초안 저장",
  },
  {
    step: 3,
    href: "/write",
    icon: "✨",
    label: "AI 자동 글쓰기(수동)",
    description: "주제를 입력해 AI로 새 글 생성",
  },
  {
    step: 4,
    href: "/posts",
    icon: "📋",
    label: "게시글 관리",
    description: "저장한 초안을 카페에 게시",
  },
];

// "API키등록·플랫폼연동"은 threads-affiliate-poster 등 다른 서브프로젝트에서 이미 쓰고 있는
// 표준 메뉴명이다 — 이 프로젝트도 같은 이름으로 통일한다(2026-09-13 요청).
const UTILITY_ITEMS = [{ href: "/settings", icon: "🔑", label: "API키등록·플랫폼연동" }];

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-full flex-col border-b border-neutral-200 bg-white p-4 md:h-full md:w-64 md:justify-between md:border-b-0 md:border-r">
      <div>
        <div className="mb-4 md:mb-6">
          <div className="px-2 text-lg font-semibold text-neutral-900">네이버 카페 자동화</div>
          <a
            href={`${MAIN_SITE_URL}/programs`}
            className="block px-2 text-xs text-neutral-500 hover:text-neutral-900"
          >
            ← 다른 프로그램 보기
          </a>
        </div>

        <nav className="flex flex-col">
          <Link
            href={OVERVIEW_ITEM.href}
            className={`mb-2 block rounded-lg px-3 py-2 text-sm font-medium ${
              pathname?.startsWith(OVERVIEW_ITEM.href)
                ? "bg-sky-50 text-sky-700"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            }`}
          >
            {OVERVIEW_ITEM.icon} {OVERVIEW_ITEM.label}
          </Link>

          <div className="relative flex flex-col">
            {FLOW_STEPS.map((item, idx) => {
              const isActive = pathname?.startsWith(item.href);
              const isLast = idx === FLOW_STEPS.length - 1;
              return (
                <Link key={item.href} href={item.href} className="group relative flex gap-3 pb-1">
                  {/* 스텝 번호 + 연결선 */}
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        isActive
                          ? "bg-sky-600 text-white"
                          : "bg-neutral-100 text-neutral-500 group-hover:bg-neutral-200"
                      }`}
                    >
                      {item.step}
                    </span>
                    {!isLast && <span className="mt-1 w-px flex-1 bg-neutral-200" />}
                  </div>

                  {/* 라벨 + 설명 */}
                  <div
                    className={`min-w-0 flex-1 rounded-lg px-2 py-1.5 ${
                      isActive ? "bg-sky-50" : "group-hover:bg-neutral-50"
                    }`}
                  >
                    <p className={`text-sm font-bold ${isActive ? "text-sky-700" : "text-neutral-800"}`}>
                      {item.icon} {item.label}
                    </p>
                    <p className="text-xs text-neutral-500">{item.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="mt-6 border-t border-neutral-200 pt-3">
          {UTILITY_ITEMS.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? "bg-sky-50 text-sky-700" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                }`}
              >
                {item.icon} {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-4 border-t border-neutral-200 pt-4 md:mt-0">
        <p className="mb-2 truncate px-2 text-xs text-neutral-500">{userEmail}</p>
        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-neutral-600 hover:bg-neutral-100"
          >
            로그아웃
          </button>
        </form>
      </div>
    </aside>
  );
}
