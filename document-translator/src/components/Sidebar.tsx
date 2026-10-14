"use client";
import { useState } from "react";
import { SCREENS, type Screen } from "@/lib/navigation";
import { APP_NAME, APP_VERSION, MAIN_SITE } from "@/lib/version";
export function Sidebar({
  email,
  screen,
  navigate,
  busy,
}: {
  email: string;
  screen: Screen;
  navigate: (screen: Screen) => void;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false),
    [error, setError] = useState("");
  async function logout() {
    if (busy) return;
    setError("");
    try {
      const r = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!r.ok) throw new Error();
      window.location.assign("/login");
    } catch {
      setError("로그아웃하지 못했습니다. 다시 시도해주세요.");
    }
  }
  const content = (
    <>
      <header className="sidebar-brand">
        <span className="brand-symbol">文</span>
        <strong>{APP_NAME}</strong>
        <small>{APP_VERSION}</small>
        <a href={`${MAIN_SITE}/programs`}>← 다른 프로그램 보기</a>
      </header>
      <nav aria-label="프로그램 메뉴">
        {SCREENS.map((item) => (
          <a
            className={`nav-item ${item.id === "settings" ? "utility" : ""}`}
            key={item.id}
            href={`/${item.id}`}
            aria-current={item.id === screen ? "page" : undefined}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey) return;
              e.preventDefault();
              navigate(item.id);
              setOpen(false);
            }}
          >
            <span className={"step" in item ? "step" : "nav-icon"}>
              {"step" in item ? item.step : item.icon}
            </span>
            <span>
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
            </span>
          </a>
        ))}
      </nav>
      <div className="sidebar-account">
        <p title={email}>{email}</p>
        <button onClick={logout} disabled={busy}>
          로그아웃
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
      <aside className="sidebar">{content}</aside>
      <div className="mobile-header">
        <strong>{APP_NAME}</strong>
        <button
          aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          ☰
        </button>
      </div>
      {open && <aside className="mobile-menu">{content}</aside>}
    </>
  );
}
