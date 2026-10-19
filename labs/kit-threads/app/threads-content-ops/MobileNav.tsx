"use client";

import React, { useState } from "react";
import { Menu, X, Sparkles } from "lucide-react";
import ContentOpsSidebar from "./ContentOpsSidebar";
import { APP_VERSION } from "@/threads-content-ops/lib/version";

export default function MobileNav({ email }: { email: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* 모바일 상단 고정 헤더 바 (md 이상에서는 숨김) */}
      <header className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-neutral-200 bg-white/95 px-4 backdrop-blur-md md:hidden">
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 font-extrabold text-xs"
            style={{ color: '#ffffff' }}
          >
            @
          </span>
          <span className="font-extrabold text-sm text-neutral-900">Threads 운영</span>
          <span className="rounded-full border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-700">
            {APP_VERSION}
          </span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 transition hover:bg-neutral-100"
          aria-label="메뉴 열기"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* 모바일 슬라이드 드로어 네비게이션 오버레이 */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* 어두운 배경 딤 */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* 좌측 슬라이드 메뉴 패널 */}
          <div className="relative z-10 flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between border-b border-neutral-200 p-4">
              <span className="text-sm font-extrabold text-neutral-900">전체 메뉴</span>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ContentOpsSidebar email={email} isMobile={true} onCloseMobile={() => setIsOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
