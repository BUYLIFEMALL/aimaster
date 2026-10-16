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
  Sparkles,
} from "lucide-react";
import { APP_NAME, APP_VERSION } from "@/lib/version";
import { signOutAction } from "@/lib/actions/auth";

export const STEPS = [
  { id: "builder", name: "빌더 (작사·곡 기획)", icon: SlidersHorizontal, badge: "" },
  { id: "album", name: "앨범 구성", icon: Disc3, badge: "3~12" },
  { id: "presets", name: "스타일 프리셋", icon: Library, badge: "461" },
  { id: "search", name: "음악 탐색·검색", icon: Search, badge: "AI" },
  { id: "dance", name: "댄스 머신", icon: AudioLines, badge: "200" },
  { id: "guide", name: "연동 & 사용 매뉴얼", icon: BookOpen, badge: "비주얼" },
  { id: "saved", name: "검수·보관함", icon: FolderHeart, badge: "" },
];

export function Sidebar({ email }: { email: string }) {
  const path = usePathname(),
    raw = useSearchParams().get("section") || "builder";
  const section =
    raw === "style" ? "presets" : raw === "song" ? "builder" : raw;
  const [open, setOpen] = useState(false);

  // Extract initial for user avatar badge (like Suno's orange circle)
  const userInitial = email ? email.charAt(0).toUpperCase() : "U";

  return (
    <>
      <div className="mobile-bar">
        <div className="flex items-center gap-2">
          <span className="logo !w-8 !h-8 !rounded-lg">
            <Music2 size={18} />
          </span>
          <strong className="tracking-tight text-white">{APP_NAME}</strong>
        </div>
        <button
          aria-label="메뉴 열기"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="text-white hover:text-orange-400"
        >
          <Menu size={22} />
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
        {/* Suno Signature Brand Header */}
        <div className="sidebar-brand">
          <span className="logo">
            <Music2 size={24} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tighter text-white font-mono">
                SUNO
              </span>
              <small>{APP_VERSION}</small>
            </div>
            <strong className="text-xs text-zinc-300 font-medium truncate">
              {APP_NAME}
            </strong>
          </div>
        </div>

        <a className="other-programs" href="https://www.buylife.xyz/programs">
          ← AIMaster 전체 프로그램
        </a>

        {/* Navigation Menu */}
        <nav aria-label="작업 메뉴" onClick={() => setOpen(false)}>
          <Link
            className={`nav-item ${section === "dashboard" ? "active" : ""}`}
            href="/?section=dashboard"
          >
            <LayoutDashboard size={18} />
            <span>대시보드</span>
          </Link>

          <p className="nav-caption">스튜디오 작업</p>
          {STEPS.map((s) => (
            <Link
              key={s.id}
              href={`/?section=${s.id}`}
              aria-current={
                path === "/" && section === s.id ? "page" : undefined
              }
              className={`nav-item studio-menu ${path === "/" && section === s.id ? "active" : ""}`}
            >
              <s.icon size={17} />
              <span>{s.name}</span>
              {s.badge && <small className="menu-count">{s.badge}</small>}
            </Link>
          ))}

          <div className="nav-divider" />
          <p className="nav-caption">설정 & 외부 연동</p>

          <Link
            className={`nav-item ${path === "/settings" ? "active" : ""}`}
            href="/settings"
          >
            <KeyRound size={17} />
            <span>API키·플랫폼 연동</span>
          </Link>

          {/* Suno.com Official Direct Link Highlight */}
          <a
            className="nav-item group !bg-gradient-to-r !from-orange-500/15 !to-pink-500/10 !border !border-orange-500/30 hover:!border-orange-400 !text-orange-300 hover:!text-white mt-2"
            href="https://suno.com/create"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Sparkles size={17} className="text-orange-400 group-hover:rotate-12 transition-transform" />
            <span className="font-bold">Suno 본사이트 열기</span>
            <ExternalLink size={14} className="opacity-70 group-hover:opacity-100" />
          </a>
        </nav>

        {/* User Account with Suno Avatar Badge */}
        <footer className="sidebar-account">
          <div className="flex items-center gap-2.5 mb-2 px-1">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-orange-500/20 flex-shrink-0">
              {userInitial}
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-zinc-200 truncate">
                {email ? email.split("@")[0] : "사용자"}
              </span>
              <small className="block text-[10px] text-zinc-500 truncate">
                {email}
              </small>
            </div>
          </div>
          <form action={signOutAction}>
            <button className="logout flex items-center justify-center gap-1.5 hover:text-red-400 transition-colors">
              <LogOut size={14} />
              <span>로그아웃</span>
            </button>
          </form>
        </footer>
      </aside>
    </>
  );
}
