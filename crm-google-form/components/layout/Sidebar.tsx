"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

// 접수 처리는 "구글폼 연결 → 접수 내역 확인" 순서로 진행되는 핵심 흐름이라 사이드바도 위→아래
// 스텝퍼로 보여준다. RCS 프로모션 발송은 이 흐름에 속하지 않는 부가 기능이라 번호 없이 별도로
// 두고, 발송 계정 설정(SMTP/SOLAPI)은 API키등록·플랫폼연동 성격의 유틸리티로 맨 아래 분리한다.
const FLOW_STEPS = [
  { step: 1, href: "/sources", label: "구글폼 연결" },
  { step: 2, href: "/submissions", label: "접수 내역" },
];

const EXTRA_ITEMS = [{ href: "/promotions", label: "📢 RCS 프로모션 발송" }];

const UTILITY_ITEMS = [{ href: "/settings", label: "🔑 API키등록·플랫폼연동" }];

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-full flex-col border-b border-neutral-200 bg-white p-4 md:h-full md:w-60 md:justify-between md:border-b-0 md:border-r">
      <div>
        <div className="mb-4 md:mb-6">
          <div className="px-2 text-lg font-semibold text-neutral-900">구글폼 CRM 자동화</div>
          <a
            href={`${MAIN_SITE_URL}/programs`}
            className="block px-2 text-xs text-neutral-500 hover:text-neutral-900"
          >
            ← 다른 프로그램 보기
          </a>
        </div>

        <nav className="relative flex flex-col">
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

                {/* 라벨 */}
                <div className={`min-w-0 flex-1 rounded-lg px-2 py-1.5 ${isActive ? "bg-sky-50" : "group-hover:bg-neutral-50"}`}>
                  <p className={`text-sm font-bold ${isActive ? "text-sky-700" : "text-neutral-800"}`}>
                    {item.label}
                  </p>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="mt-3">
          {EXTRA_ITEMS.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? "bg-sky-50 text-sky-700" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

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
                {item.label}
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
