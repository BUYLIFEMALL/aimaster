import Link from "next/link";
import { signOutAction } from "@/lib/actions/auth";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

// shots(유튜브 쇼츠 자동화)의 좌측 메뉴 포맷을 그대로 따른다 — 번호가 곧 파이프라인 순서.
// Phase 1(상품분석/이미지생성)만 구현됐으므로 지금은 그 두 단계만 올리고, Phase 2~4가
// 실제로 만들어질 때마다 항목을 추가한다(AGENTS.md "Phase 진행 상태" 표와 동기화할 것).
const NAV_ITEMS = [
  { href: "/products/new", label: "1. 상품 및 상세페이지 분석" },
  { href: "/products", label: "2. 상세페이지 생성|관리" },
  { href: "/settings", label: "🔑 API 키 설정" },
];

export function Sidebar({ userEmail }: { userEmail: string }) {
  return (
    <aside className="flex w-full flex-col border-b border-neutral-200 bg-white p-4 md:h-full md:w-60 md:justify-between md:border-b-0 md:border-r">
      <div className="flex items-center justify-between md:block">
        <div>
          <div className="px-2 text-lg font-semibold text-neutral-900">
            상세페이지 자동화(15p)
          </div>
          <a
            href={`${MAIN_SITE_URL}/programs`}
            className="mb-4 block px-2 text-xs text-neutral-500 hover:text-neutral-900 md:mb-6"
          >
            ← 다른 프로그램 보기
          </a>
        </div>
        <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
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
