"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  LayoutDashboard,
  Search,
  Layers,
  Crosshair,
  Bot,
  KeyRound,
  Download,
  LogOut,
  X,
  FileCode,
  HardDrive,
  Link2,
  Image as ImageIcon,
  Table as TableIcon,
  FileText,
} from "lucide-react";
import { APP_NAME, APP_VERSION } from "@/lib/version";
import { CrawlResult } from "@/lib/types";

export type FlowStep = "input" | "review" | "sector" | "ai";

interface SidebarProps {
  currentStep: FlowStep;
  onSelectStep: (step: FlowStep) => void;
  onOpenSettings: () => void;
  onOpenSectorModal: () => void;
  onExportJson: () => void;
  crawlResult: CrawlResult | null;
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
    id: "input",
    label: "URL 입력 & 탐색",
    description: "대상 사이트 주소 입력 및 크롤링",
    icon: Search,
  },
  {
    step: 2,
    id: "review",
    label: "데이터 검토 & 분류",
    description: "개요, 구조, 글목록, 표, 링크, 이미지",
    icon: Layers,
  },
  {
    step: 3,
    id: "sector",
    label: "시각적 섹터 선택",
    description: "실시간 웹 미리보기 영역 클릭 추출",
    icon: Crosshair,
  },
  {
    step: 4,
    id: "ai",
    label: "AI 지능형 분석",
    description: "Gemini 기반 스마트 리스트 정형화",
    icon: Bot,
  },
];

