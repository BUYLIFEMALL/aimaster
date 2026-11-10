"use client";

// 좌측 메뉴(docs/SIDEBAR_LAYOUT_STANDARD.md 필수 순서) — 89. 듀얼 런치패드 미션 스타일 네이비.
// 데스크톱(768px 이상): 고정 좌측 바 w-64. 휴대폰(767px 이하): 좌측 바를 숨기고 위쪽 ☰ 바로 같은 항목을 펼침.
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";
import { APP_VERSION } from "@/lib/version";

const PROGRAMS_URL = "https://www.buylife.xyz/programs";
const OVERVIEW_ITEM = { href: "/dashboard", icon: "🏠", label: "오늘의 발행" };
const FLOW_STEPS = [
  { step: 1, href: "/write", icon: "✍️", label: "원고 만들기", description: "주제 → AI 글·이미지 완성" },
  { step: 2, href: "/posts", icon: "🚀", label: "보관함·발행", description: "초안 · 바로 발행 · 예약" },
];
const UTILITY_ITEMS = [
  { href: "/connect", icon: "🔑", label: "API키등록·플랫폼연동", description: "워드프레스·구글 블로그 연결" },
  { href: "/settings", icon: "⚙️", label: "AI 키·모델", description: "등록 상태·모델별 비용" },
  { href: "/guide", icon: "📖", label: "연동 & 사용 매뉴얼" },
];

function useIsOn() {
  const pathname = usePathname();
  return (href: string) => pathname === href || !!pathname?.startsWith(`${href}/`);
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/dashboard" className="block leading-tight">
      <span className={`block font-black text-white ${compact ? "text-[14px]" : "text-[16px]"}`}>AI 워드프레스·</span>
      <span className={`flex items-center gap-1.5 font-black text-white ${compact ? "text-[14px]" : "text-[16px]"}`}>
        구글블로그 자동화
        <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] font-bold text-sky-100">{APP_VERSION}</span>
      </span>
    </Link>
  );
}

function MenuBody({ email, onNavigate }: { email: string; onNavigate?: () => void }) {
  const isOn = useIsOn();
  const itemCls = (on: boolean) =>
    `flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-colors ${
      on ? "bg-white text-[#0f2a4a] shadow" : "text-sky-100 hover:bg-white/10"
    }`;

  return (
    <>
      <nav className="min-h-0 shrink overflow-y-auto pr-1">
        <Link href={OVERVIEW_ITEM.href} onClick={onNavigate} className={itemCls(isOn(OVERVIEW_ITEM.href))}>
          <span>{OVERVIEW_ITEM.icon}</span>
          <span>{OVERVIEW_ITEM.label}</span>
        </Link>

        <p className="mt-4 px-3 text-[10px] font-extrabold tracking-wider text-sky-300/70">매일 하는 일</p>
        <ol className="relative mt-1.5">
          <span className="absolute bottom-6 left-[25px] top-6 w-0.5 bg-white/15" aria-hidden />
          {FLOW_STEPS.map((s) => {
            const on = isOn(s.href);
            return (
              <li key={s.href} className="relative">
                <Link href={s.href} onClick={onNavigate} className={itemCls(on)}>
                  <span
                    className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${
                      on ? "bg-[#16a34a] text-white" : "bg-sky-200 text-[#0f2a4a]"
                    }`}
                  >
                    {s.step}
                  </span>
                  <span className="min-w-0">
                    <span className="block">{s.icon} {s.label}</span>
                    <span className={`block text-[11px] font-medium ${on ? "text-slate-500" : "text-sky-200/70"}`}>{s.description}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>

        <div className="my-3 border-t border-white/10" />

        {UTILITY_ITEMS.map((u) => {
          const on = isOn(u.href);
          return (
            <Link key={u.href} href={u.href} onClick={onNavigate} className={itemCls(on)}>
              <span>{u.icon}</span>
              <span className="min-w-0">
                <span className="block">{u.label}</span>
                {u.description && (
                  <span className={`block text-[11px] font-medium ${on ? "text-slate-500" : "text-sky-200/70"}`}>{u.description}</span>
                )}
              </span>
            </Link>
          );
        })}
      </nav>

      <form action={signOutAction} className="mt-2 shrink-0 border-t border-white/10 px-3 pt-3">
        <p className="truncate text-xs text-sky-100" title={email}>{email}</p>
        <button
          type="submit"
          className="mt-2 inline-flex items-center gap-1 rounded-full border border-white/25 px-2.5 py-1 text-xs font-semibold text-sky-100 hover:bg-white/10"
        >
          <LogOut className="h-3 w-3" /> 로그아웃
        </button>
      </form>
    </>
  );
}

export function Sidebar({ userEmail }: { userEmail: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* 데스크톱 좌측 바 */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-[#0f2a4a] px-3 py-5 text-white md:flex">
        <div className="shrink-0 px-3">
          <Brand />
          <a href={PROGRAMS_URL} className="mt-2 block text-[11px] font-semibold text-sky-200/80 hover:text-white">
            ← 다른 프로그램 보기
          </a>
        </div>
        <div className="mt-5 flex min-h-0 flex-col">
          <MenuBody email={userEmail} />
        </div>
      </aside>

      {/* 휴대폰 위쪽 바(☰) */}
      <header className="sticky top-0 z-40 bg-[#0f2a4a] text-white shadow-lg md:hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <Brand compact />
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-xl border border-white/25"
            aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open && (
          <div className="flex max-h-[calc(100vh-64px)] flex-col border-t border-white/10 px-3 pb-4 pt-2">
            <a href={PROGRAMS_URL} className="mb-2 block px-3 text-xs font-semibold text-sky-200/80">← 다른 프로그램 보기</a>
            <MenuBody email={userEmail} onNavigate={() => setOpen(false)} />
          </div>
        )}
      </header>
    </>
  );
}
