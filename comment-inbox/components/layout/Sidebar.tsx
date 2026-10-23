"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";
import { APP_VERSION } from "@/lib/version";

// INSTA 댓글·DM 자동화(v1.24)와 같은 「인스타 다크 스튜디오」 메뉴 구조를 받은편지함용으로 줄인 것.
// 브랜드+버전 → 받은편지함(전체·플랫폼별) → 원래 프로그램 바로가기 → 도움말 → 계정(메뉴 바로 아래, SIDEBAR_LAYOUT_STANDARD).
type FilterItem = { key: string; icon: string; label: string };

const FILTERS: FilterItem[] = [
  { key: "all", icon: "📥", label: "전체" },
  { key: "ig_dm", icon: "💌", label: "인스타 DM" },
  { key: "ig_comment", icon: "📸", label: "인스타 댓글" },
  { key: "threads", icon: "🧵", label: "쓰레드 댓글" },
  { key: "youtube", icon: "▶️", label: "유튜브 댓글" },
];

const SOURCE_LINKS = [
  { href: "https://instagram-comment-reply.buylife.xyz", label: "INSTA 댓글·DM 자동화" },
  { href: "https://threads-comment-reply.buylife.xyz", label: "쓰레드 댓글 자동화" },
  { href: "https://youtube-auto-reply.buylife.xyz", label: "유튜브 댓글 자동화" },
];

function BrandIcon() {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-sm shadow-sm">
      📥
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

export function Sidebar({ userEmail, counts }: { userEmail: string; counts: Record<string, number> }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const current = pathname === "/inbox" ? (searchParams.get("p") ?? "all") : null;

  useEffect(() => {
    setOpen(false);
  }, [pathname, searchParams]);

  const navLinks = (
    <>
      <div className="mb-2 px-2 text-[11px] font-semibold text-ig-muted">📥 받은편지함</div>
      <nav className="flex flex-col space-y-1">
        {FILTERS.map((f) => {
          const active = current === f.key;
          const count = counts[f.key] ?? 0;
          return (
            <Link
              key={f.key}
              href={f.key === "all" ? "/inbox" : `/inbox?p=${f.key}`}
              className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-bold transition-all ${
                active
                  ? "border border-pink-500/40 bg-gradient-to-r from-pink-500/15 via-rose-500/15 to-purple-600/15 text-pink-300 shadow-sm"
                  : "text-slate-300 hover:bg-ig-raised hover:text-ig-text"
              }`}
            >
              <span>{f.icon}</span>
              <span className="flex-1">{f.label}</span>
              {count > 0 && <span className="rounded-full bg-ig-primary px-2 py-0.5 text-[10px] font-bold text-white">{count}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 border-t border-ig-border pt-3.5">
        <div className="mb-1.5 px-2 text-[11px] font-semibold text-ig-muted">원래 프로그램(설정·연결·이력)</div>
        {SOURCE_LINKS.map((s) => (
          <a
            key={s.href}
            href={s.href}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-ig-muted transition-all hover:bg-ig-raised hover:text-slate-200"
          >
            <span>↗</span>
            <span>{s.label}</span>
          </a>
        ))}
      </div>

      <div className="mt-4 border-t border-ig-border pt-3.5">
        <div className="mb-1.5 px-2 text-[11px] font-semibold text-ig-muted">도움말</div>
        <Link
          href="/guide"
          className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
            pathname === "/guide" ? "border border-pink-500/30 bg-pink-500/10 font-bold text-pink-300" : "text-ig-muted hover:bg-ig-raised hover:text-slate-200"
          }`}
        >
          <span>📖</span>
          <span>사용 매뉴얼</span>
        </Link>
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
        <span className="text-base font-bold leading-tight text-slate-100">댓글·DM 통합 받은편지함</span>
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
            <span className="truncate text-sm font-bold text-slate-100">댓글·DM 통합 받은편지함</span>
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
