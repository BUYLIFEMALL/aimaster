"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  Lightbulb,
  Utensils,
  Search,
  KeyRound,
  Download,
  TrendingUp,
  LayoutDashboard,
  LogOut,
  X,
  ExternalLink,
} from "lucide-react";
import { APP_NAME, APP_VERSION } from "@/lib/version";
import { signOutAction } from "@/lib/actions/auth";

export type MainTabType = "ideas" | "places" | "keyword-fighter";

interface SidebarProps {
  activeTab: MainTabType;
  onSelectTab: (tab: MainTabType) => void;
  onOpenSettings: () => void;
  onOpenTrends: () => void;
  userEmail?: string;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

const FLOW_STEPS = [
  {
    step: 1,
    id: "ideas" as MainTabType,
    href: "/?tab=ideas",
    icon: Lightbulb,
    iconColor: "text-amber-500",
    label: "주제 아이디어 발굴",
    description: "E-E-A-T·카테고리·에버그린 등 5대 발굴",
  },
  {
    step: 2,
    id: "places" as MainTabType,
    href: "/?tab=places",
    icon: Utensils,
    iconColor: "text-emerald-500",
    label: "맛집/카페/여행 비전",
    description: "스마트폰 사진 AI 분석 & 감성/정보성",
  },
  {
    step: 3,
    id: "keyword-fighter" as MainTabType,
    href: "/?tab=keyword-fighter",
    icon: Search,
    iconColor: "text-indigo-500",
    label: "키워드 파이터 PRO",
    description: "7대 분석 엔진 & 실시간 노출 분석",
    isProBadge: true,
  },
];

export function Sidebar({
  activeTab,
  onSelectTab,
  onOpenSettings,
  onOpenTrends,
  userEmail = "buylife@buylife.xyz",
  isOpenMobile = false,
  onCloseMobile,
}: SidebarProps) {
  const content = (
    <div className="flex h-full flex-col justify-between overflow-y-auto bg-white p-4">
      {/* 1. 상단 브랜딩 & 버전 & 다른 프로그램 보기 */}
      <div>
        <div className="mb-4 border-b border-slate-200/90 pb-4">
          <div className="flex items-center justify-between">
            {/* 메인 홈 링크가 걸린 헤더 로고 & 프로그램명 */}
            <Link
              href="/"
              onClick={() => {
                onSelectTab("ideas");
                window.scrollTo({ top: 0, behavior: "smooth" });
                if (onCloseMobile) onCloseMobile();
              }}
              className="flex items-center gap-2.5 hover:opacity-90 transition group"
              title="메인 홈으로 이동"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 text-white shadow-md shadow-indigo-100 group-hover:scale-105 transition-transform">
                <Sparkles className="h-4.5 w-4.5" />
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

            {/* 모바일 닫기 버튼 */}
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

          {/* 메인 카탈로그 전체 프로그램 목록 링크 */}
          <a
            href="https://www.buylife.xyz/programs"
            className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors font-medium"
            title="AI Master 전체 프로그램 카탈로그 보기"
          >
            <span>← 다른 프로그램 보기</span>
          </a>
        </div>

        {/* 2. 대시보드 & 핵심 작업 흐름 (스텝퍼 1 -> 2 -> 3) */}
        <div className="space-y-3">
          {/* 최상단 대시보드 / 개요 링크 */}
          <Link
            href="/"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              if (onCloseMobile) onCloseMobile();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <LayoutDashboard className="h-4 w-4 text-slate-500" />
            <span>대시보드 메인</span>
          </Link>

          {/* 스텝퍼 섹션 라벨 */}
          <div className="px-1 pt-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              작업 흐름 (STEP 1~3)
            </span>
          </div>

          {/* 핵심 작업 흐름: 번호 배지와 세로 연결선 (1 -> 2 -> 3) - Link 태그 적용 */}
          <nav className="relative flex flex-col">
            {FLOW_STEPS.map((item, idx) => {
              const isActive = activeTab === item.id;
              const isLast = idx === FLOW_STEPS.length - 1;
              const Icon = item.icon;

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={(e) => {
                    // SPA 모드 부드러운 전환
                    onSelectTab(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className="group relative flex w-full text-left gap-3 pb-2 transition-all cursor-pointer"
                >
                  {/* 스텝 번호 원형 배지 + 연결선 */}
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

                  {/* 라벨 + 한 줄 설명 */}
                  <div
                    className={`min-w-0 flex-1 rounded-xl px-2.5 py-1.5 transition-all ${
                      isActive
                        ? "bg-slate-100/90 border border-slate-200/80 shadow-xs"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className={`h-3.5 w-3.5 ${item.iconColor}`} />
                      <span
                        className={`text-xs font-black truncate ${
                          isActive ? "text-slate-900" : "text-slate-700"
                        }`}
                      >
                        {item.label}
                      </span>
                      {item.isProBadge && (
                        <span className="px-1 py-0.2 text-[8px] font-black bg-rose-500 text-white rounded">
                          PRO
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-normal">
                      {item.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* 3. 구분선 및 유틸리티 항목 */}
        <div className="mt-4 border-t border-slate-200/90 pt-3 space-y-1">
          <div className="px-1 pb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              유틸리티 & 연동
            </span>
          </div>

          {/* 🔑 API키등록·플랫폼연동 링크 */}
          <Link
            href="/?modal=settings"
            onClick={(e) => {
              e.preventDefault();
              onOpenSettings();
              if (onCloseMobile) onCloseMobile();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <KeyRound className="h-4 w-4 text-amber-500" />
            <span>API키등록·플랫폼연동</span>
          </Link>

          {/* 🧩 크롬 확장 프로그램 다운로드 링크 */}
          <a
            href="/downloads/naver-blog-allinone-latest.zip"
            download="naver-blog-allinone-latest.zip"
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Download className="h-4 w-4 text-emerald-600" />
              <span>크롬 확장 프로그램</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              ZIP
            </span>
          </a>

          {/* 📈 실시간 트렌드 분석 링크 */}
          <Link
            href="/?modal=trends"
            onClick={(e) => {
              e.preventDefault();
              onOpenTrends();
              if (onCloseMobile) onCloseMobile();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <TrendingUp className="h-4 w-4 text-indigo-500" />
            <span>실시간 트렌드 분석</span>
          </Link>
        </div>
      </div>

      {/* 4. 하단 고정 사용자 계정 & 로그아웃 */}
      <div className="mt-4 border-t border-slate-200/90 pt-3">
        <p
          className="truncate px-2 py-1 text-xs font-medium text-slate-500"
          title={userEmail}
        >
          {userEmail || "로그인 계정"}
        </p>

        <form action={signOutAction}>
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
      {/* 데스크톱 고정 사이드바 */}
      <aside className="hidden h-screen w-64 shrink-0 border-r border-slate-200 bg-white md:sticky md:top-0 md:flex md:flex-col shadow-xs z-20">
        {content}
      </aside>

      {/* 모바일 슬라이드 드로어 오버레이 */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
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
