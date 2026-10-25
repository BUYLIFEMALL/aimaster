"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { APP_NAME, APP_VERSION, MAIN_SITE } from "@/lib/version";
import { STEPS } from "./navigation";
export function Shell({ children, email }: { children: React.ReactNode; email: string }) {
  const router = useRouter();
  const pathname = usePathname(), [open, setOpen] = useState(false), [error, setError] = useState("");
  async function logout() { const r = await fetch("/api/auth/logout", { method: "POST" }); if (r.ok) router.push("/login"); else setError("로그아웃하지 못했습니다. 다시 눌러 주세요."); }
  const menu = <><div className="brand"><span className="brand-icon">✦</span><div><strong>{APP_NAME}</strong><small>{APP_VERSION} · AIMaster</small></div></div><a className="backlink" href={`${MAIN_SITE}/programs`}>← 다른 프로그램 보기</a><a className="nav-download" href="/downloads/blog-content-maker-extension-latest.zip" download="blog-content-maker-extension-latest.zip" title={`네이버 스마트에디터 ONE 원클릭 자동 입력 크롬 확장 프로그램 (${APP_VERSION})`}><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><span>⬇</span><span>확장 프로그램 받기</span></div><span className="badge">{APP_VERSION}</span></a><nav aria-label="작업 메뉴">{STEPS.map((s, i) => <Link className={`nav-item ${pathname === "/" + s.id ? "active" : ""} ${i === 7 ? "utility" : ""}`} href={"/" + s.id} key={s.id} onClick={() => setOpen(false)}><span className="step-number">{s.number}</span><span>{s.title}<small>{s.description}</small></span></Link>)}</nav><div className="account"><span title={email}>{email}</span><button className="text-button" onClick={logout}>로그아웃 ↗</button>{error && <p role="alert">{error}</p>}</div></>;
  return <div className="app-shell"><aside className="desktop-sidebar">{menu}</aside><header className="mobile-sidebar"><div className="mobile-header"><strong>콘텐츠 제작 자동화 <small>{APP_VERSION}</small></strong><button aria-label="메뉴 펼치기" aria-expanded={open} onClick={() => setOpen(!open)}>☰</button></div>{open && <div className="mobile-menu">{menu}</div>}</header><main className="workspace-content">{children}</main></div>;
}
