"use client";

// 89. 듀얼 런치패드 미션 스타일(2026-11-10 주인님 2안 채택) — 상단 가로 메뉴.
// 데스크톱(768px 이상): 네이비 가로 바. 휴대폰(767px 이하): ☰ 버튼으로 같은 항목을 펼침.
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";
import { APP_VERSION } from "@/lib/version";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "🏠 오늘의 발행" },
  { href: "/write", label: "✍️ 원고 만들기" },
  { href: "/posts", label: "📚 보관함·발행 결과" },
  { href: "/connect", label: "🔗 블로그 연결" },
  { href: "/settings", label: "⚙️ AI 키·모델" },
  { href: "/guide", label: "📖 연동 & 사용 매뉴얼" },
];

function Brand() {
  return (
    <Link href="/dashboard" className="block shrink-0 leading-tight">
      <span className="block text-[15px] font-black text-white">
        AI 워드프레스·<br className="hidden lg:block" />구글블로그
      </span>
      <span className="block text-[10px] font-semibold text-sky-200/80">WP · BLOGGER AUTO · {APP_VERSION}</span>
    </Link>
  );
}

function Account({ email }: { email: string }) {
  return (
    <form action={signOutAction} className="flex items-center gap-2 text-xs text-sky-100">
      <span className="max-w-[180px] truncate" title={email}>{email}</span>
      <button type="submit" className="inline-flex items-center gap-1 rounded-full border border-white/25 px-2.5 py-1 font-semibold hover:bg-white/10">
        <LogOut className="h-3 w-3" /> 로그아웃
      </button>
    </form>
  );
}

export function TopNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isOn = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 bg-[#0f2a4a] text-white shadow-lg">
      <div className="mx-auto flex max-w-[1440px] items-center gap-4 px-4 py-3 md:px-8">
        <Brand />
        <nav className="hidden flex-1 flex-wrap items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-3.5 py-2 text-[13px] font-bold transition-colors ${
                isOn(item.href) ? "bg-white text-[#0f2a4a]" : "text-sky-100 hover:bg-white/10"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden flex-col items-end gap-1 md:flex">
          <Account email={userEmail} />
          <a href="https://www.buylife.xyz/programs" className="text-[11px] text-sky-200/80 hover:text-white">
            ← 다른 프로그램 보기
          </a>
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="ml-auto flex h-10 w-10 items-center justify-center rounded-xl border border-white/25 md:hidden"
          aria-label="메뉴 열기"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 px-4 pb-4 md:hidden">
          <nav className="flex flex-col gap-1 pt-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`rounded-xl px-4 py-3 text-sm font-bold ${isOn(item.href) ? "bg-white text-[#0f2a4a]" : "text-sky-100"}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3">
            <Account email={userEmail} />
            <a href="https://www.buylife.xyz/programs" className="text-xs text-sky-200/80">← 다른 프로그램 보기</a>
          </div>
        </div>
      )}
    </header>
  );
}
