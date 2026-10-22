"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Clapperboard, Film, KeyRound, LogOut, Menu, X } from "lucide-react";
import { APP_VERSION } from "@/lib/version";
import { signOutAction } from "@/lib/actions/auth";

// AI 이미지·음악 스튜디오 사이드바와 같은 구조(주인님 지시: 「ai-image-studio처럼」), 강조색만 하늘색(sky).
const MAIN_ITEMS = [
  { href: "/create", icon: Clapperboard, label: "영상 생성 작업실", description: "플랫폼·모델·옵션을 골라 AI 영상 생성" },
  { href: "/library", icon: Film, label: "작업 결과 갤러리", description: "완성 영상 보기·내려받기 (30일 보관)" },
];
const UTILITY_ITEMS = [
  { href: "/guide", icon: BookOpen, label: "연동 & 사용 매뉴얼" },
  { href: "/settings", icon: KeyRound, label: "API키등록·플랫폼연동" },
];

function BrandMark() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white shadow-md shadow-sky-500/20">
      <Clapperboard size={18} aria-hidden="true" />
    </span>
  );
}

function Version() {
  return <span className="mt-0.5 inline-flex rounded-full border border-sky-500/20 bg-sky-500/10 px-1.5 text-[10px] font-medium text-sky-300">{APP_VERSION}</span>;
}

function NavBody({ userEmail, onNavigate }: { userEmail: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <div className="min-h-0 overflow-y-auto p-3">
      <nav aria-label="영상 스튜디오 메뉴">
        <p className="mb-2 px-2 text-[11px] font-medium tracking-wider text-zinc-500">영상 작업</p>
        <div className="space-y-1">
          {MAIN_ITEMS.map(({ href, icon: Icon, label, description }) => (
            <Link key={href} href={href} onClick={onNavigate} aria-current={active(href) ? "page" : undefined}
              className={`block rounded-xl border px-3 py-2.5 transition-colors ${active(href) ? "border-sky-500/30 bg-sky-500/10" : "border-transparent hover:bg-zinc-900"}`}>
              <p className={`flex items-center gap-2 text-sm font-bold ${active(href) ? "text-sky-200" : "text-zinc-300"}`}>
                <Icon size={15} className={`shrink-0 ${active(href) ? "text-sky-300" : "text-zinc-400"}`} aria-hidden="true" />
                {label}
              </p>
              <p className="mt-0.5 pl-6 text-[11px] leading-snug text-zinc-500">{description}</p>
            </Link>
          ))}
        </div>
        <div className="mt-3 space-y-1 border-t border-zinc-800/80 pt-3">
          <p className="mb-1.5 px-2 text-[11px] font-medium tracking-wider text-zinc-500">도움말 & 설정</p>
          {UTILITY_ITEMS.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href} onClick={onNavigate} aria-current={active(href) ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${active(href) ? "border-sky-500/30 bg-sky-500/10 text-sky-200" : "border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"}`}>
              <Icon size={16} className="shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
      {/* 계정은 마지막 메뉴 바로 아래에 두고 화면 맨 아래로 밀지 않습니다. */}
      <div className="mt-3 space-y-1 border-t border-zinc-800/80 pt-3">
        <p className="truncate px-3 py-1.5 text-xs text-zinc-500" title={userEmail}>{userEmail || "로그인 계정"}</p>
        <form action={signOutAction}>
          <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-200">
            <LogOut size={16} aria-hidden="true" />
            <span>로그아웃</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export function Sidebar({ userEmail = "" }: { userEmail?: string }) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const close = () => setOpen(false);

  return (
    <>
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-zinc-800/80 bg-[#09090b] md:sticky md:top-0 md:flex">
        <div className="shrink-0 border-b border-zinc-800/80 p-5">
          <Link href="/create" className="flex items-center gap-3">
            <BrandMark />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-snug text-white">AI 영상 스튜디오</p>
              <Version />
            </div>
          </Link>
          <a href="https://www.buylife.xyz/programs" className="mt-2.5 block text-xs text-zinc-400 transition-colors hover:text-zinc-200">← 다른 프로그램 보기</a>
        </div>
        <NavBody userEmail={userEmail} />
      </aside>

      <div className="sticky top-0 z-40 border-b border-zinc-800/80 bg-[#09090b] md:hidden"
        onKeyDown={(event) => { if (event.key === "Escape" && open) { close(); toggle.current?.focus(); } }}>
        <div className="flex h-14 items-center justify-between gap-2 px-4">
          <Link href="/create" onClick={close} className="flex min-w-0 items-center gap-2">
            <BrandMark />
            <span className="truncate text-sm font-bold text-white">AI 영상 스튜디오</span>
            <Version />
          </Link>
          <button ref={toggle} type="button" aria-label={open ? "메뉴 닫기" : "메뉴 열기"} aria-expanded={open} aria-controls="music-studio-mobile-menu"
            onClick={() => setOpen(value => !value)} className="shrink-0 rounded-lg p-2 text-zinc-300 hover:bg-zinc-900">
            {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
        <div id="music-studio-mobile-menu" hidden={!open} className="max-h-[calc(100dvh-56px)] overflow-y-auto">
          <a href="https://www.buylife.xyz/programs" className="mx-5 mt-3 block text-xs text-zinc-400 hover:text-zinc-200">← 다른 프로그램 보기</a>
          <NavBody userEmail={userEmail} onNavigate={close} />
        </div>
      </div>
    </>
  );
}