export function Sidebar({
  currentStep,
  onSelectStep,
  onOpenSettings,
  onOpenSectorModal,
  onExportJson,
  crawlResult,
  isOpenMobile,
  onCloseMobile,
  userEmail,
}: SidebarProps) {
  const content = (
    <div className="flex h-full flex-col justify-between overflow-y-auto p-4 custom-scrollbar">
      <div className="space-y-4">
        {/* 1. 상단 로고 & 프로그램 정보 */}
        <div className="border-b border-slate-200/80 pb-3">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              onClick={() => {
                onSelectStep("input");
                if (onCloseMobile) onCloseMobile();
              }}
              className="flex items-center gap-2.5 hover:opacity-90 transition group"
              title="메인 홈으로 이동"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-indigo-600 text-white shadow-md shadow-indigo-100 group-hover:scale-105 transition-transform">
                <Sparkles className="h-4.5 w-4.5 text-indigo-300" />
              </div>
              <div>
                <h1 className="text-sm font-black text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
                  {APP_NAME}
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] font-bold text-slate-500">
                    {APP_VERSION}
                  </span>
                  <span className="px-1.5 py-0.2 text-[9px] font-extrabold bg-emerald-500 text-white rounded tracking-wide">
                    FREE
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

        {/* 2. 대시보드 메인 */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              onSelectStep("input");
              window.scrollTo({ top: 0, behavior: "smooth" });
              if (onCloseMobile) onCloseMobile();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <LayoutDashboard className="h-4 w-4 text-slate-500" />
            <span>대시보드 메인</span>
          </button>

          {/* 작업 흐름 (STEP 1~4) */}
          <div className="px-1 pt-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              작업 흐름 (STEP 1~4)
            </span>
          </div>

          <nav className="relative flex flex-col">
            {FLOW_STEPS.map((item, idx) => {
              const isActive = currentStep === item.id;
              const isLast = idx === FLOW_STEPS.length - 1;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === "sector") {
                      onOpenSectorModal();
                    } else {
                      onSelectStep(item.id);
                    }
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className="group relative flex w-full text-left gap-3 pb-2 transition-all cursor-pointer"
                >
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black transition-all ${
                        isActive
                          ? "bg-slate-900 text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                      }`}
                    >
                      {item.step}
                    </span>
                    {!isLast && (
                      <span className="mt-1 h-6 w-px bg-slate-200 group-hover:bg-slate-300" />
                    )}
                  </div>

                  <div
                    className={`min-w-0 flex-1 rounded-xl px-2.5 py-1.5 transition-all ${
                      isActive
                        ? "bg-slate-100/90 border border-slate-200/80 shadow-2xs"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-indigo-600" />
                      <span
                        className={`text-xs font-black truncate ${
                          isActive ? "text-slate-900" : "text-slate-700"
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-normal">
                      {item.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* 3. 세션 통계 카드 (크롤링 결과가 있을 때) */}
        {crawlResult && (
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                세션 통계
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-bold">
                {crawlResult.stats.charset}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-white p-2 rounded-lg border border-slate-100">
                <p className="text-[9px] text-slate-400 font-bold flex items-center gap-1">
                  <HardDrive className="h-2.5 w-2.5 text-slate-400" />
                  크기
                </p>
                <p className="font-mono font-bold text-slate-800 mt-0.5">
                  {crawlResult.stats.payloadSizeKb} KB
                </p>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-100">
                <p className="text-[9px] text-slate-400 font-bold flex items-center gap-1">
                  <Link2 className="h-2.5 w-2.5 text-slate-400" />
                  링크
                </p>
                <p className="font-mono font-bold text-slate-800 mt-0.5">
                  {crawlResult.stats.linksCount}개
                </p>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-100">
                <p className="text-[9px] text-slate-400 font-bold flex items-center gap-1">
                  <ImageIcon className="h-2.5 w-2.5 text-slate-400" />
                  이미지
                </p>
                <p className="font-mono font-bold text-slate-800 mt-0.5">
                  {crawlResult.stats.imagesCount}개
                </p>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-100">
                <p className="text-[9px] text-slate-400 font-bold flex items-center gap-1">
                  <TableIcon className="h-2.5 w-2.5 text-slate-400" />
                  데이터 표
                </p>
                <p className="font-mono font-bold text-slate-800 mt-0.5">
                  {crawlResult.stats.tablesCount}개
                </p>
              </div>
            </div>

            <div className="bg-white p-2 rounded-lg border border-slate-100">
              <p className="text-[9px] text-slate-400 font-bold flex items-center gap-1">
                <FileText className="h-2.5 w-2.5 text-slate-400" />
                감지된 글목록
              </p>
              <p className="font-mono font-bold text-slate-800 mt-0.5">
                {crawlResult.stats.listItemsCount}개 항목
              </p>
            </div>
          </div>
        )}

        {/* 4. 유틸리티 & 연동 */}
        <div className="mt-4 border-t border-slate-200/90 pt-3 space-y-1">
          <div className="px-1 pb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              데이터 & 연동
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              onExportJson();
              if (onCloseMobile) onCloseMobile();
            }}
            disabled={!crawlResult}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2.5">
              <Download className="h-4 w-4 text-emerald-600" />
              <span>데이터 내보내기 (JSON)</span>
            </div>
            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              저장
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenSettings();
              if (onCloseMobile) onCloseMobile();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <KeyRound className="h-4 w-4 text-amber-500" />
            <span>🔑 API키등록·플랫폼연동</span>
          </button>
        </div>
      </div>

      {/* 5. 하단 고정 사용자 계정 & 로그아웃 */}
      <div className="mt-4 border-t border-slate-200/90 pt-3">
        <div className="px-3 py-1 bg-slate-50 rounded-lg border border-slate-100 mb-2">
          <p className="text-[10px] text-slate-400 font-semibold uppercase">로그인 계정</p>
          <p className="truncate text-xs font-bold text-slate-700" title={userEmail}>
            {userEmail || "회원"}
          </p>
        </div>

        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>로그아웃</span>
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden h-screen w-64 shrink-0 border-r border-slate-200 bg-white md:sticky md:top-0 md:flex md:flex-col shadow-2xs z-20">
        {content}
      </aside>

      {isOpenMobile && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[80vw] bg-white shadow-xl flex flex-col h-full z-10 animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
