"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  Sparkles,
  Target,
  Download,
  Megaphone,
  KeyRound,
  BookOpen,
  LogOut,
  Menu,
  X,
  Zap,
} from "lucide-react";
import { APP_NAME_LINE1, APP_NAME_LINE2, APP_VERSION, MAIN_SITE } from "@/lib/version";

interface SidebarProps {
  userEmail?: string;
  currentPath?: string;
}

export function Sidebar({ userEmail, currentPath = "/dashboard" }: SidebarProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
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
      {/* 1. 프로그램명과 버전 — 2열 문맥 줄바꿈 + 버전 배지 인라인 결합 (docs/SIDEBAR_LAYOUT_STANDARD.md §21) */}
      <div className="sidebar-brand">
        <a href="/dashboard" className="brand-row">
          <span className="brand-icon" aria-hidden="true">
            <Zap size={20} />
          </span>
          <div className="brand-titles">
            <strong className="brand-line1">{APP_NAME_LINE1}</strong>
            <div className="brand-line2-row">
              <span className="brand-line2">{APP_NAME_LINE2}</span>
              <span className="brand-version-badge">{APP_VERSION}</span>
            </div>
          </div>
        </a>
        <a className="other-programs" href={`${MAIN_SITE}/programs`}>
          ← 다른 프로그램 보기
        </a>
      </div>

      {/* 메뉴 리스트 */}
      <nav className="sidebar-nav" aria-label="프로그램 메뉴">
        {/* 3. 대시보드 진입점 */}
        <a
          className="nav-item"
          aria-current={currentPath === "/dashboard" ? "page" : undefined}
          href="/dashboard"
        >
          <LayoutDashboard size={17} />
          <span>🏠 NLE 워크스페이스</span>
        </a>

        {/* 4. 번호가 붙은 핵심 작업 흐름 (Step 1 -> 2 -> 3) */}
        <p className="nav-caption">초고속 썸네일 파이프라인</p>
        <div className="flow-stepper">
          <a
            className="flow-item"
            aria-current={currentPath.startsWith("/project") ? "page" : undefined}
            href="/open#topic"
          >
            <span className="step-number">1</span>
            <div className="flow-text">
              <strong>주제 · 피사체 훅</strong>
              <small>주제 · 대본 · 킬러 피사체</small>
            </div>
          </a>
          <a className="flow-item" href="/open#strategy">
            <span className="step-number">2</span>
            <div className="flow-text">
              <strong>타겟 · CTR 전략</strong>
              <small>시청층 · A/B 문구 · 네온 스타일</small>
            </div>
          </a>
          <a className="flow-item" href="/open#result">
            <span className="step-number">3</span>
            <div className="flow-text">
              <strong>하이퍼 렌더 · 다운로드</strong>
              <small>2종 동시 생성 · 초고화질 출력</small>
            </div>
          </a>
        </div>

        {/* 부가 전략: 업로드 & 검색 노출 */}
        <p className="nav-caption">업로드 & 검색 노출</p>
        <a
          className="nav-item"
          aria-current={currentPath === "/seo" ? "page" : undefined}
          href="/seo"
        >
          <Megaphone size={17} />
          <span>SEO 전략 (제목·설명·태그)</span>
        </a>

        {/* 5. 구분선 아래: 표준 유틸리티 메뉴 (docs/SIDEBAR_LAYOUT_STANDARD.md 표준 명칭 일치) */}
        <div className="utility-menu">
          <p className="nav-caption utility-caption">설정 및 가이드</p>
          
          {/* 7. API키등록·플랫폼연동 */}
          <a
            className="nav-item"
            aria-current={currentPath === "/settings" ? "page" : undefined}
            href="/settings"
          >
            <KeyRound size={17} />
            <span>🔑 API키등록·플랫폼연동</span>
          </a>

          {/* 8. 📖 연동 & 사용 매뉴얼 (표준 공식 명칭 준수) */}
          <a
            className="nav-item"
            aria-current={currentPath === "/guide" ? "page" : undefined}
            href="/guide"
          >
            <BookOpen size={17} />
            <span>📖 연동 & 사용 매뉴얼</span>
          </a>
        </div>
      </nav>

      {/* 9. 마지막 메뉴 바로 아래 8~16px 밀착: 계정 이메일과 로그아웃 (docs/SIDEBAR_LAYOUT_STANDARD.md §34) */}
      <div className="sidebar-account">
        <p className="account-email" title={userEmail}>
          {userEmail || "회원 로그인"}
        </p>
        <button type="button" className="account-logout" onClick={handleLogout}>
          <LogOut size={15} />
          <span>로그아웃</span>
        </button>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* 데스크톱 사이드바 (250px 고정) */}
      <aside className="desktop-sidebar">{menu}</aside>

      {/* 모바일 상단 바 (767px 이하) */}
      <div className="mobile-sidebar">
        <div className="mobile-header">
          <div className="mobile-header-brand">
            <strong>{APP_NAME_LINE1}</strong>
            <span className="brand-version-badge">{APP_VERSION}</span>
          </div>
          <button
            type="button"
            aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {open && <div className="mobile-menu">{menu}</div>}
      </div>
    </>
  );
}
