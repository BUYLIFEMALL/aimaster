"use client";
import { useState } from "react";
import { BookOpen, Images, KeyRound, LogOut, Menu, Palette, X } from "lucide-react";
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
        <a href="/studio" className="brand-row">
          <span className="brand-icon" style={{ fontSize: "18px" }}>🍌</span>
          <div><strong>{APP_NAME}</strong><small>{APP_VERSION}</small></div>
        </a>
        <a className="other-programs" href={`${MAIN_SITE}/programs`}>← 다른 프로그램 보기</a>
      </div>
      <nav className="sidebar-nav" aria-label="프로그램 메뉴">
        <p className="nav-caption">작업 흐름</p>
        <a className="flow-item" aria-current={currentPath === "/studio" ? "page" : undefined} href="/studio#source">
          <span className="step-number">1</span><div><strong>원본 이미지</strong><small>업로드 · 이미지 없이 만들기</small></div>
        </a>
        <a className="flow-item" href="/studio#source">
          <span className="step-number">2</span><div><strong>작업 카드 실행</strong><small>생성 · 편집 · 합성 · 빠른 작업</small></div>
        </a>
        <a className="flow-item" href="/studio#result">
          <span className="step-number">3</span><div><strong>결과</strong><small>다운로드 · 계속 편집</small></div>
        </a>
        <div className="utility-menu">
          <a className="nav-item" aria-current={currentPath === "/history" ? "page" : undefined} href="/history"><Images size={17} />내 결과 기록</a>
          <a className="nav-item" aria-current={currentPath === "/settings" ? "page" : undefined} href="/settings"><KeyRound size={17} />API키등록·플랫폼연동</a>
          <a className="nav-item" aria-current={currentPath === "/guide" ? "page" : undefined} href="/guide"><BookOpen size={17} />📖 연동 & 사용 매뉴얼</a>
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
          <span style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700 }}>
            <span style={{ fontSize: "18px" }}>🍌</span> {APP_NAME} <small style={{ color: "var(--brand)", fontSize: "11px", fontWeight: 800 }}>{APP_VERSION}</small>
          </span>
          <button type="button" aria-label={open ? "메뉴 닫기" : "메뉴 열기"} onClick={() => setOpen((v) => !v)}>{open ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
        {open && <div className="mobile-menu">{menu}</div>}
      </div>
    </>
  );
}
