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
  HardDrive,
  Link2,
  Image as ImageIcon,
  Table as TableIcon,
  FileText,
  BookOpen,
} from "lucide-react";
import { APP_NAME, APP_VERSION } from "@/lib/version";
import { CrawlResult } from "@/lib/types";

export type FlowStep = "input" | "review" | "sector" | "ai";

interface SidebarProps {
  currentStep: FlowStep | null;
  onSelectStep: (step: FlowStep) => void;
  onOpenSettings: () => void;
  onOpenSectorModal: () => void;
  onExportJson: () => void;
  crawlResult: CrawlResult | null;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  userEmail?: string;
  /** 매뉴얼(/guide) 화면에서 열었을 때 메뉴 강조용 */
  activePage?: "workspace" | "guide";
}

const FLOW_STEPS: {
  step: number;
  id: FlowStep;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { step: 1, id: "input", label: "URL 입력 & 탐색", description: "대상 사이트 주소 입력 및 크롤링", icon: Search },
  { step: 2, id: "review", label: "데이터 검토 & 분류", description: "개요, 구조, 글목록, 표, 링크, 이미지", icon: Layers },
  { step: 3, id: "sector", label: "시각적 섹터 선택", description: "실시간 웹 미리보기 영역 클릭 추출", icon: Crosshair },
  { step: 4, id: "ai", label: "AI 지능형 분석", description: "Gemini 기반 스마트 리스트 정형화", icon: Bot },
];

