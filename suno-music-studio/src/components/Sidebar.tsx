"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  Music2,
  LayoutDashboard,
  SlidersHorizontal,
  PenLine,
  Disc3,
  FolderHeart,
  KeyRound,
  BookOpen,
  Menu,
  LogOut,
} from "lucide-react";
import { APP_NAME, APP_VERSION } from "@/lib/version";
import { signOutAction } from "@/lib/actions/auth";
export const STEPS = [
  {
    id: "style",
    name: "스타일 선택",
    desc: "프리셋·태그·댄스 그루브",
    icon: SlidersHorizontal,
  },
  {
    id: "song",
    name: "작사·곡 기획",
    desc: "제목·Style·가사 준비",
    icon: PenLine,
  },
  { id: "album", name: "앨범 구성", desc: "흐름 설계·곡별 작사", icon: Disc3 },
  {
    id: "saved",
    name: "검수·보관함",
    desc: "확인·복사·백업·전달",
    icon: FolderHeart,
  },
];
export function Sidebar({ email }: { email: string }) {
  const path = usePathname();
  const section = useSearchParams().get("section") || "style";
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
          <Link className="nav-item" href="/">
            <LayoutDashboard size={18} />
            대시보드
          </Link>
          <p className="nav-caption">작업 흐름</p>
          {STEPS.map((s, i) => (
            <Link
              key={s.id}
              href={`/?section=${s.id}`}
              aria-current={
                path === "/" && section === s.id ? "page" : undefined
              }
              className={`flow-item ${path === "/" && section === s.id ? "active" : ""}`}
            >
              <span className="step-number">{i + 1}</span>
              <s.icon size={17} />
              <span>
                <strong>{s.name}</strong>
                <small>{s.desc}</small>
              </span>
            </Link>
          ))}
          <div className="nav-divider" />
          <Link className="nav-item" href="/settings">
            <KeyRound size={18} />
            API키등록·플랫폼연동
          </Link>
          <Link className="nav-item" href="/?section=guide">
            <BookOpen size={18} />
            연동 & 사용 매뉴얼
          </Link>
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
