"use client";
import { useState } from "react";
import { BookOpen, KeyRound, LogOut, Menu, NotebookPen, X } from "lucide-react";
import { APP_NAME, APP_VERSION, MAIN_SITE } from "@/lib/version";

// 작업 흐름 순서(내 블로그 → 키워드 발견 → 자료 → 작성 → 검수 → 이미지)
export const STEPS = [
  { href: "/style", name: "내 블로그 스타일", detail: "문체·주제 분석 · 승인" },
  { href: "/keywords", name: "키워드 탐색", detail: "검색량 · 문서수 · 보관함" },
  { href: "/trends", name: "트렌드 관측", detail: "최신 자료 · 급상승 검색어" },
  { href: "/benchmark", name: "블로그 벤치마킹", detail: "같은 주제 블로그 분석" },
  { href: "/research", name: "글 작성 준비", detail: "상위 글 자료 · 승인" },
  { href: "/write", name: "글 작성", detail: "내 문체로 구간별 초안" },
  { href: "/review", name: "최종 검수", detail: "점검 · 수정 · 최종본" },
  { href: "/images", name: "이미지 제작", detail: "대표 1장 + 본문 이미지" },
];

export function Sidebar({ userEmail, currentPath }: { userEmail?: string; currentPath: string }) {
  const [open, setOpen] = useState(false), [error, setError] = useState("");
  async function logout() {
    try { const r = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }); if (!r.ok) throw new Error(); window.location.assign("/login"); }
    catch { setError("로그아웃하지 못했습니다. 다시 시도해 주세요."); }
  }
  const menu = (
    <>
      <div className="sidebar-brand">
        <a className="brand-row" href="/style"><span className="brand-icon"><NotebookPen size={18} /></span><div><strong>{APP_NAME}</strong><small>{APP_VERSION}</small></div></a>
        <a className="other-programs" href={`${MAIN_SITE}/programs`}>← 다른 프로그램 보기</a>
      </div>
      <nav className="sidebar-nav" aria-label="프로그램 메뉴">
        <p className="nav-caption">작업 흐름</p>
        {STEPS.map((s, i) => (
          <a key={s.href} className="flow-item" aria-current={currentPath.startsWith(s.href) ? "page" : undefined} href={s.href} onClick={() => setOpen(false)}>
            <span className="step-number">{i + 1}</span><div><strong>{s.name}</strong><small>{s.detail}</small></div>
          </a>
        ))}
        <div className="utility-menu">
          <a className="nav-item" aria-current={currentPath === "/settings" ? "page" : undefined} href="/settings"><KeyRound size={15} />API키등록·플랫폼연동</a>
          <a className="nav-item" aria-current={currentPath === "/guide" ? "page" : undefined} href="/guide"><BookOpen size={15} />사용 매뉴얼</a>
        </div>
      </nav>
      <div className="sidebar-account">
        <p title={userEmail}>{userEmail || "로그인 계정"}</p>
        <button type="button" onClick={() => void logout()}><LogOut size={14} />로그아웃</button>
        {error && <p role="alert" className="error">{error}</p>}
      </div>
    </>
  );
  return (
    <>
      <aside className="desktop-sidebar">{menu}</aside>
      <div className="mobile-sidebar">
        <div className="mobile-header"><strong>{APP_NAME} <small>{APP_VERSION}</small></strong><button type="button" aria-label={open ? "메뉴 닫기" : "메뉴 열기"} aria-expanded={open} onClick={() => setOpen((p) => !p)}>{open ? <X size={22} /> : <Menu size={22} />}</button></div>
        {open && <div className="mobile-menu">{menu}</div>}
      </div>
    </>
  );
}
