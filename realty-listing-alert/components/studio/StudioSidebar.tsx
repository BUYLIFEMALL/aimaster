"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { APP_VERSION } from "@/lib/version";

// 모든 화면이 함께 쓰는 사이드바(기준: naver-blog-seo-studio StudioSidebar). 메뉴 순서는 인수인계 §3-5.
const FLOW = [
  { id: "targets", step: 1, icon: "🎯", label: "감시 대상", desc: "단지 추가·조건 (최대 10개)", href: "/targets" },
  { id: "schedule", step: 2, icon: "⏰", label: "예약 설정", desc: "켜기/끄기·수집 간격·시간대", href: "/schedule" },
  { id: "delivery", step: 3, icon: "📨", label: "받는 방법", desc: "텔레그램·파일·이메일", href: "/delivery" },
  // 2026-10-25 주인님 「좌측에 메뉴는 보여야 할꺼 아냐」 — 수집 결과를 메뉴에서 바로
  { id: "results", step: 4, icon: "📄", label: "수집 결과", desc: "최근 매물 표·번호·링크", href: "/results" },
];

export function StudioSidebar({
  email,
  active,
}: {
  email: string;
  active: string;
}) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

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
        <a className={`nav-overview ${active === "dashboard" ? "active" : ""}`} href="/dashboard">
          🏠 대시보드
        </a>
        <div className="nav-flow">
          {FLOW.map((item) => (
            <a
              key={item.id}
              className={`nav-link ${active === item.id ? "active" : ""}`}
              aria-current={active === item.id ? "page" : undefined}
              href={item.href}
            >
              <span className="nav-number">{item.step}</span>
              <span>
                <strong>{item.icon} {item.label}</strong>
                <small>{item.desc}</small>
              </span>
            </a>
          ))}
        </div>
        <div className="nav-divider" />
        {/* 디자인 원칙 0: 확장 다운로드를 메뉴에서도 바로 받게 한다(이 프로그램 사이트에서 직접 내려받음) */}
        <a className="nav-utility nav-download" href="/downloads/realty-listing-alert-extension-latest.zip" download>⬇ 확장 프로그램 받기 ({APP_VERSION})</a>
        <a className={`nav-utility ${active === "settings" ? "active" : ""}`} href="/settings">🔑 API키등록·플랫폼연동</a>
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
      <span className="brand-mark" aria-hidden="true">🏠</span>
      <div>
        <div className="brand"><em>부동산</em> 실시간 매물 알림</div>
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
          <div className="brand-sub">내 PC에서 새 매물을 찾아 텔레그램·카톡·메일로</div>
          <a className="sidebar-back" href="https://www.buylife.xyz/programs">← 다른 프로그램 보기</a>
        </div>
        {menu}
      </aside>
    </>
  );
}
