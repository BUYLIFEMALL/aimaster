"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";
import { APP_VERSION, APP_NAME_LINE1, APP_NAME_LINE2 } from "@/lib/version";

// docs/SIDEBAR_LAYOUT_STANDARD.md 공식 필수 순서:
// 1. 브랜드 헤더 2열 문맥 줄바꿈 + 버전 뱃지
// 2. ← 다른 프로그램 보기 (https://www.buylife.xyz/programs)
// 3. 🏠 대시보드
// 4. 번호가 붙은 핵심 작업 흐름 (Step 1~6 + 세로 연결선)
// 5. 구분선
// 6. 🔑 API키등록·플랫폼연동
// 7. 📖 연동 & 사용 매뉴얼
// 8. 마지막 메뉴 바로 아래 8~16px 밀착 계정 이메일과 로그아웃

const OVERVIEW_ITEM = { href: "/", icon: "🏠", label: "바이럴 스튜디오 홈" };

const FLOW_STEPS = [
  { step: 1, href: "/search", icon: "🔎", label: "쇼츠 떡상 검색", desc: "VPH & 대박 영상 탐지" },
  { step: 2, href: "/analyze", icon: "🧬", label: "바이럴 구조 해체", desc: "첫 3초 훅 & 락인 공식" },
  { step: 3, href: "/ideate", icon: "💡", label: "킬러 소재 발굴", desc: "새 소재 6종 제안" },
  { step: 4, href: "/select", icon: "🎯", label: "주제·전략 확정", desc: "타겟 시청층 & 훅 선택" },
  { step: 5, href: "/script", icon: "📝", label: "15·30·60s 대본", desc: "씬별 1문장 원칙 나레이션" },
  { step: 6, href: "/prompts", icon: "🎨", label: "9:16 비주얼 프롬프트", desc: "미드저니 & 영상 NLE 직결" },
];

