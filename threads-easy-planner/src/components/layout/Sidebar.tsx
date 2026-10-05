"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";
import { APP_VERSION } from "@/lib/version";

const MENU_ITEMS = [
  { href: "/", icon: "✏️", label: "스레드 기획기", desc: "주제 추천 및 원클릭 글 생성" },
  { href: "/saved", icon: "📁", label: "내 콘텐츠 보관함", desc: "저장한 글 불러오기 & 수정" },
  { href: "/settings", icon: "🔑", label: "API키 등록·관리", desc: "OpenAI, Gemini 키 등록" },
  { href: "/guide", icon: "📖", label: "사용 매뉴얼", desc: "기획부터 저장·활용 순서 가이드" },
];

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-r md:border-neutral-200 md:bg-white md:p-4">
      <div className="md:min-h-0 md:overflow-y-auto flex flex-col h-full">
        {/* 헤더 브랜딩 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 px-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 text-white font-bold text-sm">
              @
            </span>
            <div className="text-lg font-bold text-neutral-900 tracking-tight">
              Threads AI 기획기
            </div>
          </div>
          <div className="flex items-center gap-2 px-2 mt-1">
            <span className="inline-block rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-semibold text-neutral-600">
              {APP_VERSION}
            </span>
            <span className="text-[11px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">
              초간편판
            </span>
          </div>
          <a
            href="https://www.buylife.xyz/dashboard"
            className="mt-2 block px-2 text-xs text-neutral-500 hover:text-neutral-900 transition-colors"
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

        {/* 하단 꿀팁 배너 */}
        <div className="mt-auto pt-6 text-[11px] text-neutral-400 px-2 leading-relaxed hidden md:block">
          💡 <strong>Tip:</strong> 스레드는 첫 문장에서 스크롤을 멈추고 마지막 댓글에서 반응을 끌어내는 것이 핵심입니다.
        </div>
      </div>
    </aside>
  );
}
