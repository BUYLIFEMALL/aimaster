import Link from "next/link";
import { signOutAction } from "@/lib/actions/auth";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

const NAV_ITEMS = [
  { href: "/candidates", label: "1. 최신 쇼츠 주제 수집" },
  { href: "/scripts", label: "2. 영상스크립트 생성" },
  { href: "/images", label: "3. 이미지 생성" },
  { href: "/music", label: "4. 음악 생성" },
  { href: "/videos", label: "5. 영상 포스팅" },
  { href: "/settings", label: "🔑 API 키 설정" },
];

export function Sidebar({ userEmail }: { userEmail: string }) {
  return (
    <aside className="flex w-full flex-col border-b border-neutral-200 bg-white p-4 md:h-full md:w-60 md:justify-between md:border-b-0 md:border-r">
      <div className="flex items-center justify-between md:block">
        <div>
          <div className="px-2 text-lg font-semibold text-neutral-900">유튜브 쇼츠 자동 생성</div>
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
