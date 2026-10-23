"use client";
import { useState } from "react";
import { BookOpen, History, KeyRound, LogOut, Menu, ScanSearch, X, Sparkles } from "lucide-react";
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
        <a href="/analyze" className="brand-row">
          <span className="brand-icon"><ScanSearch size={20} /></span>
          <div>
            <strong>{APP_NAME}</strong>
            <small>{APP_VERSION} ARCHITECT</small>
          </div>
        </a>
        <a className="other-programs" href={`${MAIN_SITE}/programs`}>← 다른 프로그램 보기</a>
      </div>
      <nav className="sidebar-nav" aria-label="프로그램 메뉴">
        <p className="nav-caption">작업 흐름</p>
        <a className="flow-item" aria-current={currentPath === "/analyze" ? "page" : undefined} href="/analyze#upload">
          <span className="step-number">1</span>
          <div>
            <strong>파일 올리기</strong>
            <small>이미지 · 동영상 · 오디오</small>
          </div>
        </a>
        <a className="flow-item" href="/analyze#options">
          <span className="step-number">2</span>
          <div>
            <strong>분석 옵션</strong>
            <small>대상 도구 · 언어 · 길이</small>
          </div>
        </a>
        <a className="flow-item" href="/history">
          <span className="step-number">3</span>
          <div>
            <strong>결과 · 기록</strong>
            <small>프롬프트 복사 · 내보내기</small>
          </div>
        </a>

        <div className="utility-menu">
          <p className="nav-caption" style={{ margin: "4px 8px 8px" }}>도구 및 가이드</p>
          <a className="nav-item" aria-current={currentPath === "/history" ? "page" : undefined} href="/history">
            <History size={17} />내 분석 기록
          </a>
          <a className="nav-item" aria-current={currentPath === "/settings" ? "page" : undefined} href="/settings">
            <KeyRound size={17} />API키등록·플랫폼연동
          </a>
          <a 
            className="nav-item" 
            aria-current={currentPath === "/guide" ? "page" : undefined} 
            href="/guide"
            style={{
              position: "relative",
              border: currentPath === "/guide" ? "1px solid rgba(245, 158, 11, 0.4)" : "1px solid rgba(245, 158, 11, 0.2)",
              background: currentPath === "/guide" ? "rgba(245, 158, 11, 0.15)" : "rgba(245, 158, 11, 0.05)",
              color: currentPath === "/guide" ? "#fbbf24" : "#f59e0b",
              fontWeight: 700
            }}
          >
            <BookOpen size={17} />
            <span>📖 연동 & 사용 매뉴얼</span>
            <span style={{
              marginLeft: "auto",
              fontSize: "10px",
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              color: "#0b0e14",
              padding: "1px 6px",
              borderRadius: "4px",
              fontWeight: 800
            }}>GUIDE</span>
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
            <span className="brand-icon" style={{ width: "26px", height: "26px" }}><ScanSearch size={15} /></span>
            <strong>{APP_NAME}</strong>
            <span style={{ fontSize: "10px", color: "#f59e0b", background: "rgba(245, 158, 11, 0.15)", padding: "1px 5px", borderRadius: "4px" }}>{APP_VERSION}</span>
          </div>
          <button type="button" aria-label={open ? "메뉴 닫기" : "메뉴 열기"} onClick={() => setOpen((v) => !v)}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {open && <div className="mobile-menu">{menu}</div>}
      </div>
    </>
  );
}
