"use client";
import { useState } from "react";
import { BookOpen, KeyRound, LogOut, Menu, PenLine, X } from "lucide-react";
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
          <span className="brand-icon"><PenLine size={20} /></span>
          <div>
            <strong>{APP_NAME}</strong>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
              <small>{APP_VERSION}</small>
              <span style={{ fontSize: "10px", fontWeight: "750", color: "#6366f1", letterSpacing: "0.04em" }}>FOCUS STUDIO</span>
            </div>
          </div>
        </a>
        <a className="other-programs" href={`${MAIN_SITE}/programs`}>← 다른 프로그램 보기</a>
      </div>
      <nav className="sidebar-nav" aria-label="프로그램 메뉴">
        <p className="nav-caption">작업 워크플로우</p>
        <a className="flow-item" aria-current={currentPath === "/dashboard" || currentPath.startsWith("/editor") ? "page" : undefined} href="/dashboard">
          <span className="step-number">1</span>
          <div><strong>새 글 · 분석</strong><small>초안 생성 · 글 다듬기 · 에디터</small></div>
        </a>
        <a className="flow-item" aria-current={currentPath === "/documents" ? "page" : undefined} href="/documents">
          <span className="step-number">2</span>
          <div><strong>내 문서 보관함</strong><small>자동 저장 · 이어쓰기 · 내보내기</small></div>
        </a>
        <div className="utility-menu">
          <p className="nav-caption" style={{ marginTop: "4px" }}>매뉴얼 & 연동</p>
          <a className="nav-item guide-nav" aria-current={currentPath === "/guide" ? "page" : undefined} href="/guide">
            <BookOpen size={16} /><span>📖 연동 & 사용 매뉴얼</span>
          </a>
          <a className="nav-item" aria-current={currentPath === "/settings" ? "page" : undefined} href="/settings">
            <KeyRound size={16} /><span>🔑 API키등록·플랫폼연동</span>
          </a>
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
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="brand-icon" style={{ width: "26px", height: "26px", borderRadius: "8px" }}><PenLine size={15} /></span>
            <strong>{APP_NAME}</strong>
            <span style={{ fontSize: "10px", padding: "1px 5px", background: "#eef2ff", color: "#4f46e5", borderRadius: "5px", fontWeight: "700" }}>{APP_VERSION}</span>
          </div>
          <button type="button" aria-label={open ? "메뉴 닫기" : "메뉴 열기"} onClick={() => setOpen((v) => !v)}>{open ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
        {open && <div className="mobile-menu">{menu}</div>}
      </div>
    </>
  );
}
