"use client";
import { useState } from "react";
import { APP_NAME, APP_VERSION, MAIN_SITE } from "@/lib/version";

export const SCREENS = [
  { href: "dashboard", label: "대시보드", detail: "오늘의 계획과 기록", icon: "⌂" },
  { href: "plan", label: "할 일 계획", detail: "날짜 · 분류 · 우선순위", step: 1 },
  { href: "focus", label: "집중 실행", detail: "집중 · 휴식 · 시간 기록", step: 2 },
  { href: "results", label: "성과·AI 분석", detail: "완료율 · 집중시간 · 노트", step: 3 },
  { href: "records", label: "기록·백업", detail: "지난 기록 · 휴지통", step: 4 },
  { href: "settings", label: "API키등록·플랫폼연동", detail: "본인 키 · 타이머 설정", icon: "🔑" },
  { href: "guide", label: "연동 & 사용 매뉴얼", detail: "5단계 파이프라인 & FAQ", icon: "📖" }
];

export function Sidebar({ email, screen, navigate, busy }: { email: string; screen: string; navigate: (screen: string) => void; busy: boolean }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    if (busy) return;
    setError("");
    try {
      const res = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      if (!res.ok) throw new Error("로그아웃하지 못했습니다. 다시 시도해주세요.");
      window.location.assign("/login");
    } catch (e) {
      setError(e instanceof Error ? e.message : "로그아웃하지 못했습니다.");
    }
  }

  const menu = (
    <>
      <header className="sidebar-brand">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span className="brand-mark" style={{ marginBottom: 0 }}>✓</span>
          <div>
            <strong>{APP_NAME}</strong>
            <small>{APP_VERSION}</small>
          </div>
        </div>
        <a href={`${MAIN_SITE}/programs`} style={{ marginTop: "12px" }}>← 다른 프로그램 보기</a>
      </header>

      <nav aria-label="프로그램 메뉴">
        {SCREENS.map(item => (
          <a
            href={`/${item.href}`}
            key={item.href}
            aria-current={screen === item.href ? "page" : undefined}
            className={`nav-item ${item.href === "settings" ? "utility-start" : ""}`}
            onClick={e => {
              if (e.ctrlKey || e.metaKey || e.shiftKey) return;
              e.preventDefault();
              navigate(item.href);
              setOpen(false);
            }}
          >
            <span className={item.step ? "step-number" : "menu-icon"}>
              {item.step ?? item.icon ?? "•"}
            </span>
            <span>
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
            </span>
          </a>
        ))}
      </nav>

      <footer className="sidebar-account">
        <p title={email}>{email}</p>
        <button disabled={busy} onClick={logout}>로그아웃</button>
        {error && <p role="alert" style={{ color: "#f87171", fontSize: "11px", marginTop: "6px" }}>{error}</p>}
      </footer>
    </>
  );

  return (
    <>
      <aside className="sidebar">{menu}</aside>
      <div className="mobile-bar">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="brand-mark" style={{ width: "24px", height: "24px", fontSize: "14px", marginBottom: 0 }}>✓</span>
          <strong>{APP_NAME}</strong>
        </div>
        <button onClick={() => setOpen(!open)} aria-label={open ? "메뉴 닫기" : "메뉴 열기"} aria-expanded={open}>
          ☰
        </button>
      </div>
      {open && <aside className="mobile-menu">{menu}</aside>}
    </>
  );
}
