"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_VERSION } from "@/lib/version";

const MOBILE_MENU_ITEMS = [
  { href: "/", icon: "✍️", label: "기획하기" },
  { href: "/saved", icon: "📁", label: "보관함" },
  { href: "/settings", icon: "🔑", label: "설정" },
];

export function MobileNavigation() {
  const pathname = usePathname();

  return (
    <>
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-sm font-bold text-white">@</span>
          <span className="truncate text-sm font-black text-neutral-900">Threads AI 기획기</span>
          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-500">{APP_VERSION}</span>
        </Link>
        <Link href="/guide" className="rounded-lg bg-neutral-100 px-2.5 py-1.5 text-[11px] font-bold text-neutral-700">사용 매뉴얼</Link>
      </header>

      <nav className="md:hidden fixed inset-x-0 bottom-0 z-50 grid grid-cols-3 border-t border-neutral-200 bg-white/95 px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        {MOBILE_MENU_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-bold transition-colors ${
                isActive ? "bg-neutral-900 text-white" : "text-neutral-500 hover:bg-neutral-100"
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
