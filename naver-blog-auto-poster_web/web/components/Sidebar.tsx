"use client";
// v1.05 흰색 표준 좌측 메뉴(docs/SIDEBAR_LAYOUT_STANDARD.md): 프로그램명·버전 → 다른 프로그램 보기 → 작업 흐름 1·2·3 → API키등록·플랫폼연동·연동 매뉴얼 → 계정·로그아웃(마지막 메뉴 바로 아래).
// 화면이 한 장이라 작업 흐름은 같은 페이지의 구역으로 이동한다. 휴대폰 폭(767px 이하)에서는 위쪽 ☰ 메뉴로 바뀐다.
import { useState } from "react";
import { BookOpen, KeyRound, LogOut, Menu, PenLine, X } from "lucide-react";
import { APP_VERSION, MAIN_SITE_ORIGIN } from "@/lib/version";

const FLOW = [
  { href: "#download", title: "크롬 확장 다운로드", desc: "설치 파일 받기" },
  { href: "#howto", title: "사용 방법", desc: "설치 · 연동 · 발행 순서" },
  { href: "#tokens", title: "기기 연동 토큰", desc: "토큰 발급 · 폐기" },
];

export function Sidebar({ userEmail }: { userEmail: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    setError("");
    try {
      const res = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      if (!res.ok) throw new Error();
      window.location.assign(`${MAIN_SITE_ORIGIN}/login`);
    } catch { setError("로그아웃에 실패했습니다. 다시 시도해 주세요."); }
  }
  const menu = (
    <>
      <div className="shrink-0 border-b border-slate-200 px-5 py-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white"><PenLine size={18} /></span>
          <div><strong className="block text-sm text-slate-900">네이버 블로그 자동화(Web)</strong><small className="text-xs text-slate-500">{APP_VERSION}</small></div>
        </div>
        <a className="mt-3 block text-xs text-slate-500 hover:text-slate-900" href={`${MAIN_SITE_ORIGIN}/programs`}>← 다른 프로그램 보기</a>
      </div>
      <nav className="min-h-0 shrink overflow-y-auto px-3 py-4" aria-label="프로그램 메뉴">
        <p className="px-2 pb-2 text-[11px] font-semibold text-slate-400">작업 흐름</p>
        <ol className="relative space-y-1 before:absolute before:bottom-6 before:left-[22px] before:top-6 before:w-px before:bg-slate-200">
          {FLOW.map((f, i) => (
            <li key={f.href}>
              <a href={f.href} onClick={() => setOpen(false)} className="relative flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
                <span className="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">{i + 1}</span>
                <span><strong className="block text-sm text-slate-900">{f.title}</strong><small className="text-xs text-slate-500">{f.desc}</small></span>
              </a>
            </li>
          ))}
        </ol>
        <div className="mt-3 space-y-1 border-t border-slate-200 pt-3">
          <a href={`${MAIN_SITE_ORIGIN}/api-settings`} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-50"><KeyRound size={16} />API키등록·플랫폼연동</a>
          <a href="#guides" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-50"><BookOpen size={16} />연동 매뉴얼</a>
        </div>
      </nav>
      <div className="mx-3 mt-2 shrink-0 border-t border-slate-200 px-2 pb-4 pt-3">
        <p className="truncate text-xs text-slate-500" title={userEmail}>{userEmail}</p>
        <button type="button" onClick={logout} className="mt-2 flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900"><LogOut size={14} />로그아웃</button>
        {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    </>
  );
  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">{menu}</aside>
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white md:hidden">
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <strong className="text-slate-900">네이버 블로그 자동화(Web) <small className="font-normal text-slate-500">{APP_VERSION}</small></strong>
          <button type="button" aria-label={open ? "메뉴 닫기" : "메뉴 열기"} aria-expanded={open} onClick={() => setOpen(!open)} className="p-1 text-slate-700">{open ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
        {open && <div className="flex max-h-[calc(100dvh-52px)] flex-col overflow-auto">{menu}</div>}
      </div>
    </>
  );
}
