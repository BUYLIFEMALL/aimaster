"use client";
import { useState } from "react";
import { BookOpen, KeyRound, LayoutDashboard, LogOut, Menu, Clapperboard, Megaphone, X, Zap, Activity } from "lucide-react";
import { APP_NAME_LINE1, APP_NAME_LINE2, APP_VERSION, MAIN_SITE } from "@/lib/version";

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
          <span className="brand-icon"><Zap size={20} /></span>
          <div>
            <strong>{APP_NAME_LINE1}</strong>
            <small>{APP_NAME_LINE2} {APP_VERSION}</small>
          </div>
        </a>
        <a className="other-programs" href={`${MAIN_SITE}/programs`}>← 다른 프로그램 보기</a>
      </div>
      <nav className="sidebar-nav" aria-label="프로그램 메뉴">
        <a className="nav-item" aria-current={currentPath === "/dashboard" ? "page" : undefined} href="/dashboard">
          <LayoutDashboard size={17} />
          <span>🛸 NLE 워크스페이스</span>
        </a>
        
        <p className="nav-caption">초고속 썸네일 파이프라인</p>
        <a className="flow-item" aria-current={currentPath.startsWith("/project") ? "page" : undefined} href="/open#topic">
          <span className="step-number">1</span>
          <div>
            <strong>주제 · 피사체 훅</strong>
            <small>주제 · 대본 · 킬러 피사체</small>
          </div>
        </a>
        <a className="flow-item" href="/open#strategy">
          <span className="step-number">2</span>
          <div>
            <strong>타겟 · CTR 전략</strong>
            <small>시청층 · A/B 문구 · 네온 스타일</small>
          </div>
        </a>
        <a className="flow-item" href="/open#result">
          <span className="step-number">3</span>
          <div>
            <strong>하이퍼 렌더 · 다운로드</strong>
            <small>2종 동시 생성 · 초고화질 출력</small>
          </div>
        </a>

        <p className="nav-caption">업로드 & 검색 노출</p>
        <a className="nav-item" aria-current={currentPath === "/seo" ? "page" : undefined} href="/seo">
          <Megaphone size={17} />
          <span>SEO 전략 (제목·설명·태그)</span>
        </a>

        <div className="utility-menu">
          <a className="nav-item" aria-current={currentPath === "/settings" ? "page" : undefined} href="/settings">
            <KeyRound size={17} />
            <span>보안 키 터미널 (API 설정)</span>
          </a>
          <a className="nav-item" aria-current={currentPath === "/guide" ? "page" : undefined} href="/guide">
            <BookOpen size={17} />
            <span>비주얼 뇌과학 가이드</span>
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
          <strong>{APP_NAME_LINE1}</strong>
          <button type="button" aria-label={open ? "메뉴 닫기" : "메뉴 열기"} onClick={() => setOpen((v) => !v)}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {open && <div className="mobile-menu">{menu}</div>}
      </div>
    </>
  );
}
