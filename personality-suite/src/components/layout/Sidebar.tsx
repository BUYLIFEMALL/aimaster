"use client";
import { useState } from "react";
import { BookOpen, KeyRound, LogOut, Menu, Sparkles, X } from "lucide-react";
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
          <span className="brand-icon"><Sparkles size={20} /></span>
          <div><strong>{APP_NAME}</strong><small>{APP_VERSION}</small></div>
        </a>
        <a className="other-programs" href={`${MAIN_SITE}/programs`}>← 다른 프로그램 보기</a>
      </div>
      <nav className="sidebar-nav" aria-label="프로그램 메뉴">
        <p className="nav-caption">작업 흐름</p>
        <a className="flow-item" aria-current={currentPath === "/dashboard" || currentPath.startsWith("/test/") ? "page" : undefined} href="/dashboard">
          <span className="step-number">1</span><div><strong>검사하기</strong><small>상황별 16유형 · 심리·마음 점검</small></div>
        </a>
        <a className="flow-item" aria-current={currentPath === "/history" || currentPath.startsWith("/result/") ? "page" : undefined} href="/history">
          <span className="step-number">2</span><div><strong>내 결과</strong><small>결과 보기 · AI 심층 분석</small></div>
        </a>
        <a className="flow-item" aria-current={currentPath === "/profile" ? "page" : undefined} href="/profile">
          <span className="step-number">3</span><div><strong>종합 프로필</strong><small>여러 검사를 하나로 해석</small></div>
        </a>
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
