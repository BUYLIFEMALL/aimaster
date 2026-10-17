"use client";

import { useState } from "react";
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
  { href: "/guide", icon: "📖", label: "연동 & 사용 매뉴얼" },
];

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const renderNavContent = () => (
    <>
      <div className="mb-5">
        <div className="flex items-center gap-2 px-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-600 text-sm font-bold text-white shadow-sm shadow-rose-900/50">
            ▶
          </span>
          <div className="text-[15px] font-bold leading-tight tracking-tight text-[#f0f6fc]">
            쇼츠 떡상 분석·대본
          </div>
        </div>
        <div className="mt-1 flex items-center gap-2 px-2">
          <span className="inline-block rounded border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[11px] font-bold text-rose-400">
            {APP_VERSION}
          </span>
          <span className="text-[10px] text-[#8b949e]">플로우 위저드</span>
        </div>
        <a
          href="https://www.buylife.xyz/programs"
          className="mt-2.5 block px-2 text-xs text-[#8b949e] transition-colors hover:text-[#f0f6fc]"
        >
          ← 다른 프로그램 보기
        </a>
      </div>

      <nav className="space-y-1" onClick={() => setOpen(false)}>
        <Link
          href={OVERVIEW_ITEM.href}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
            isActive(OVERVIEW_ITEM.href)
              ? "border border-rose-500/30 bg-rose-500/15 text-rose-300 font-bold"
              : "text-[#8b949e] hover:bg-[#21262d] hover:text-[#f0f6fc]"
          }`}
        >
          <span className="text-lg leading-none">{OVERVIEW_ITEM.icon}</span>
          <span>{OVERVIEW_ITEM.label}</span>
        </Link>

        <div className="relative pt-1.5 pb-1">
          <div className="absolute bottom-6 left-[22px] top-6 w-px bg-[#30363d]" aria-hidden />
          {FLOW_STEPS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-start gap-3 rounded-xl px-3 py-2 transition-all ${
                  active
                    ? "border border-rose-500/30 bg-rose-500/15"
                    : "hover:bg-[#21262d]"
                }`}
              >
                <span
                  className={`z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-transform ${
                    active
                      ? "bg-rose-600 text-white shadow-sm shadow-rose-900/60 scale-105"
                      : "bg-[#21262d] border border-[#30363d] text-[#8b949e]"
                  }`}
                >
                  {item.step}
                </span>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-semibold leading-tight ${active ? "text-rose-300" : "text-[#c9d1d9]"}`}>
                    {item.icon} {item.label}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-[#8b949e]">{item.desc}</div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="my-2 border-t border-[#30363d]" />

        <div className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-[#8b949e]">
          유틸리티 & 매뉴얼
        </div>

        {UTILITY_ITEMS.map((item) => {
          const active = isActive(item.href);
          const isGuide = item.href === "/guide";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? isGuide
                    ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 font-bold"
                    : "border border-rose-500/30 bg-rose-500/15 text-rose-300 font-bold"
                  : isGuide
                  ? "text-emerald-400 hover:bg-[#21262d] hover:text-emerald-300"
                  : "text-[#8b949e] hover:bg-[#21262d] hover:text-[#f0f6fc]"
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto shrink-0 border-t border-[#30363d] pt-4">
        <div className="rounded-xl border border-[#30363d] bg-[#0d1117] p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8b949e]">로그인 계정</div>
          <div className="mt-1 truncate text-xs font-semibold text-[#f0f6fc]" title={userEmail}>
            {userEmail || "로그인 사용자"}
          </div>
          <form action={signOutAction} className="mt-2.5">
            <button
              type="submit"
              className="w-full rounded-lg border border-[#30363d] bg-[#21262d] py-1.5 text-center text-xs font-semibold text-[#c9d1d9] transition-colors hover:bg-[#30363d] hover:text-white"
            >
              로그아웃
            </button>
          </form>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* 모바일 상단 56px 고정 헤더 (375px 대응) */}
      <div className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-[#30363d] bg-[#161b22]/95 px-4 backdrop-blur md:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-600 text-sm font-bold text-white shadow-sm shadow-rose-900/50">
            ▶
          </span>
          <span className="truncate text-[15px] font-bold text-[#f0f6fc]">쇼츠 떡상 분석·대본</span>
          <span className="shrink-0 rounded border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[11px] font-bold text-rose-400">
            {APP_VERSION}
          </span>
        </div>
        <button
          type="button"
          aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 rounded-lg border border-[#30363d] bg-[#21262d] p-2 text-base leading-none text-[#f0f6fc] transition-colors hover:bg-[#30363d]"
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {/* 모바일 슬라이드 드로어 오버레이 */}
      {open && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="relative flex w-[290px] max-w-[85vw] flex-col border-r border-[#30363d] bg-[#161b22] p-4 text-[#f0f6fc] shadow-2xl overflow-y-auto z-10">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#30363d]">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-600 text-sm font-bold text-white">▶</span>
                <span className="text-sm font-bold text-[#f0f6fc]">메뉴</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-sm text-[#8b949e] hover:bg-[#21262d] hover:text-[#f0f6fc]"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
            {renderNavContent()}
          </div>
        </div>
      )}

      {/* 데스크톱 좌측 고정 사이드바 */}
      <aside className="hidden md:flex md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-r md:border-[#30363d] md:bg-[#161b22] p-4 md:overflow-y-auto">
        {renderNavContent()}
      </aside>
    </>
  );
}
