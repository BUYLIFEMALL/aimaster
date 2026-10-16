"use client";
import { useState } from "react";
import { Clapperboard, KeyRound, LogOut, Menu, X } from "lucide-react";
import { APP_NAME, APP_VERSION, MAIN_SITE } from "@/lib/version";

// 작업 흐름 순서(주제·대본 → 디자인·배경 → 장면 편집 → 음성·자막·렌더 → 발행 계획 → 보관함)
export const STEPS = [
  { href: "/topic", name: "주제·대본", detail: "주제 추천 · AI 대본" },
  { href: "/design", name: "디자인·배경", detail: "테마 · 스톡 · AI 이미지" },
  { href: "/scenes", name: "장면 편집", detail: "카드 편집 · 미리보기" },
  { href: "/render", name: "음성·자막·영상", detail: "내레이션 · 자막 · MP4" },
  { href: "/plan", name: "발행 계획", detail: "업로드 일정 · 일괄 제작" },
  { href: "/library", name: "내 보관함", detail: "프로젝트 · 프리셋 · 지침" },
];

export function Sidebar({ userEmail, currentPath }: { userEmail?: string; currentPath: string }) {
  const [open, setOpen] = useState(false), [error, setError] = useState("");
  async function logout() {
    try { const r = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }); if (!r.ok) throw new Error(); window.location.assign("/login"); }
    catch { setError("로그아웃하지 못했습니다. 다시 시도해 주세요."); }
  }
  const menu = (
    <>
      <div className="sidebar-brand">
        <a className="brand-row" href="/topic"><span className="brand-icon"><Clapperboard size={18} /></span><div><strong>{APP_NAME}</strong><small>{APP_VERSION}</small></div></a>
        <a className="other-programs" href={`${MAIN_SITE}/programs`}>← 다른 프로그램 보기</a>
      </div>
      <nav className="sidebar-nav" aria-label="프로그램 메뉴">
        <p className="nav-caption">작업 흐름</p>
        {STEPS.map((s, i) => (
          <a key={s.href} className="flow-item" aria-current={currentPath.startsWith(s.href) ? "page" : undefined} href={s.href} onClick={() => setOpen(false)}>
            <span className="step-number">{i + 1}</span><div><strong>{s.name}</strong><small>{s.detail}</small></div>
          </a>
        ))}
        <div className="utility-menu">
          <a className="nav-item" aria-current={currentPath === "/settings" ? "page" : undefined} href="/settings"><KeyRound size={15} />API키등록·플랫폼연동</a>
        </div>
      </nav>
      <div className="sidebar-account">
        <p title={userEmail}>{userEmail || "로그인 계정"}</p>
        <button type="button" onClick={() => void logout()}><LogOut size={14} />로그아웃</button>
        {error && <p role="alert" className="error">{error}</p>}
      </div>
    </>
  );
  return (
    <>
      <aside className="desktop-sidebar">{menu}</aside>
      <div className="mobile-sidebar">
        <div className="mobile-header"><strong>{APP_NAME} <small>{APP_VERSION}</small></strong><button type="button" aria-label={open ? "메뉴 닫기" : "메뉴 열기"} aria-expanded={open} onClick={() => setOpen((p) => !p)}>{open ? <X size={22} /> : <Menu size={22} />}</button></div>
        {open && <div className="mobile-menu">{menu}</div>}
      </div>
    </>
  );
}
