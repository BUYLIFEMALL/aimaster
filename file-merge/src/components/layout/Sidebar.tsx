"use client";
import { useState } from "react";
import { BookOpen, FileSpreadsheet, LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { APP_NAME, APP_VERSION, MAIN_SITE } from "@/lib/version";

const TOOLS = [
  { href: "/excel-merge", label: "엑셀 합치기", desc: "여러 파일 · 머리글 기준 정렬 · 시트 모으기" },
  { href: "/excel-split", label: "엑셀 나누기", desc: "시트별 · 열 값별 · N행씩 → ZIP" },
  { href: "/text-merge", label: "텍스트 합치기", desc: "여러 TXT · 구분자 · 파일명 머리말" },
  { href: "/text-split", label: "텍스트 나누기", desc: "글자 수 · 문장 수 기준 → ZIP" },
];

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
          <span className="brand-icon"><FileSpreadsheet size={20} /></span>
          <div><strong>{APP_NAME}</strong><small>{APP_VERSION}</small></div>
        </a>
        <a className="other-programs" href={`${MAIN_SITE}/programs`}>← 다른 프로그램 보기</a>
      </div>
      <nav className="sidebar-nav" aria-label="프로그램 메뉴">
        <a className="nav-item" aria-current={currentPath === "/dashboard" ? "page" : undefined} href="/dashboard"><LayoutDashboard size={17} />대시보드</a>
        <p className="nav-caption">작업 흐름</p>
        {TOOLS.map((t, i) => (
          <a key={t.href} className="flow-item" aria-current={currentPath === t.href ? "page" : undefined} href={t.href}>
            <span className="step-number">{i + 1}</span><div><strong>{t.label}</strong><small>{t.desc}</small></div>
          </a>
        ))}
        <div className="utility-menu">
          <a className="nav-item" aria-current={currentPath === "/guide" ? "page" : undefined} href="/guide"><BookOpen size={17} />사용 매뉴얼</a>
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
          <strong>{APP_NAME}</strong>
          <button type="button" aria-label={open ? "메뉴 닫기" : "메뉴 열기"} onClick={() => setOpen((v) => !v)}>{open ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
        {open && <div className="mobile-menu">{menu}</div>}
      </div>
    </>
  );
}
