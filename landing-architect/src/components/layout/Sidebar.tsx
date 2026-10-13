"use client";
import { useState } from "react";
import { BookOpen, KeyRound, LayoutDashboard, LogOut, Menu, PencilRuler, X } from "lucide-react";
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
          <span className="brand-icon"><PencilRuler size={20} /></span>
          <div><strong>{APP_NAME}</strong><small>{APP_VERSION}</small></div>
        </a>
        <a className="other-programs" href={`${MAIN_SITE}/programs`}>← 다른 프로그램 보기</a>
      </div>
      <nav className="sidebar-nav" aria-label="프로그램 메뉴">
        <a className="nav-item" aria-current={currentPath === "/dashboard" ? "page" : undefined} href="/dashboard"><LayoutDashboard size={17} />내 프로젝트</a>
        <p className="nav-caption">작업 흐름</p>
        <a className="flow-item" href="/dashboard">
          <span className="step-number">1</span><div><strong>주제 입력</strong><small>주제 · 타겟 · 목표</small></div>
        </a>
        <a className="flow-item" aria-current={currentPath.startsWith("/project") ? "page" : undefined} href="/open">
          <span className="step-number">2</span><div><strong>기획안 · 프로토타입</strong><small>편집 · 생성 · 미리보기</small></div>
        </a>
        <a className="flow-item" href="/dashboard">
          <span className="step-number">3</span><div><strong>내보내기</strong><small>HTML · JSON · 변환 프롬프트</small></div>
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
