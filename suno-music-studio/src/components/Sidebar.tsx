"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  Music2,
  LayoutDashboard,
  SlidersHorizontal,
  Disc3,
  FolderHeart,
  KeyRound,
  BookOpen,
  Menu,
  LogOut,
  Search,
  Library,
  AudioLines,
  ExternalLink,
} from "lucide-react";
import { APP_NAME, APP_VERSION } from "@/lib/version";
import { signOutAction } from "@/lib/actions/auth";
export const STEPS = [
  { id: "builder", name: "빌더", icon: SlidersHorizontal, badge: "" },
  { id: "album", name: "앨범", icon: Disc3, badge: "3~12" },
  { id: "presets", name: "프리셋", icon: Library, badge: "461" },
  { id: "search", name: "검색", icon: Search, badge: "AI" },
  { id: "dance", name: "댄스 머신", icon: AudioLines, badge: "200" },
  { id: "guide", name: "가이드", icon: BookOpen, badge: "93" },
  { id: "saved", name: "저장됨", icon: FolderHeart, badge: "" },
];
export function Sidebar({ email }: { email: string }) {
  const path = usePathname(),
    raw = useSearchParams().get("section") || "builder";
  const section =
    raw === "style" ? "presets" : raw === "song" ? "builder" : raw;
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="mobile-bar">
        <strong>{APP_NAME}</strong>
        <button
          aria-label="메뉴 열기"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <Menu size={20} />
        </button>
      </div>
      {open && (
        <button
          className="backdrop"
          aria-label="메뉴 닫기"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-brand">
          <span className="logo">
            <Music2 size={24} />
          </span>
          <div>
            <strong>{APP_NAME}</strong>
            <small>{APP_VERSION}</small>
          </div>
        </div>
        <a className="other-programs" href="https://www.buylife.xyz/programs">
          ← 다른 프로그램 보기
        </a>
        <nav aria-label="작업 메뉴" onClick={() => setOpen(false)}>
          <Link
            className={`nav-item ${section === "dashboard" ? "active" : ""}`}
            href="/?section=dashboard"
          >
            <LayoutDashboard size={18} />
            대시보드
          </Link>
          <p className="nav-caption">음악 작업</p>
          {STEPS.map((s) => (
            <Link
              key={s.id}
              href={`/?section=${s.id}`}
              aria-current={
                path === "/" && section === s.id ? "page" : undefined
              }
              className={`nav-item studio-menu ${path === "/" && section === s.id ? "active" : ""}`}
            >
              <s.icon size={18} />
              <span>{s.name}</span>
              {s.badge && <small className="menu-count">{s.badge}</small>}
            </Link>
          ))}
          <div className="nav-divider" />
          <Link
            className={`nav-item ${path === "/settings" ? "active" : ""}`}
            href="/settings"
          >
            <KeyRound size={18} />
            API키등록·플랫폼연동
          </Link>
          <a
            className="nav-item"
            href="https://suno.com/create"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={18} />
            Suno 열기
          </a>
        </nav>
        <footer className="sidebar-account">
          <small>{email}</small>
          <form action={signOutAction}>
            <button className="logout">
              <LogOut size={16} />
              로그아웃
            </button>
          </form>
        </footer>
      </aside>
    </>
  );
}
