"use client";

import { useState } from "react";
import {
  BookOpen,
  Eraser,
  Images,
  KeyRound,
  LogOut,
  Menu,
  Sparkles,
  Wand2,
  X,
  Layers,
  ArrowRight,
} from "lucide-react";
import { APP_NAME, APP_VERSION, MAIN_SITE } from "@/lib/version";

export function Sidebar({
  userEmail,
  currentPath,
}: {
  userEmail?: string;
  currentPath: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    setError("");
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error();
      window.location.assign("/login");
    } catch {
      setError("로그아웃에 실패했습니다. 다시 시도해 주세요.");
    }
  }

  const menu = (
    <>
      {/* 1. 상단 브랜드 헤더 & 3D 뱃지 */}
      <div className="sidebar-brand">
        <a href="/studio" className="brand-row group">
          <div className="brand-icon-3d">
            <span className="text-xl select-none transform group-hover:scale-110 transition-transform">
              🍌
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <strong className="text-[14px] font-black tracking-tight text-stone-900 truncate">
                {APP_NAME}
              </strong>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="brand-3d-badge">
                {APP_VERSION} PRO
              </span>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded-full border border-amber-200">
                Nano Studio
              </span>
            </div>
          </div>
        </a>
        <a
          className="other-programs flex items-center gap-1 hover:text-amber-800 transition-colors"
          href={`${MAIN_SITE}/programs`}
        >
          <span>← 다른 프로그램 보기</span>
        </a>
      </div>

      {/* 2. 네비게이션 영역 */}
      <nav className="sidebar-nav" aria-label="프로그램 메뉴">
        {/* 작업 흐름 */}
        <p className="nav-caption flex items-center gap-1.5">
          <span>🎨</span>
          <span>스튜디오 작업 흐름</span>
        </p>
        <a
          className="flow-item"
          aria-current={currentPath === "/studio" ? "page" : undefined}
          href="/studio#source"
        >
          <span className="step-number">1</span>
          <div>
            <strong>🖼️ 원본 이미지</strong>
            <small>업로드 · 드래그 앤 드롭</small>
          </div>
        </a>
        <a className="flow-item" href="/studio#card-generate">
          <span className="step-number">2</span>
          <div>
            <strong>🪄 AI 작업 카드 실행</strong>
            <small>생성 · 합성 · 복원 · 만화</small>
          </div>
        </a>
        <a className="flow-item" href="/studio#result">
          <span className="step-number">3</span>
          <div>
            <strong>✨ 완성 및 저장</strong>
            <small>고화질 다운로드 · 연속 편집</small>
          </div>
        </a>

        {/* 구분선 */}
        <div className="nav-divider" />

        {/* 3. 유틸리티 & 부가 도구 (확장 / 보조 AI / 매뉴얼) */}
        <div className="utility-menu">
          <p className="nav-caption flex items-center gap-1.5" style={{ margin: "4px 8px 8px" }}>
            <span>⚡</span>
            <span>AI 보조 도구 & 유틸리티</span>
          </p>

          {/* 초고속 브라우저 지우개 */}
          <a
            className="nav-item group"
            aria-current={currentPath === "/erase" ? "page" : undefined}
            href="/erase"
            title="서버 전송 없이 브라우저에서 0원으로 글자·잡티를 1초만에 지웁니다"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[15px] group-hover:scale-110 transition-transform">🧼</span>
              <span className="truncate">AI 매직 지우개</span>
            </div>
            <span className="nav-badge-free">0원 초고속</span>
          </a>

          {/* 무료 지우기용 AI 모델 파일 받기 — /erase 받기 상자로 이동(주인님 지시 2026-10-25) */}
          <a className="nav-item group" href="/erase#model" title="무료 지우기에 쓰는 AI 계산용 모델 파일(설치 없음, 약 203MB)을 미리 받습니다">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[15px] group-hover:scale-110 transition-transform">⬇</span>
              <span className="truncate">AI 모델 파일 받기</span>
            </div>
          </a>

          {/* E4(2026-10-26) 사진 일괄 손질 — 높이 맞춤·워터마크·사진 정보 지우기(브라우저 처리) */}
          <a
            className="nav-item group"
            aria-current={currentPath === "/batch" ? "page" : undefined}
            href="/batch"
            title="여러 장의 높이를 맞추고 워터마크를 넣고 촬영 정보를 지워 한 번에 받습니다(서버 전송 없음)"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[15px] group-hover:scale-110 transition-transform">🖼</span>
              <span className="truncate">사진 일괄 손질</span>
            </div>
            <span className="nav-badge-free">0원</span>
          </a>

          {/* 내 결과 기록 */}
          <a
            className="nav-item group"
            aria-current={currentPath === "/history" ? "page" : undefined}
            href="/history"
          >
            <div className="flex items-center gap-2">
              <Images size={16} className="text-amber-700 group-hover:scale-110 transition-transform" />
              <span>내 결과 보관함</span>
            </div>
          </a>

          {/* API키등록·플랫폼연동 */}
          <a
            className="nav-item group"
            aria-current={currentPath === "/settings" ? "page" : undefined}
            href="/settings"
          >
            <div className="flex items-center gap-2">
              <KeyRound size={16} className="text-amber-700 group-hover:scale-110 transition-transform" />
              <span>API키등록·플랫폼연동</span>
            </div>
          </a>

          {/* 📖 연동 & 사용 매뉴얼 */}
          <a
            className="nav-item group"
            aria-current={currentPath === "/guide" ? "page" : undefined}
            href="/guide"
          >
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-amber-700 group-hover:scale-110 transition-transform" />
              <span>📖 연동 & 사용 매뉴얼</span>
            </div>
          </a>
        </div>
      </nav>

      {/* 4. 밀착된 계정 & 로그아웃 블록 */}
      <div className="sidebar-account">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider">
            계정 정보
          </span>
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shadow-xs" title="정상 접속 중" />
        </div>
        <p className="sidebar-account-email" title={userEmail}>
          {userEmail || "로그인 계정"}
        </p>
        <button
          type="button"
          onClick={logout}
          className="sidebar-logout-btn group"
        >
          <LogOut size={14} className="group-hover:-translate-x-0.5 transition-transform text-rose-600" />
          <span>로그아웃</span>
        </button>
        {error && (
          <p role="alert" className="error text-[11px] mt-1.5">
            {error}
          </p>
        )}
      </div>
    </>
  );

  return (
    <>
      <aside className="desktop-sidebar">{menu}</aside>
      <div className="mobile-sidebar">
        <div className="mobile-header">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍌</span>
            <span className="font-black text-stone-900 text-sm">
              {APP_NAME}
            </span>
            <span className="brand-3d-badge text-[9px] py-0.5 px-1.5">
              {APP_VERSION}
            </span>
          </div>
          <button
            type="button"
            aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
            onClick={() => setOpen((v) => !v)}
            className="p-1 rounded-lg hover:bg-amber-100/60 transition"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {open && <div className="mobile-menu">{menu}</div>}
      </div>
    </>
  );
}
