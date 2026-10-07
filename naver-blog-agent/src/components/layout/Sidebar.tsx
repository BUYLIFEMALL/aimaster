"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";
import { APP_VERSION } from "@/lib/version";

const MENU_ITEMS = [
  { href: "/collector", icon: "🔥", label: "글감 수집 (떡상·트렌드)", desc: "뉴스·URL·화제 검색 글감 수집" },
  { href: "/", icon: "✍️", label: "블로그 글 자동 생성", desc: "5단계 AI 기획·작성·윤문" },
  { href: "/dashboard", icon: "📊", label: "운영 대시보드", desc: "블로그 운영 현황 및 통계" },
  { href: "/accounts", icon: "👥", label: "네이버 계정·카테고리", desc: "다중 블로그 ID & 키워드 설정" },
  { href: "/queue", icon: "🚀", label: "발행 대기 큐 & 이력", desc: "스마트에디터 ONE 자동 발행 현황" },
  { href: "/settings", icon: "🔑", label: "API키등록·플랫폼연동", desc: "AI 키 등록 & 크롬 확장 페어링" },
  { href: "/guide", icon: "📖", label: "연동 & 사용 매뉴얼", desc: "크롬 확장 설치 및 네이버 연동 가이드" },
];

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-r md:border-neutral-200 md:bg-white md:p-4">
      <div className="md:min-h-0 md:overflow-y-auto flex flex-col h-full">
        {/* 헤더 브랜딩 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 px-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-sm shadow-sm">
              N
            </span>
            <div className="text-lg font-bold text-neutral-900 tracking-tight">
              네이버 블로그 에이전트
            </div>
          </div>
          <div className="flex items-center gap-2 px-2 mt-1.5">
            <span className="inline-block rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-semibold text-neutral-600">
              {APP_VERSION}
            </span>
            <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              확장 연동형
            </span>
          </div>
          <a
            href="https://www.buylife.xyz/programs"
            className="mt-2.5 block px-2 text-xs text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            ← 다른 프로그램 보기
          </a>
        </div>

        {/* 내비게이션 메뉴 */}
        <nav className="space-y-1.5">
          {MENU_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-neutral-900 text-white shadow-sm"
                    : "text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="leading-tight">{item.label}</div>
                  <div
                    className={`text-[11px] mt-0.5 truncate ${
                      isActive ? "text-neutral-300" : "text-neutral-400"
                    }`}
                  >
                    {item.desc}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* 사용자 계정 정보 & 로그아웃 (메뉴 바로 밑 위치 규격) */}
        <div className="mt-6 pt-4 border-t border-neutral-100">
          <div className="rounded-xl bg-neutral-50 p-3">
            <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              로그인 계정
            </div>
            <div className="mt-1 truncate text-xs font-medium text-neutral-800" title={userEmail}>
              {userEmail || "로그인 사용자"}
            </div>
            <form action={signOutAction} className="mt-2.5">
              <button
                type="submit"
                className="w-full rounded-lg border border-neutral-200 bg-white py-1.5 text-center text-xs font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
              >
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </div>
    </aside>
  );
}
