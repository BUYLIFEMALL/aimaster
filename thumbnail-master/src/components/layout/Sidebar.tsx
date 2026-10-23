"use client";
import { useState } from "react";
import { BookOpen, KeyRound, LayoutDashboard, LogOut, Menu, Clapperboard, Megaphone, X } from "lucide-react";
import { APP_NAME, APP_VERSION, MAIN_SITE } from "@/lib/version";

export function Sidebar({ userEmail, currentPath }: { userEmail?: string; currentPath: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      if (!response.ok) throw new Error();
      window.location.assign("/login");
    } catch {
      setError("로그아웃에 실패했습니다. 다시 시도해 주세요.");
    }
  }

  const menu = (
    <>
      <div className="sidebar-brand">
        <a href="/dashboard" className="brand-row">
          <span className="brand-icon"><Clapperboard size={20} /></span>
          <div><strong>{APP_NAME}</strong><small>{APP_VERSION}</small></div>
        </a>
        <a className="other-programs" href={`${MAIN_SITE}/programs`}>← 다른 프로그램 보기</a>
      </div>
      <nav className="sidebar-nav" aria-label="프로그램 메뉴">
        <a className="nav-item" aria-current={currentPath === "/dashboard" ? "page" : undefined} href="/dashboard"><LayoutDashboard size={17} />내 프로젝트</a>
        <p className="nav-caption">작업 흐름</p>
        <a className="flow-item" aria-current={currentPath.startsWith("/project") ? "page" : undefined} href="/open#topic">
          <span className="step-number">1</span><div><strong>주제 · 피사체</strong><small>주제 · 대본 · 인물/사물</small></div>
        </a>
        <a className="flow-item" href="/open#strategy">
          <span className="step-number">2</span><div><strong>타겟 · 전략</strong><small>시청층 · A/B 문구 · 스타일</small></div>
        </a>
        <a className="flow-item" href="/open#result">
          <span className="step-number">3</span><div><strong>생성 · 수정</strong><small>2종 생성 · 수정 요청 · 다운로드</small></div>
        </a>
        <p className="nav-caption">업로드 준비</p>
        {/* 2026-10-20 병합 D: AI 유튜브 썸네일 프로의 SEO 전략 */}
        <a className="nav-item" aria-current={currentPath === "/seo" ? "page" : undefined} href="/seo"><Megaphone size={17} />SEO 전략 (제목·설명·태그)</a>
        <div className="utility-menu">
          <a className="nav-item" aria-current={currentPath === "/settings" ? "page" : undefined} href="/settings"><KeyRound size={17} />API키등록·플랫폼연동</a>
          <a className="nav-item" aria-current={currentPath === "/guide" ? "page" : undefined} href="/guide"><BookOpen size={17} />연동 & 사용 매뉴얼</a>
        </div>
      </nav>
      <div className="sidebar-account">
        <p title={userEmail}>{userEmail || "로그인 계정"}</p>
        <button type="button" onClick={logout}><LogOut size={16} />로그아웃</button>
        {error && <p role="alert" className="error">{error}</p>}
      </div>
    </>
  );

  return (
    <>
      <aside className="desktop-sidebar">{menu}</aside>
      <div className="mobile-sidebar">
        <div className="mobile-header">
          <strong>{APP_NAME}</strong>
          <button type="button" aria-label={open ? "메뉴 닫기" : "메뉴 열기"} onClick={() => setOpen((v) => !v)}>{open ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
        {open && <div className="mobile-menu">{menu}</div>}
      </div>
    </>
  );
}
