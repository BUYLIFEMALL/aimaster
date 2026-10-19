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
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

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
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "#4f46e5",
              color: "#ffffff",
              fontSize: "18px",
              fontWeight: 800,
              boxShadow: "0 4px 12px rgba(79, 70, 229, 0.2)",
            }}
          >
            文
          </span>
          <div>
            <strong style={{ fontSize: "16px", color: "#1e1b4b", display: "block" }}>
              {APP_NAME}
            </strong>
            <span
              style={{
                display: "inline-block",
                fontSize: "10px",
                fontWeight: 800,
                color: "#4338ca",
                background: "#eef2ff",
                border: "1px solid #c7d2fe",
                padding: "1px 6px",
                borderRadius: "10px",
                marginTop: "2px",
              }}
            >
              {APP_VERSION}
            </span>
          </div>
        </div>
        <small style={{ color: "#64748b", fontSize: "11px", marginBottom: "6px" }}>
          포커스 스튜디오 소프트 크림 에디션
        </small>
        <a
          href={`${MAIN_SITE}/programs`}
          style={{ fontSize: "11px", color: "#64748b", textDecoration: "none" }}
        >
          ← AIMaster 전체 프로그램
        </a>
      </header>

      {/* 4단계 번역 파이프라인 미니 가이드 바 */}
      <div
        style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "10px 12px",
          margin: "0 10px 14px",
          fontSize: "11px",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            fontWeight: 700,
            color: "#64748b",
            textTransform: "uppercase",
            marginBottom: "6px",
          }}
        >
          번역 파이프라인
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
          <span>1.원문</span>
          <span>→</span>
          <span>2.용어</span>
          <span>→</span>
          <span>3.검수</span>
          <span>→</span>
          <span>4.저장</span>
        </div>
      </div>

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
        <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>
          접속 계정
        </div>
        <p title={email} style={{ fontWeight: 600, color: "#334155" }}>
          {email}
        </p>
        <button onClick={logout} disabled={busy} style={{ color: "#ef4444", fontWeight: 600 }}>
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
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              background: "#4f46e5",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 800,
            }}
          >
            文
          </span>
          <strong style={{ fontSize: "15px" }}>{APP_NAME}</strong>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "#4338ca",
              background: "#eef2ff",
              padding: "1px 6px",
              borderRadius: "8px",
            }}
          >
            {APP_VERSION}
          </span>
        </div>
        <button
          aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          style={{ cursor: "pointer", background: "none", border: "none", fontSize: "20px" }}
        >
          {open ? "✕" : "☰"}
        </button>
      </div>
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.3)",
              zIndex: 25,
            }}
          />
          <aside className="mobile-menu">{content}</aside>
        </>
      )}
    </>
  );
}

