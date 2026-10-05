"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";
import { APP_VERSION } from "@/lib/version";

const OVERVIEW_ITEM = { href: "/", icon: "🏠", label: "대시보드" };

const FLOW_STEPS = [
  { step: 1, href: "/search", icon: "🔎", label: "쇼츠 검색", desc: "떡상 영상 찾기" },
  { step: 2, href: "/analyze", icon: "🧬", label: "바이럴 분석", desc: "성공 공식 해체" },
  { step: 3, href: "/ideate", icon: "💡", label: "소재 발굴", desc: "새 소재 6개 제안" },
  { step: 4, href: "/select", icon: "🎯", label: "주제 확정", desc: "전략 확인 · 요청 추가" },
  { step: 5, href: "/script", icon: "📝", label: "대본 생성", desc: "씬별 나레이션 · 연출" },
  { step: 6, href: "/prompts", icon: "🎨", label: "프롬프트", desc: "이미지 · 영상 · BGM" },
];

const UTILITY_ITEMS = [
  { href: "/vault", icon: "📚", label: "프롬프트 보관함" },
  { href: "/settings", icon: "🔑", label: "API키등록·플랫폼연동" },
];

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="flex w-full flex-col border-b border-neutral-200 bg-white p-4 md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r">
      <div className="flex h-full flex-col md:min-h-0 md:overflow-y-auto">
        <div className="mb-5">
          <div className="flex items-center gap-2 px-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 text-sm font-bold text-white">
              ▶
            </span>
            <div className="text-[15px] font-bold leading-tight tracking-tight text-neutral-900">
              쇼츠 떡상 분석·대본
            </div>
          </div>
          <div className="mt-1 px-2">
            <span className="inline-block rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-semibold text-neutral-600">
              {APP_VERSION}
            </span>
          </div>
          <a
            href="https://www.buylife.xyz/dashboard"
            className="mt-2 block px-2 text-xs text-neutral-500 transition-colors hover:text-neutral-900"
          >
            ← 다른 프로그램 보기
          </a>
        </div>

        <nav className="space-y-1">
          <Link
            href={OVERVIEW_ITEM.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
              isActive(OVERVIEW_ITEM.href) ? "bg-rose-50 text-rose-700" : "text-neutral-700 hover:bg-neutral-100"
            }`}
          >
            <span className="text-lg leading-none">{OVERVIEW_ITEM.icon}</span>
            <span>{OVERVIEW_ITEM.label}</span>
          </Link>

          <div className="relative pt-1">
            <div className="absolute bottom-6 left-[22px] top-6 w-px bg-neutral-200" aria-hidden />
            {FLOW_STEPS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-start gap-3 rounded-xl px-3 py-2 transition-all ${
                    active ? "bg-rose-50" : "hover:bg-neutral-100"
                  }`}
                >
                  <span
                    className={`z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      active ? "bg-rose-600 text-white" : "bg-neutral-200 text-neutral-600"
                    }`}
                  >
                    {item.step}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-medium leading-tight ${active ? "text-rose-700" : "text-neutral-800"}`}>
                      {item.icon} {item.label}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-neutral-400">{item.desc}</div>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="my-2 border-t border-neutral-100" />

          {UTILITY_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive(item.href) ? "bg-rose-50 text-rose-700" : "text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-4 shrink-0 border-t border-neutral-100 pt-4">
          <div className="rounded-xl bg-neutral-50 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">로그인 계정</div>
            <div className="mt-1 truncate text-xs font-medium text-neutral-800" title={userEmail}>
              {userEmail || "로그인 사용자"}
            </div>
            <form action={signOutAction} className="mt-2.5">
              <button
                type="submit"
                className="w-full rounded-lg border border-neutral-200 bg-white py-1.5 text-center text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
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
