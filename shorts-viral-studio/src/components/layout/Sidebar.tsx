"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";
import { APP_VERSION, APP_NAME_LINE1, APP_NAME_LINE2 } from "@/lib/version";

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
  { href: "/settings", icon: "🔑", label: "API키 등록 · 플랫폼 연동" },
  { href: "/guide", icon: "📖", label: "연동 & 사용 매뉴얼" },
];

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const renderNavContent = () => (
    <>
      <div className="mb-5 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5 px-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-700 text-sm font-black text-white shadow-md shadow-red-500/30">
            ▶
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-black leading-snug tracking-tight text-slate-900">
              <span>{APP_NAME_LINE1}</span>
              <span className="block text-red-600">{APP_NAME_LINE2}</span>
            </div>
            <div className="text-[10px] font-bold tracking-wider text-slate-400">SHORTS VIRAL STUDIO</div>
          </div>
          <span className="inline-block shrink-0 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-black text-red-600 shadow-sm">
            {APP_VERSION}
          </span>
        </div>

        <a
          href="https://www.buylife.xyz/programs"
          className="mt-3 block px-2 text-xs font-semibold text-slate-400 transition-colors hover:text-red-600"
        >
          ← 다른 프로그램 보기
        </a>
      </div>

      <nav className="space-y-1" onClick={() => setOpen(false)}>
        <Link
          href={OVERVIEW_ITEM.href}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
            isActive(OVERVIEW_ITEM.href)
              ? "border border-red-200 bg-red-50 text-red-600 font-bold shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <span className="text-lg leading-none">{OVERVIEW_ITEM.icon}</span>
          <span>{OVERVIEW_ITEM.label}</span>
        </Link>

        <div className="relative pt-1.5 pb-1">
          <div className="absolute bottom-6 left-[22px] top-6 w-px bg-slate-200" aria-hidden />
          {FLOW_STEPS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-start gap-3 rounded-xl px-3 py-2 transition-all ${
                  active
                    ? "border border-red-200 bg-red-50/80 shadow-sm"
                    : "hover:bg-slate-100"
                }`}
              >
                <span
                  className={`z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black transition-transform ${
                    active
                      ? "bg-red-600 text-white shadow-sm shadow-red-500/40 scale-105"
                      : "bg-white border border-slate-300 text-slate-500"
                  }`}
                >
                  {item.step}
                </span>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-bold leading-tight ${active ? "text-red-600" : "text-slate-800"}`}>
                    {item.icon} {item.label}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] font-medium text-slate-500">{item.desc}</div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="my-3 border-t border-slate-200 pt-3">
          <div className="px-3 pb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
            도구 및 플랫폼 설정
          </div>
          {UTILITY_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                  active
                    ? "border border-red-200 bg-red-50 text-red-600 font-bold"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* 🎬 쇼츠 원스톱 직결 연계 배너 */}
        <div className="rounded-xl border border-red-200 bg-gradient-to-br from-red-50 to-rose-50 p-3 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-black text-red-700">
            <span>🎬</span>
            <span>원스톱 영상 파이프라인</span>
          </div>
          <p className="mt-1 text-[11px] leading-tight text-slate-600">
            분석·생성된 씬 대본은 <strong>shorts-onestop-studio</strong>로 원클릭 전달됩니다.
          </p>
          <a
            href="https://shorts-onestop-studio.buylife.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2.5 flex items-center justify-center gap-1 rounded-lg bg-red-600 py-1.5 text-center text-xs font-bold text-white shadow-sm transition hover:bg-red-700"
          >
            <span>스튜디오 열기</span>
            <span>↗</span>
          </a>
        </div>
      </nav>

      <div className="mt-auto border-t border-slate-200 pt-4">
        <div className="flex items-center justify-between px-2">
          <div className="min-w-0">
            <div className="truncate text-xs font-bold text-slate-800">{userEmail || "사용자"}</div>
            <div className="text-[10px] font-medium text-slate-400">로그인 세션 활성</div>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-red-600"
              title="로그아웃"
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
      {/* 데스크톱 사이드바 (화이트 & 레드 스튜디오) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-4 lg:flex shadow-sm">
        {renderNavContent()}
      </aside>

      {/* 모바일 헤더 */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-xs font-black text-white">
            ▶
          </span>
          <span className="text-sm font-black text-slate-900">{APP_NAME_LINE1} {APP_NAME_LINE2}</span>
          <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600 border border-red-200">
            {APP_VERSION}
          </span>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-100"
          aria-label="메뉴 열기"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* 모바일 드로어 */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="fixed inset-y-0 left-0 flex w-72 flex-col bg-white p-4 shadow-2xl">
            {renderNavContent()}
          </div>
        </div>
      )}
    </>
  );
}
