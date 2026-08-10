import Link from "next/link";
import { signOutAction } from "@/lib/actions/auth";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

const NAV_ITEMS = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/districts", label: "관심 지역 설정" },
  { href: "/listings", label: "매물 목록" },
  { href: "/settings", label: "설정 (API키·텔레그램)" },
];

export function Sidebar({ userEmail }: { userEmail: string }) {
  return (
    <aside className="flex w-full flex-col border-b border-white/10 bg-dark-50 p-4 md:h-full md:w-60 md:justify-between md:border-b-0 md:border-r">
      <div className="flex items-center justify-between md:block">
        <a
          href={`${MAIN_SITE_URL}/programs`}
          className="gold-text mb-1 block px-2 text-lg font-semibold hover:opacity-80 md:mb-1"
        >
          부동산 실시간 매매정보
        </a>
        <a
          href={`${MAIN_SITE_URL}/programs`}
          className="mb-4 block px-2 text-xs text-neutral-500 hover:text-gold-light md:mb-6"
        >
          ← 다른 프로그램 보기
        </a>
        <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-300 hover:bg-dark-100 hover:text-gold-light"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mt-4 border-t border-white/10 pt-4 md:mt-0">
        <p className="mb-2 truncate px-2 text-xs text-neutral-500">{userEmail}</p>
        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-neutral-400 hover:bg-dark-100"
          >
            로그아웃
          </button>
        </form>
      </div>
    </aside>
  );
}
