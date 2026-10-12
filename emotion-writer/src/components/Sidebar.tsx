"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME, APP_VERSION } from "@/lib/version";
const STEPS = [
  "주제 선택",
  "이미지 방식",
  "이미지 비율",
  "줄 수",
  "글귀 만들기",
  "완성·저장",
];
export function Sidebar({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="brand">
        <Link href="/">🌸 {APP_NAME}</Link>
        <small>{APP_VERSION}</small>
        <a href="https://www.buylife.xyz/programs">← 다른 프로그램 보기</a>
        <button
          className="mobile-menu"
          aria-expanded={open}
          aria-label="작업 메뉴"
          onClick={() => setOpen((v) => !v)}
        >
          ☰
        </button>
      </div>
      <div className="sidebar-body">
        <nav aria-label="작업 순서">
          {STEPS.map((s, i) => (
            <Link
              key={s}
              href={`/#step-${i + 1}`}
              onClick={() => setOpen(false)}
              className={path === "/" ? "flow-link" : "flow-link muted"}
            >
              <span>{i + 1}</span>
              {s}
            </Link>
          ))}
          <div className="nav-divider" />
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className={`settings-link ${path === "/settings" ? "active" : ""}`}
          >
            🔑 API키등록·플랫폼연동
          </Link>
        </nav>
        <div className="account">
          <p title={email}>{email}</p>
          <form action="/api/auth/logout" method="POST">
            <button>로그아웃</button>
          </form>
        </div>
      </div>
    </aside>
  );
}