const STAT_ITEMS: {
  key: "payloadSizeKb" | "linksCount" | "imagesCount" | "tablesCount";
  label: string;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "payloadSizeKb", label: "크기", unit: " KB", icon: HardDrive },
  { key: "linksCount", label: "링크", unit: "개", icon: Link2 },
  { key: "imagesCount", label: "이미지", unit: "개", icon: ImageIcon },
  { key: "tablesCount", label: "데이터 표", unit: "개", icon: TableIcon },
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
  activePage = "workspace",
}: SidebarProps) {
  const close = () => onCloseMobile?.();

  const content = (
    // 계정 칸은 마지막 메뉴 바로 아래에 붙인다(SIDEBAR_LAYOUT_STANDARD) — 메뉴만 내부 스크롤.
    <div className="flex max-h-full flex-col p-4">
      <div className="min-h-0 space-y-4 overflow-y-auto">
        {/* 1. 상단 로고 & 프로그램 정보 */}
        <div className="border-b border-mx-border pb-3">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              onClick={() => {
                onSelectStep("input");
                close();
              }}
              className="group flex items-center gap-2.5"
              title="작업 화면으로 이동"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-mx-primary text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-black tracking-tight text-mx-text group-hover:text-mx-link">{APP_NAME}</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="mx-chip-amber px-1.5 py-0 text-[11px]">{APP_VERSION}</span>
                  <span className="rounded bg-mx-success px-1.5 text-[10px] font-extrabold tracking-wide text-white">FREE</span>
                </div>
              </div>
            </Link>

            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-mx-muted hover:bg-mx-raised hover:text-mx-text md:hidden"
                aria-label="메뉴 닫기"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          <a
            href="https://www.buylife.xyz/programs"
            className="mt-3 block text-xs font-medium text-mx-muted hover:text-mx-text"
            title="AI Master 전체 프로그램 카탈로그 보기"
          >
            ← 다른 프로그램 보기
          </a>
        </div>

        {/* 2. 대시보드 + 작업 흐름 */}
        <div className="space-y-3">
          <Link
            href="/"
            onClick={() => {
              onSelectStep("input");
              window.scrollTo({ top: 0, behavior: "smooth" });
              close();
            }}
            className={`flex min-h-[44px] w-full items-center gap-2.5 rounded-xl px-3 text-sm font-bold ${
              activePage === "workspace" && currentStep === "input"
                ? "bg-mx-raised text-mx-text"
                : "text-mx-muted hover:bg-mx-raised hover:text-mx-text"
            }`}
          >
            <LayoutDashboard className="h-4 w-4 text-mx-link" />
            <span>🏠 대시보드</span>
          </Link>

          <p className="px-1 text-[11px] font-bold uppercase tracking-wider text-mx-muted">작업 흐름 (STEP 1~4)</p>

          <nav className="relative flex flex-col">
            {FLOW_STEPS.map((item, idx) => {
              const isActive = activePage === "workspace" && currentStep === item.id;
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
                    close();
                  }}
                  className="group relative flex w-full cursor-pointer gap-3 pb-2 text-left"
                >
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                        isActive
                          ? "bg-mx-primary text-white"
                          : "border border-mx-border bg-mx-raised text-mx-muted group-hover:text-mx-text"
                      }`}
                    >
                      {item.step}
                    </span>
                    {!isLast && <span className="mt-1 h-6 w-px bg-mx-border" />}
                  </div>

                  <div
                    className={`min-w-0 flex-1 rounded-xl px-2.5 py-1.5 ${
                      isActive ? "bg-mx-raised" : "group-hover:bg-mx-raised"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-mx-accent" />
                      <span className={`truncate text-sm font-bold ${isActive ? "text-mx-link" : "text-mx-text"}`}>
                        {item.label}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-xs text-mx-muted">{item.description}</p>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* 3. 세션 통계 카드 (크롤링 결과가 있을 때) */}
        {crawlResult && (
          <div className="space-y-2.5 rounded-xl border border-mx-border bg-mx-raised p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-mx-muted">세션 통계</span>
              <span className="rounded border border-mx-border px-1.5 py-0.5 font-mono text-[10px] font-bold text-mx-muted">
                {crawlResult.stats.charset}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {STAT_ITEMS.map(({ key, label, unit, icon: Icon }) => (
                <div key={key} className="rounded-lg border border-mx-border bg-mx-surface p-2">
                  <p className="flex items-center gap-1 text-[10px] font-bold text-mx-muted">
                    <Icon className="h-2.5 w-2.5" />
                    {label}
                  </p>
                  <p className="mt-0.5 font-mono font-bold text-mx-text">
                    {crawlResult.stats[key]}
                    {unit}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-mx-border bg-mx-surface p-2">
              <p className="flex items-center gap-1 text-[10px] font-bold text-mx-muted">
                <FileText className="h-2.5 w-2.5" />
                감지된 글목록
              </p>
              <p className="mt-0.5 font-mono font-bold text-mx-text">{crawlResult.stats.listItemsCount}개 항목</p>
            </div>
          </div>
        )}

        {/* 4. 유틸리티 & 연동 */}
        <div className="space-y-1 border-t border-mx-border pt-3">
          <p className="px-1 pb-1 text-[11px] font-bold uppercase tracking-wider text-mx-muted">데이터 & 연동</p>

          <button
            type="button"
            onClick={() => {
              onExportJson();
              close();
            }}
            disabled={!crawlResult}
            className="flex min-h-[44px] w-full cursor-pointer items-center justify-between rounded-xl px-3 text-sm font-bold text-mx-text hover:bg-mx-raised disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="flex items-center gap-2.5">
              <Download className="h-4 w-4 text-mx-success" />
              데이터 내보내기 (JSON)
            </span>
            <span className="mx-chip-green px-1.5 py-0 text-[10px]">저장</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenSettings();
              close();
            }}
            className="flex min-h-[44px] w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 text-sm font-bold text-mx-text hover:bg-mx-raised"
          >
            <KeyRound className="h-4 w-4 text-mx-accent" />
            <span>🔑 API키등록·플랫폼연동</span>
          </button>

          <Link
            href="/guide"
            onClick={close}
            className={`flex min-h-[44px] w-full items-center gap-2.5 rounded-xl px-3 text-sm font-bold ${
              activePage === "guide" ? "bg-mx-raised text-mx-link" : "text-mx-text hover:bg-mx-raised"
            }`}
          >
            <BookOpen className="h-4 w-4 text-mx-link" />
            <span>📖 연동 & 사용 매뉴얼</span>
          </Link>
        </div>
      </div>

      {/* 5. 계정 & 로그아웃 — 마지막 메뉴 바로 아래 */}
      <div className="mt-3 shrink-0 border-t border-mx-border pt-3">
        <p className="mb-1 truncate px-3 text-xs text-mx-muted" title={userEmail}>
          {userEmail || "회원"}
        </p>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="flex min-h-[44px] w-full cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-bold text-mx-danger hover:bg-mx-raised"
          >
            <LogOut className="h-4 w-4" />
            <span>로그아웃</span>
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <aside className="z-20 hidden h-screen w-64 shrink-0 border-r border-mx-border bg-mx-surface md:sticky md:top-0 md:flex md:flex-col">
        {content}
      </aside>

      {isOpenMobile && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/60" onClick={onCloseMobile} />
          <div className="relative z-10 flex h-full w-72 max-w-[85vw] flex-col bg-mx-surface shadow-xl">{content}</div>
        </div>
      )}
    </>
  );
}
