"use client";
import { useEffect, useState } from "react";
import { BookOpen, Clapperboard, KeyRound, LayoutDashboard, LogOut, Menu, Moon, Sun, X } from "lucide-react";
import { APP_NAME, APP_VERSION, MAIN_SITE } from "@/lib/version";

// 작업 흐름 순서(표준 §2.1: 대시보드 → 번호형 흐름 → 유틸리티 → 계정 밀착)
export const STEPS = [
  { href: "/topic", emoji: "💡", name: "주제·대본", detail: "주제 추천 · AI 대본" },
  { href: "/design", emoji: "🎨", name: "디자인·배경", detail: "테마 · 스톡 · AI 이미지" },
  { href: "/scenes", emoji: "🎬", name: "장면 편집", detail: "카드 편집 · 미리보기" },
  { href: "/render", emoji: "🎙️", name: "음성·자막·영상", detail: "내레이션 · 자막 · 배경음악" },
  { href: "/plan", emoji: "📅", name: "발행 계획", detail: "업로드 일정 · 일괄 제작" },
  { href: "/library", emoji: "🗂️", name: "내 보관함", detail: "프로젝트 · 프리셋 · 지침" },
];

function ThemeToggle() {
  const [light, setLight] = useState(false);
  useEffect(() => { setLight(document.documentElement.getAttribute("data-theme") === "light"); }, []);
  function toggle() {
    const next = !light; setLight(next);
    if (next) document.documentElement.setAttribute("data-theme", "light"); else document.documentElement.removeAttribute("data-theme");
    try { localStorage.setItem("sos-theme", next ? "light" : "dark"); } catch { /* 저장 불가 환경은 이번 화면에만 적용 */ }
  }
  return <button type="button" className="theme-toggle" onClick={toggle}>{light ? <Moon size={15} /> : <Sun size={15} />}{light ? "다크 화면으로" : "라이트 화면으로"}</button>;
}

export function Sidebar({ userEmail, currentPath }: { userEmail?: string; currentPath: string }) {
  const [open, setOpen] = useState(false), [error, setError] = useState("");
  async function logout() {
    try { const r = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }); if (!r.ok) throw new Error(); window.location.assign("/login"); }
    catch { setError("로그아웃하지 못했습니다. 다시 시도해 주세요."); }
  }
  const cur = (href: string) => (currentPath === href || currentPath.startsWith(`${href}/`) ? "page" : undefined);
  const menu = (
    <>
      <div className="sidebar-brand">
        <a className="brand-row" href="/dashboard"><span className="brand-icon"><Clapperboard size={18} /></span><div><strong>{APP_NAME}</strong><small>{APP_VERSION}</small></div></a>
        <a className="other-programs" href={`${MAIN_SITE}/programs`}>← 다른 프로그램 보기</a>
      </div>
      <nav className="sidebar-nav" aria-label="프로그램 메뉴">
        <a className="nav-item" aria-current={cur("/dashboard")} href="/dashboard" onClick={() => setOpen(false)}><LayoutDashboard size={16} />🏠 대시보드</a>
        <p className="nav-caption">작업 흐름</p>
        <div className="flow-list">
          {STEPS.map((s, i) => (
            <a key={s.href} className="flow-item" aria-current={cur(s.href)} href={s.href} onClick={() => setOpen(false)}>
              <span className="step-number">{i + 1}</span><div><strong>{s.emoji} {s.name}</strong><small>{s.detail}</small></div>
            </a>
          ))}
        </div>
        <div className="utility-menu">
          <a className="nav-item" aria-current={cur("/settings")} href="/settings"><KeyRound size={15} />🔑 API키등록·플랫폼연동</a>
          <a className="nav-item" aria-current={cur("/guide")} href="/guide"><BookOpen size={15} />📖 연동 & 사용 매뉴얼</a>
          <ThemeToggle />
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
