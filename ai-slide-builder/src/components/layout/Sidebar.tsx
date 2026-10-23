"use client";

import React, { useState } from "react";
import {
  Presentation,
  Sparkles,
  Layers,
  FileSpreadsheet,
  Download,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { APP_VERSION, APP_NAME } from "@/lib/version";
import { PromptFormat } from "@/lib/types";

interface SidebarProps {
  userEmail?: string | null;
  selectedFormat: PromptFormat;
  onSelectFormat: (format: PromptFormat) => void;
  onOpenApiKey: () => void;
  onOpenGuide: () => void;
}

const FLOW_STEPS = [
  {
    step: 1,
    label: "슬라이드 데이터 생성",
    description: "형식 선택, 문서(PDF/DOCX) 파싱 & AI 생성",
  },
  {
    step: 2,
    label: "슬라이드별 카드 편집",
    description: "실시간 양방향 필드 수정 & 개별/일괄 AI 수정",
  },
  {
    step: 3,
    label: "프레젠테이션 변환",
    description: "원클릭 PPTX 다운로드 & Google Slides 연동",
  },
];

export default function Sidebar({
  userEmail,
  selectedFormat,
  onSelectFormat,
  onOpenApiKey,
  onOpenGuide,
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "https://www.buylife.xyz";
    } catch {
      window.location.href = "https://www.buylife.xyz";
    }
  };

  const menuContent = (
    <div className="min-h-0 shrink overflow-y-auto custom-scrollbar p-3.5 space-y-3.5 flex flex-col h-full">
      {/* 1. 프로그램명 & 버전 + 2. ← 다른 프로그램 보기 */}
      <div className="pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-200 shrink-0">
            <Presentation size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-slate-900 text-sm tracking-tight leading-tight truncate">
                {APP_NAME}
              </h1>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded-full font-mono">
                v1.10
              </span>
            </div>
            <p className="text-[10.5px] font-medium text-slate-500 mt-0.5">
              FLOW WIZARD EDITION
            </p>
          </div>
        </div>
        <a
          href="https://www.buylife.xyz/programs"
          className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors font-medium px-1 py-0.5 rounded hover:bg-slate-50"
        >
          ← 다른 프로그램 보기
        </a>
      </div>

      {/* 3. 프레젠테이션 스크립트 형식 선택 */}
      <div>
        <p className="text-[11px] font-bold text-slate-400 px-1 mb-1.5 uppercase tracking-wider">
          슬라이드 생성 포맷
        </p>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => {
              onSelectFormat("standard");
              setMobileOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedFormat === "standard"
                ? "bg-blue-50 text-blue-700 font-bold border border-blue-200/80 shadow-xs"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Layers size={14} className={selectedFormat === "standard" ? "text-blue-600" : "text-slate-400"} />
            <span className="flex-1 text-left">표준 형식</span>
            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-bold">
              기본
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectFormat("kimura");
              setMobileOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedFormat === "kimura"
                ? "bg-blue-50 text-blue-700 font-bold border border-blue-200/80 shadow-xs"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <FileSpreadsheet size={14} className={selectedFormat === "kimura" ? "text-blue-600" : "text-slate-400"} />
            <span className="flex-1 text-left">확장판 (대용량/표)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectFormat("gpt_park");
              setMobileOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedFormat === "gpt_park"
                ? "bg-amber-50 text-amber-800 font-bold border border-amber-300 shadow-xs"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Sparkles size={14} className={selectedFormat === "gpt_park" ? "text-amber-600" : "text-slate-400"} />
            <span className="flex-1 text-left">C-Suite 보고 형식</span>
            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">
              임원보고
            </span>
          </button>
        </div>
      </div>

      {/* 4. 핵심 작업 흐름: 원형 번호 배지와 세로 연결선 */}
      <div>
        <p className="text-[11px] font-bold text-slate-400 px-1 mb-2 uppercase tracking-wider">
          작업 워크플로우
        </p>
        <div className="relative pl-1">
          {FLOW_STEPS.map((item, idx) => {
            const isLast = idx === FLOW_STEPS.length - 1;
            return (
              <div key={item.step} className="group relative flex gap-2.5 pb-2">
                <div className="flex flex-col items-center">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200/60">
                    {item.step}
                  </span>
                  {!isLast && <span className="mt-1 w-px flex-1 bg-slate-200" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 leading-tight">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-[10.5px] leading-snug text-slate-500">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* 파워포인트 원클릭 안내 카드 */}
        <div className="mt-2 p-2.5 rounded-lg bg-blue-50/60 border border-blue-100/80 text-slate-700">
          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 mb-0.5">
            <Download size={13} className="text-blue-600" />
            <span>원클릭 PPTX 다운로드</span>
          </div>
          <p className="text-[10.5px] text-blue-950/70 leading-relaxed">
            생성된 슬라이드는 브라우저에서 즉시 16:9 와이드 PPTX 파일로 저장하거나 Google Slides로 연동할 수 있습니다.
          </p>
        </div>
      </div>

      {/* 5. 구분선 */}
      <div className="border-t border-slate-200" />

      {/* 6. 유틸리티 메뉴 (표준 명칭 준수) */}
      <div className="space-y-1.5 pt-1">
        <button
          type="button"
          onClick={() => {
            onOpenApiKey();
            setMobileOpen(false);
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <span>🔑</span>
          <span>API키등록·플랫폼연동</span>
        </button>

        <a
          href="/guide"
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors shadow-xs"
        >
          <span>📖</span>
          <span>연동 & 사용 매뉴얼</span>
          <span className="ml-auto text-[9px] bg-amber-200 text-amber-900 px-1 py-0.2 rounded font-extrabold">NEW</span>
        </a>
      </div>

      {/* 7. 마지막 메뉴 바로 아래 바짝 붙인 사용자 이메일과 로그아웃 (간격 8~16px) */}
      <div className="border-t border-slate-200 pt-2.5 flex items-center justify-between px-1 mt-3">
        <div className="truncate max-w-[155px]">
          <p className="text-[10px] text-slate-400 font-medium">로그인 계정</p>
          <p className="text-xs text-slate-800 font-bold truncate" title={userEmail || "회원"}>
            {userEmail || "회원"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          title="로그아웃"
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut size={14} />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* 데스크톱 고정 사이드바 */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col h-screen shrink-0 select-none">
        {menuContent}
      </aside>

      {/* 모바일 햄버거 토글 플로팅 버튼 */}
      <div className="lg:hidden fixed bottom-5 right-5 z-40">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="w-12 h-12 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center hover:bg-blue-500 transition-colors"
          aria-label="메뉴 열기"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* 모바일 오버레이 드로어 */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] bg-white h-full shadow-2xl flex flex-col z-10">
            <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <span className="font-bold text-xs text-slate-700">전체 메뉴</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>
            {menuContent}
          </div>
        </div>
      )}
    </>
  );
}
