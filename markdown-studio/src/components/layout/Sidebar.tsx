"use client";
import { useState } from "react";
import { BookOpen, FilePenLine, FolderOpen, KeyRound, LayoutDashboard, LogOut, Menu, X, Download, FilePlus2 } from "lucide-react";
import { APP_NAME, APP_VERSION, MAIN_SITE } from "@/lib/version";
import { useWorkspace, messageForError } from "@/components/workspace/WorkspaceProvider";

const STEPS = [
  { step: 1, href: "/prepare", name: "문서 준비", detail: "새 문서 · 템플릿으로 시작", icon: FilePlus2 },
  { step: 2, href: "/editor", name: "편집·미리보기", detail: "마크다운 작성 · 서식 확인", icon: FilePenLine },
  { step: 3, href: "/export", name: "변환·내보내기", detail: "원문 저장 · 변환 준비", icon: Download },
  { step: 4, href: "/library", name: "문서 보관함", detail: "폴더 · 수정 이력 · 휴지통", icon: FolderOpen },
];
export function Sidebar({ userEmail, currentPath }: { userEmail?: string; currentPath: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const store = useWorkspace();
  async function navigate(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault(); setError("");
    try { await store.save(); window.location.assign(href); } catch (e) { setError(messageForError(e)); }
  }
  async function logout() {
    setError("");
    try {
      await store.save();
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      if (!response.ok) throw new Error("로그아웃에 실패했습니다. 다시 시도해 주세요.");
      window.location.assign("/login");
    } catch (e) { setError(messageForError(e)); }
  }
  const menu = <>
    <div className="sidebar-brand"><a href="/dashboard" onClick={e => navigate(e, "/dashboard")} className="brand-row"><span className="brand-icon"><FilePenLine size={20}/></span><div><strong>{APP_NAME}</strong><small>{APP_VERSION}</small></div></a><a className="other-programs" href={`${MAIN_SITE}/programs`}>← 다른 프로그램 보기</a></div>
    <nav className="sidebar-nav" aria-label="프로그램 메뉴">
      <a aria-current={currentPath === "/dashboard" ? "page" : undefined} className="nav-item" href="/dashboard" onClick={e => navigate(e, "/dashboard")}><LayoutDashboard size={17}/>대시보드</a>
      <p className="nav-caption">작업 흐름</p>
      {STEPS.map(({ step, href, name, detail, icon: Icon }) => <a key={href} className="flow-item" aria-current={currentPath === href ? "page" : undefined} href={href} onClick={e => navigate(e, href)}><span className="step-number">{step}</span><div><strong><Icon size={15}/>{name}</strong><small>{detail}</small></div></a>)}
      <div className="utility-menu"><a className="nav-item" aria-current={currentPath === "/settings" ? "page" : undefined} href="/settings" onClick={e => navigate(e, "/settings")}><KeyRound size={17}/>API키등록·플랫폼연동</a><a className="nav-item" aria-current={currentPath === "/guide" ? "page" : undefined} href="/guide" onClick={e => navigate(e, "/guide")}><BookOpen size={17}/>연동 & 사용 매뉴얼</a></div>
    </nav>
    <div className="sidebar-account"><p title={userEmail}>{userEmail || "로그인 계정"}</p><button onClick={logout}><LogOut size={16}/>로그아웃</button>{error && <p role="alert" className="error">{error}</p>}</div>
  </>;
  return <><aside className="desktop-sidebar">{menu}</aside><div className="mobile-sidebar"><div className="mobile-header"><strong>{APP_NAME}</strong><button aria-label={open ? "메뉴 닫기" : "메뉴 열기"} onClick={() => setOpen(v => !v)}>{open ? <X size={22}/> : <Menu size={22}/>}</button></div>{open && <div className="mobile-menu">{menu}</div>}</div></>;
}
