"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_VERSION, APP_NAME } from "@/lib/version";
import { MessagesSquare, FileText, KeyRound, LogOut, Menu, X, BookOpen, Bot } from "lucide-react";

interface SidebarProps {
  userEmail?: string;
}

// 좌측 메뉴(docs/SIDEBAR_LAYOUT_STANDARD.md): 계정·로그아웃은 마지막 메뉴 바로 아래에 붙인다(빈 공간으로 밀어내지 않음).
const MAIN_ITEMS = [
  { href: "/chat", label: "AI 채팅", description: "질문하면 내 문서·웹을 근거로 답변", icon: MessagesSquare },
  { href: "/documents", label: "내 문서", description: "PDF·문서 올리기 (RAG 검색용)", icon: FileText },
];
const UTILITY_ITEMS = [
  { href: "/guide", label: "📖 연동 & 사용 매뉴얼", icon: BookOpen },
  { href: "/settings", label: "API키등록·플랫폼연동", icon: KeyRound },
];

function BrandMark({ size = 18 }: { size?: number }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 via-violet-500 to-sky-500 text-white shadow-md shadow-indigo-500/20">
      <Bot size={size} />
    </div>
  );
}

function NavBody({ userEmail, onNavigate }: SidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="min-h-0 overflow-y-auto p-3">
      <p className="mb-2 px-2 text-[11px] font-medium tracking-wider text-slate-500">챗봇</p>
      <div className="space-y-1">
        {MAIN_ITEMS.map(({ href, label, description, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={`block rounded-xl px-3 py-2.5 transition-all ${active ? "border border-indigo-500/30 bg-indigo-500/15" : "border border-transparent hover:bg-[#161922]"}`}
            >
              <p className={`flex items-center gap-2 text-sm font-bold ${active ? "text-indigo-200" : "text-slate-300"}`}>
                <Icon size={15} className={active ? "text-indigo-300" : "text-slate-400"} />
                {label}
              </p>
              <p className="mt-0.5 pl-6 text-[11px] leading-snug text-slate-500">{description}</p>
            </Link>
          );
        })}
      </div>

      <div className="mt-3 space-y-1 border-t border-[#1f2433] pt-3">
        <p className="mb-1.5 px-2 text-[11px] font-medium tracking-wider text-slate-500">도움말 & 설정</p>
        {UTILITY_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                active ? "border border-indigo-500/30 bg-indigo-500/15 font-bold text-indigo-200" : "text-slate-400 hover:bg-[#161922] hover:text-slate-200"
              }`}
            >
              <Icon size={16} className={active ? "text-indigo-300" : "text-slate-400"} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>

      {/* 계정: 마지막 메뉴 바로 아래 */}
      <div className="mt-3 space-y-1 border-t border-[#1f2433] pt-3">
        <p className="truncate px-3 py-1.5 text-xs text-slate-500" title={userEmail}>
          {userEmail || "로그인 계정"}
        </p>
        <form action="/api/auth/logout" method="POST">
          <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-[#161922] hover:text-slate-200">
            <LogOut size={16} />
            <span>로그아웃</span>
          </button>
        </form>
      </div>
    </nav>
  );
}

export function Sidebar({ userEmail }: SidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* 데스크톱(768px 이상): 고정 좌측 바 */}
      <aside className="hidden h-screen w-64 shrink-0 select-none flex-col border-r border-[#1f2433] bg-[#090b10] md:sticky md:top-0 md:flex">
        <div className="border-b border-[#1f2433] p-5">
          <Link href="/chat" className="flex items-center gap-3">
            <BrandMark />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-bold leading-snug text-slate-100">{APP_NAME}</p>
              <span className="mt-0.5 inline-flex rounded-full border border-indigo-500/20 bg-indigo-500/10 px-1.5 text-[10px] font-medium text-indigo-300">{APP_VERSION}</span>
            </div>
          </Link>
          <a className="mt-2.5 block text-xs text-slate-400 transition-colors hover:text-slate-200" href="https://www.buylife.xyz/programs">
            ← 다른 프로그램 보기
          </a>
        </div>
        <NavBody userEmail={userEmail} />
      </aside>

      {/* 휴대폰(767px 이하): 상단 고정 헤더 + ☰ 메뉴 */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-[#1f2433] bg-[#090b10]/95 px-4 backdrop-blur-md md:hidden">
        <Link href="/chat" className="flex min-w-0 items-center gap-2">
          <BrandMark size={15} />
          <span className="truncate text-sm font-bold text-slate-100">{APP_NAME}</span>
          <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-1.5 text-[10px] text-indigo-300">{APP_VERSION}</span>
        </Link>
        <button type="button" aria-label={open ? "메뉴 닫기" : "메뉴 열기"} onClick={() => setOpen((v) => !v)} className="rounded-lg p-2 text-slate-300 hover:bg-[#161922]">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <div className="relative z-10 flex h-full w-72 max-w-[80vw] flex-col border-r border-[#1f2433] bg-[#090b10] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1f2433] p-4">
              <span className="text-sm font-bold text-slate-100">{APP_NAME}</span>
              <button type="button" aria-label="메뉴 닫기" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-[#161922] hover:text-slate-200">
                <X size={18} />
              </button>
            </div>
            <a className="block border-b border-[#1f2433] px-4 py-2.5 text-xs text-slate-400 hover:text-slate-200" href="https://www.buylife.xyz/programs">
              ← 다른 프로그램 보기
            </a>
            <NavBody userEmail={userEmail} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="h-14 w-full shrink-0 md:hidden" />
    </>
  );
}
