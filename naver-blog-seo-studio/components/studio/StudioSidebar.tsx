"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { APP_VERSION } from "@/lib/version";

// 대시보드·설정·매뉴얼이 함께 쓰는 사이드바 (2026-10-17 디자인 리뉴얼).
// 대시보드 안에서는 onSelect로 화면만 바꾸고, 다른 페이지에서는 /dashboard#메뉴 링크로 이동한다.
const FLOW = [
  { id: "title", step: 1, icon: "🔎", label: "제목 추천", desc: "검색 의도에 맞는 제목 생성" },
  { id: "new-draft", step: 2, icon: "📝", label: "새 글 만들기", desc: "AI 블로그(원문) 생성" },
  { id: "research", step: 3, icon: "🧾", label: "자료부터 집필", desc: "자료 모으기·근거 승인 후 글 생성" },
  { id: "draft", step: 4, icon: "✨", label: "기존 글 최적화", desc: "주제·키워드 분석 후 재작성" },
  { id: "history", step: 5, icon: "📚", label: "생성 기록", desc: "작성한 블로그(원문) 확인" },
];

export function StudioSidebar({
  email,
  active,
  onSelect,
}: {
  email: string;
  active: string;
  onSelect?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  function go(id: string) {
    setOpen(false);
    if (onSelect) onSelect(id);
    else window.location.href = `/dashboard#${id}`;
  }

  async function signOut() {
    setSigningOut(true);
    try {
      await createClient().auth.signOut();
    } finally {
      window.location.href = "/login";
    }
  }

  const menu = (
    <>
      <nav className="nav" aria-label="주 메뉴">
        <button type="button" className={`nav-overview ${active === "dashboard" ? "active" : ""}`} onClick={() => go("dashboard")}>
          🏠 대시보드
        </button>
        <div className="nav-flow">
          {FLOW.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-link ${active === item.id ? "active" : ""}`}
              aria-current={active === item.id ? "page" : undefined}
              onClick={() => go(item.id)}
            >
              <span className="nav-number">{item.step}</span>
              <span>
                <strong>{item.icon} {item.label}</strong>
                <small>{item.desc}</small>
              </span>
            </button>
          ))}
        </div>
        <div className="nav-divider" />
        <a className={`nav-utility ${active === "settings" ? "active" : ""}`} href="/settings#api-key">🔑 API키등록·플랫폼연동</a>
        <a className={`nav-utility ${active === "guide" ? "active" : ""}`} href="/guide">📖 연동 & 사용 매뉴얼</a>
      </nav>
      {/* 계정은 메뉴 바로 아래에 붙인다(SIDEBAR_LAYOUT_STANDARD) */}
      <div className="sidebar-account" title={email}>
        <span className="sidebar-account-label">로그인 계정</span>
        <strong>{email || "로그인 계정"}</strong>
        <button type="button" className="sidebar-logout" onClick={signOut} disabled={signingOut}>
          {signingOut ? "로그아웃 중..." : "↪ 로그아웃"}
        </button>
      </div>
    </>
  );

  const brand = (
    <div className="brand-row">
      <span className="brand-mark" aria-hidden="true">N</span>
      <div>
        <div className="brand"><em>SEO블로그</em> 스튜디오</div>
        <div className="app-version">{APP_VERSION}</div>
      </div>
    </div>
  );

  return (
    <>
      {/* 휴대폰(767px 이하): 위쪽 바 + ☰ 접는 메뉴 — 항목·순서는 데스크톱과 같다 */}
      <header className="mobile-bar">
        {brand}
        <button type="button" className="mobile-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={open ? "메뉴 닫기" : "메뉴 열기"}>
          {open ? "✕" : "☰"}
        </button>
      </header>
      {open && (
        <div className="mobile-menu">
          <a className="sidebar-back" href="https://www.buylife.xyz/programs">← 다른 프로그램 보기</a>
          {menu}
        </div>
      )}

      {/* 데스크톱: 좌측 고정 메뉴 */}
      <aside className="sidebar">
        <div>
          {brand}
          <div className="brand-sub">네이버 블로그 콘텐츠 제작 도우미</div>
          <a className="sidebar-back" href="https://www.buylife.xyz/programs">← 다른 프로그램 보기</a>
        </div>
        {menu}
      </aside>
    </>
  );
}
