"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";
import { APP_VERSION } from "@/lib/version";

// 2026-10-20 v1.24: INSTA 포스팅 자동화와 같은 「인스타 다크 스튜디오」 메뉴 구조(주인님 지시 「템플릿을 맞춰」).
// 브랜드+버전 배지 → 대시보드 → 댓글 파이프라인(번호 단계) → DM 답변(번호 단계) → 도움말 & 설정 → 계정(메뉴 바로 아래, SIDEBAR_LAYOUT_STANDARD).
type StepItem = { href: string; icon: string; label: string; step: number; description: string; badge?: "comment"; exact?: boolean };
type UtilItem = { href: string; icon: string; label: string; exact?: boolean };

const OVERVIEW_ITEM = { href: "/dashboard", icon: "🏠", label: "대시보드" };

const COMMENT_STEPS: StepItem[] = [
  { step: 1, href: "/media", icon: "🖼️", label: "게시물 관리", description: "게시물 동기화 + 답글 대상 고르기" },
  { step: 2, href: "/comments", icon: "💬", label: "댓글 검토/게시", description: "AI 답글 초안 검토 후 게시", badge: "comment" },
  { step: 3, href: "/history", icon: "📊", label: "답글·DM 이력", description: "게시·발송한 기록 보기" },
];

const DM_STEPS: StepItem[] = [
  { step: 1, href: "/dm", icon: "✉️", label: "DM 홈", description: "24시간 기한 임박 대화", exact: true },
  { step: 2, href: "/dm/conversations", icon: "💌", label: "DM 검토/발송", description: "AI 답장 초안 검토 후 발송" },
  { step: 3, href: "/dm/settings", icon: "⚙️", label: "DM 답변 설정", description: "웹훅·봇 켜기·말투·텔레그램" },
];

const UTILITY_ITEMS: UtilItem[] = [
  { href: "/settings", icon: "🔑", label: "API키등록·플랫폼연동" },
  { href: "/guide", icon: "📖", label: "연동 & 사용 매뉴얼" },
];

function BrandIcon() {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-sm shadow-sm">
      💬
    </span>
  );
}

function VersionBadge({ small = false }: { small?: boolean }) {
  return (
    <span className={`rounded-full border border-pink-500/30 bg-pink-500/10 px-2 py-0.5 font-bold text-pink-400 ${small ? "text-[10px]" : "text-[11px]"}`}>
      {APP_VERSION}
    </span>
  );
}

export function Sidebar({ userEmail, pendingCount }: { userEmail: string; pendingCount: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname?.startsWith(`${href}/`) || (href === "/history" && pathname === "/dm/history");

  function renderSteps(title: string, steps: StepItem[]) {
    return (
      <div className="mt-4">
        <div className="mb-2 px-2 text-[11px] font-semibold text-ig-muted">{title}</div>
        <nav className="flex flex-col space-y-1">
          {steps.map((item, idx) => {
            const active = isActive(item.href, item.exact);
            const isLast = idx === steps.length - 1;
            return (
              <Link key={item.href} href={item.href} className="group relative flex gap-3 rounded-xl p-2 transition-all hover:bg-ig-raised">
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                      active
                        ? "bg-gradient-to-tr from-pink-500 to-purple-600 text-white shadow-sm"
                        : "border border-ig-border bg-ig-bg text-ig-muted group-hover:border-slate-500 group-hover:text-ig-text"
                    }`}
                  >
                    {item.step}
                  </span>
                  {!isLast && <span className="mt-1 w-px flex-1 bg-ig-border" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`flex items-center gap-1.5 text-sm font-bold transition-colors ${active ? "text-pink-300" : "text-slate-300 group-hover:text-ig-text"}`}>
                    <span className="truncate">
                      {item.icon} {item.label}
                    </span>
                    {item.badge === "comment" && pendingCount > 0 && (
                      <span className="rounded-full bg-ig-primary px-2 py-0.5 text-[10px] font-bold text-white">{pendingCount}</span>
                    )}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-tight text-ig-muted">{item.description}</p>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    );
  }

  const navLinks = (
    <>
      <Link
        href={OVERVIEW_ITEM.href}
        className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-bold transition-all ${
          isActive(OVERVIEW_ITEM.href)
            ? "border border-pink-500/40 bg-gradient-to-r from-pink-500/15 via-rose-500/15 to-purple-600/15 text-pink-300 shadow-sm"
            : "text-slate-300 hover:bg-ig-raised hover:text-ig-text"
        }`}
      >
        <span>{OVERVIEW_ITEM.icon}</span>
        <span>{OVERVIEW_ITEM.label}</span>
      </Link>

      {renderSteps("💬 댓글 자동답글", COMMENT_STEPS)}
      <div className="mt-4 border-t border-ig-border" />
      {renderSteps("💌 DM 답변", DM_STEPS)}

      <div className="mt-4 border-t border-ig-border pt-3.5">
        <div className="mb-1.5 px-2 text-[11px] font-semibold text-ig-muted">도움말 & 설정</div>
        {UTILITY_ITEMS.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                active ? "border border-pink-500/30 bg-pink-500/10 font-bold text-pink-300" : "text-ig-muted hover:bg-ig-raised hover:text-slate-200"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );

  const account = (
    <div className="mt-4 shrink-0 border-t border-ig-border pt-3.5">
      <p className="mb-2 truncate px-2 text-xs text-ig-muted">{userEmail}</p>
      <form action={signOutAction}>
        <button
          type="submit"
          className="w-full rounded-xl border border-ig-border bg-ig-bg px-3 py-2 text-left text-xs font-semibold text-slate-300 transition-colors hover:bg-ig-raised hover:text-white"
        >
          ↪ 로그아웃
        </button>
      </form>
    </div>
  );

  const brandBlock = (
    <div className="mb-5 px-2">
      <div className="flex items-center gap-2">
        <BrandIcon />
        <span className="text-base font-bold leading-tight text-slate-100">INSTA 댓글·DM 자동화</span>
        <VersionBadge />
      </div>
      <a href="https://www.buylife.xyz/programs" className="mt-2 block text-xs text-ig-muted transition-colors hover:text-slate-200">
        ← 다른 프로그램 보기
      </a>
    </div>
  );

  return (
    <>
      {/* 휴대폰(767px 이하): 위쪽 바 + ☰ 접는 메뉴 */}
      <header className="sticky top-0 z-30 border-b border-ig-border bg-ig-surface/95 backdrop-blur md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex min-w-0 items-center gap-2">
            <BrandIcon />
            <span className="truncate text-sm font-bold text-slate-100">INSTA 댓글·DM 자동화</span>
            <VersionBadge small />
          </div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="메뉴 열기"
            aria-expanded={open}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ig-border bg-ig-bg text-slate-300 hover:text-white"
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
        {open && (
          <div className="max-h-[calc(100vh-56px)] overflow-y-auto border-t border-ig-border px-3 pb-4 pt-3">
            {brandBlock}
            {navLinks}
            {account}
          </div>
        )}
      </header>

      {/* 데스크톱: 좌측 고정 메뉴 */}
      <aside className="hidden border-r border-ig-border bg-ig-surface p-5 md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col">
        {brandBlock}
        <div className="min-h-0 overflow-y-auto pr-1">
          {navLinks}
          {account}
        </div>
      </aside>
    </>
  );
}
