"use client";

import React from "react";
import Link from "next/link";
import {
  BookOpen,
  Sparkles,
  Layers,
  Palette,
  Share2,
  KeyRound,
  Download,
  LogOut,
  X,
  FilePlus,
  Clock,
  FileText,
  HelpCircle,
} from "lucide-react";
import { APP_NAME, APP_VERSION } from "@/lib/version";
import { EbookProject } from "@/lib/types";

export type FlowStep = "source" | "chapter" | "style" | "export";

interface SidebarProps {
  currentStep: FlowStep;
  onSelectStep: (step: FlowStep) => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onNewProject: () => void;
  project: EbookProject;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  userEmail?: string;
}

const FLOW_STEPS: {
  step: number;
  id: FlowStep;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    step: 1,
    id: "source",
    label: "자료 수집 & 기획",
    description: "원문 입력 및 AI 목차 자동 설계",
    icon: Sparkles,
  },
  {
    step: 2,
    id: "chapter",
    label: "목차 & 챕터 집필",
    description: "챕터별 원고 작성 및 실시간 편집",
    icon: Layers,
  },
  {
    step: 3,
    id: "style",
    label: "디자인 & 표지",
    description: "21종 테마, 5종 서체, AI 표지 생성",
    icon: Palette,
  },
  {
    step: 4,
    id: "export",
    label: "배포 & 내보내기",
    description: "웹 배포 링크, HTML, EPUB, PDF 저장",
    icon: Share2,
  },
];

export function Sidebar({
  currentStep,
  onSelectStep,
  onOpenSettings,
  onOpenHelp,
  onNewProject,
  project,
  isOpenMobile,
  onCloseMobile,
  userEmail,
}: SidebarProps) {
  // 통계 계산
  const totalChapters = project.chapters.length;
  const totalCharacters = project.chapters.reduce(
    (sum, ch) => sum + (ch.content?.length || 0) + (ch.summary?.length || 0),
    0
  );
  const readingTimeMin = Math.max(1, Math.round(totalCharacters / 500));

  const content = (
    <div className="flex h-full flex-col overflow-y-auto p-4 custom-scrollbar">
      <div className="space-y-4">
        {/* 1. 상단 로고 & 프로그램 정보 */}
        <div className="border-b border-slate-200/80 pb-3">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              onClick={() => {
                onSelectStep("source");
                if (onCloseMobile) onCloseMobile();
              }}
              className="flex items-center gap-2.5 hover:opacity-90 transition group"
              title="eBook Studio 홈으로 이동"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-indigo-600 text-white shadow-md shadow-indigo-100 group-hover:scale-105 transition-transform">
                <BookOpen className="h-4.5 w-4.5 text-indigo-300" />
              </div>
              <div>
                <h1 className="text-sm font-black text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
                  {APP_NAME}
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="px-1.5 py-0.5 text-[9px] font-black bg-indigo-600 text-white rounded-md tracking-wider shadow-xs">
                    {APP_VERSION} PUBLISHING LAB
                  </span>
                </div>
              </div>
            </Link>

            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 md:hidden"
                aria-label="메뉴 닫기"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          <a
            href="https://www.buylife.xyz/programs"
            className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors font-medium"
            title="AI Master 전체 프로그램 카탈로그 보기"
          >
            <span>← 다른 프로그램 보기</span>
          </a>
        </div>

        {/* 새 프로젝트 시작 버튼 */}
        <button
          type="button"
          onClick={onNewProject}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/40 text-xs font-bold text-slate-700 hover:text-indigo-700 transition"
        >
          <FilePlus className="w-3.5 h-3.5 text-indigo-600" />
          <span>새 전자책 만들기</span>
        </button>

        {/* 2. 번호형 작업 흐름 (스텝퍼) */}
        <div>
          <div className="mb-2 px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            WORKFLOW
          </div>
          <nav className="space-y-1">
            {FLOW_STEPS.map((s) => {
              const active = currentStep === s.id;
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    onSelectStep(s.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`w-full text-left rounded-xl p-2.5 transition flex items-start gap-3 border ${
                    active
                      ? "bg-indigo-50/80 border-indigo-200 text-indigo-950 shadow-xs"
                      : "bg-white border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-black transition ${
                      active
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {s.step}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold truncate tracking-tight">
                        {s.label}
                      </span>
                    </div>
                    <p
                      className={`text-[10px] truncate leading-tight mt-0.5 ${
                        active ? "text-indigo-600/90 font-medium" : "text-slate-400"
                      }`}
                    >
                      {s.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* 3. 통계 요약 카드 */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 text-xs text-slate-600 space-y-2">
          <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-slate-500 border-b border-slate-200/60 pb-2">
            <span className="shrink-0">도서 현황</span>
            <span
              className="text-indigo-600 font-extrabold truncate max-w-[130px] text-right"
              title={project.title || "새 전자책"}
            >
              {project.title || "미정"}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="bg-white rounded-lg p-1.5 border border-slate-100 shadow-2xs">
              <span className="block text-[10px] text-slate-400">챕터</span>
              <span className="text-xs font-black text-slate-800 whitespace-nowrap">
                {totalChapters}장
              </span>
            </div>
            <div className="bg-white rounded-lg p-1.5 border border-slate-100 shadow-2xs">
              <span className="block text-[10px] text-slate-400">총 글자</span>
              <span className="text-xs font-black text-slate-800 whitespace-nowrap">
                {totalCharacters.toLocaleString()}자
              </span>
            </div>
            <div className="bg-white rounded-lg p-1.5 border border-slate-100 shadow-2xs">
              <span className="block text-[10px] text-slate-400">읽기시간</span>
              <span className="text-xs font-black text-slate-800 whitespace-nowrap">
                약 {readingTimeMin}분
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. 하단 유틸리티 및 사용자 정보 */}
      <div className="mt-4 shrink-0 space-y-2 border-t border-slate-200/80 pt-3">
        <Link
          href="/guide"
          className="w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/25 transition-all group"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">📖</span>
            <span className="group-hover:text-amber-700 transition-colors">연동 & 사용 매뉴얼</span>
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded shadow-xs">
            GUIDE
          </span>
        </Link>

        <button
          type="button"
          onClick={onOpenHelp}
          className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
        >
          <HelpCircle className="h-4 w-4 text-slate-400" />
          <span>빠른 도움말 팝업</span>
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
        >
          <KeyRound className="h-4 w-4 text-amber-500" />
          <span>🔑 API 키 등록 (Gemini)</span>
        </button>

        <div className="flex items-center justify-between border-t border-slate-100 pt-2 px-1 text-slate-500">
          <div className="truncate text-[11px] font-medium max-w-[130px]" title={userEmail}>
            {userEmail || "로그인 사용자"}
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-1 rounded px-1.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 transition"
              title="로그아웃"
            >
              <LogOut className="h-3 w-3" />
              <span>로그아웃</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 데스크톱 고정 사이드바 */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white">
        {content}
      </aside>

      {/* 모바일 슬라이드 드로어 */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 w-72 max-w-[85vw] bg-white h-full shadow-2xl">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