const UTILITY_ITEMS = [
  { href: "/settings", icon: "🔑", label: "🔑 API키등록·플랫폼연동" },
  { href: "/guide", icon: "📖", label: "📖 연동 & 사용 매뉴얼" },
  { href: "/vault", icon: "📚", label: "📚 프롬프트 보관함" },
];

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const renderNavContent = () => (
    <>
      {/* 1. 프로그램명 & 버전 (2열 문맥 줄바꿈 + 버전 뱃지) */}
      <div className="mb-4 border-b border-slate-100 pb-4 select-none">
        <div className="flex items-center gap-2.5 px-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF1A1A] to-[#E11D48] text-sm font-black text-white shadow-md shadow-red-500/30">
            ▶
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-black leading-snug tracking-tight text-slate-900">
              <span className="block">{APP_NAME_LINE1}</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[#E11D48] font-bold text-xs">{APP_NAME_LINE2}</span>
                <span className="inline-block rounded-md border border-red-200 bg-red-50 px-1.5 py-0.2 font-mono text-[10px] font-black text-[#E11D48]">
                  {APP_VERSION}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. 다른 프로그램 보기 */}
        <a
          href="https://www.buylife.xyz/programs"
          className="mt-2.5 block px-2 text-xs font-semibold text-slate-400 transition-colors hover:text-[#E11D48]"
        >
          ← 다른 프로그램 보기
        </a>
      </div>

      <nav className="flex-1 overflow-y-auto space-y-1 pr-1" onClick={() => setOpen(false)}>
        {/* 3. 대시보드 진입점 */}
        <Link
          href={OVERVIEW_ITEM.href}
          className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
            isActive(OVERVIEW_ITEM.href)
              ? "border-l-4 border-[#E11D48] bg-red-50/80 text-[#E11D48] font-black shadow-xs"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <span className="text-base leading-none">{OVERVIEW_ITEM.icon}</span>
          <span>{OVERVIEW_ITEM.label}</span>
        </Link>

        {/* 4. 번호가 붙은 핵심 작업 흐름 (Step 1~6) */}
        <div className="pt-2 pb-1">
          <div className="px-3 pb-1 text-[10px] font-black uppercase tracking-wider text-[#E11D48]/80">
            쇼츠 바이럴 파이프라인
          </div>
          <div className="relative pt-1">
            <div className="absolute bottom-4 left-[20px] top-4 w-px bg-slate-200" aria-hidden />
            {FLOW_STEPS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-start gap-2.5 rounded-xl px-2.5 py-1.5 transition-all mb-0.5 ${
                    active
                      ? "border-l-4 border-[#E11D48] bg-red-50/90 shadow-xs"
                      : "hover:bg-slate-100"
                  }`}
                >
                  <span
                    className={`z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black transition-transform ${
                      active
                        ? "bg-[#E11D48] text-white shadow-xs scale-105"
                        : "bg-white border border-slate-300 text-slate-500"
                    }`}
                  >
                    {item.step}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={`text-xs font-bold leading-tight ${active ? "text-[#E11D48]" : "text-slate-800"}`}>
                      {item.icon} {item.label}
                    </div>
                    <div className="mt-0.5 truncate text-[10px] font-medium text-slate-500">{item.desc}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* 5. 구분선 아래: 표준 유틸리티 메뉴 */}
        <div className="my-2 border-t border-slate-200 pt-2 space-y-0.5">
          <div className="px-3 pb-1 text-[10px] font-black uppercase tracking-wider text-[#E11D48]/80">
            설정 및 가이드
          </div>
          {UTILITY_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  active
                    ? "border-l-4 border-[#E11D48] bg-red-50/80 text-[#E11D48] font-black"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span className="text-sm leading-none">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* 🎬 쇼츠 원스톱 직결 연계 배너 */}
        <div className="rounded-xl border border-red-200 bg-gradient-to-br from-red-50 to-rose-50 p-2.5 shadow-2xs mt-2">
          <div className="flex items-center gap-1 text-[11px] font-black text-red-700">
            <span>🎬</span>
            <span>원스톱 영상 파이프라인</span>
          </div>
          <p className="mt-1 text-[10px] leading-tight text-slate-600">
            생성된 씬 대본은 <strong>shorts-onestop-studio</strong>로 즉시 전달됩니다.
          </p>
          <a
            href="https://shorts-onestop-studio.buylife.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center justify-center gap-1 rounded-lg bg-[#E11D48] py-1 text-center text-[10px] font-bold text-white shadow-2xs transition hover:bg-red-700"
          >
            <span>영상 제작 스튜디오 열기 ↗</span>
          </a>
        </div>
      </nav>

      {/* 8. 마지막 메뉴 바로 아래 8~16px 밀착: 계정 이메일과 로그아웃 (docs/SIDEBAR_LAYOUT_STANDARD.md §34 준수) */}
      <div className="shrink-0 border-t border-slate-200 pt-3 mt-2 select-none">
        <div className="flex items-center justify-between px-2">
          <div className="min-w-0 flex-1 pr-2">
            <div className="truncate text-[11px] font-mono text-slate-700" title={userEmail}>
              {userEmail || "회원 로그인"}
            </div>
            <div className="text-[10px] font-medium text-emerald-600">● 세션 연결됨</div>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-600 transition hover:bg-red-50 hover:text-[#E11D48] hover:border-red-200"
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
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-3.5 lg:flex shadow-2xs select-none">
        {renderNavContent()}
      </aside>

      {/* 모바일 헤더 */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E11D48] text-xs font-black text-white">
            ▶
          </span>
          <span className="text-sm font-black text-slate-900">{APP_NAME_LINE1} {APP_NAME_LINE2}</span>
          <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-[#E11D48] border border-red-200">
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
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setOpen(false)} />
          <div className="fixed inset-y-0 left-0 flex w-72 flex-col bg-white p-4 shadow-2xl">
            {renderNavContent()}
          </div>
        </div>
      )}
    </>
  );
}
