"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Lightbulb,
  Utensils,
  Search,
  Sparkles,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Sidebar, MainTabType } from "@/components/Sidebar";
import { SettingsModal } from "@/components/SettingsModal";
import { TrendLinksModal } from "@/components/TrendLinksModal";
import { TopicIdeaSection } from "@/components/TopicIdeaSection";
import { PlacesVisionSection } from "@/components/PlacesVisionSection";
import { KeywordFighterSection } from "@/components/KeywordFighterSection";
import { PostCreationSection } from "@/components/PostCreationSection";
import { AppSettings, DEFAULT_SETTINGS, getStoredSettings } from "@/lib/storage";
import { APP_NAME } from "@/lib/version";
import { createClient } from "@/lib/supabase/client";

export default function HomePage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTrendsOpen, setIsTrendsOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  // Active Main Tab
  const [activeMainTab, setActiveMainTab] = useState<MainTabType>("ideas");

  // Selected Topic state passed to PostCreationSection
  const [selectedTopic, setSelectedTopic] = useState("");
  const [extraPromptHint, setExtraPromptHint] = useState("");

  // Handle URL query parameters without breaking SSR
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const tabParam = sp.get("tab");
      if (tabParam === "ideas" || tabParam === "places" || tabParam === "keyword-fighter") {
        setActiveMainTab(tabParam);
      }
      const modalParam = sp.get("modal");
      if (modalParam === "settings") {
        setIsSettingsOpen(true);
      } else if (modalParam === "trends") {
        setIsTrendsOpen(true);
      }
    }
  }, []);

  useEffect(() => {
    setSettings(getStoredSettings());

    // Load Supabase user email
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) {
        setUserEmail(data.user.email);
      }
    });
  }, []);

  const handleSelectTopic = (topic: string, hint?: string) => {
    setSelectedTopic(topic);
    setExtraPromptHint(hint || "");
    window.scrollTo({
      top: document.getElementById("post-creation-area")?.offsetTop || 600,
      behavior: "smooth",
    });
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* 1. 표준 좌측 사이드바 (데스크톱 고정 + 모바일 오버레이) */}
      <Sidebar
        activeTab={activeMainTab}
        onSelectTab={(tab) => setActiveMainTab(tab)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenTrends={() => setIsTrendsOpen(true)}
        userEmail={userEmail}
        isOpenMobile={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
      />

      {/* 2. 우측 메인 영역 */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <Header
          settings={settings}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenTrends={() => setIsTrendsOpen(true)}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Main 3 Tabs Quick Switcher Bar with explicit Link tags */}
          <div className="flex items-center gap-2 border-b border-slate-200/90 pb-2 overflow-x-auto">
            <Link
              href="/?tab=ideas"
              onClick={() => setActiveMainTab("ideas")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition shrink-0 ${
                activeMainTab === "ideas"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span>주제 아이디어 발굴</span>
            </Link>

            <Link
              href="/?tab=places"
              onClick={() => setActiveMainTab("places")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition shrink-0 ${
                activeMainTab === "places"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Utensils className="w-4 h-4 text-emerald-500" />
              <span>맛집/카페/여행 비전</span>
            </Link>

            <Link
              href="/?tab=keyword-fighter"
              onClick={() => setActiveMainTab("keyword-fighter")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition shrink-0 ${
                activeMainTab === "keyword-fighter"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Search className="w-4 h-4 text-indigo-500" />
              <span>키워드 파이터</span>
              <span className="px-1.5 py-0.2 text-[9px] font-extrabold bg-rose-500 text-white rounded-md">
                PRO
              </span>
            </Link>
          </div>

          {/* Tab 1 Content: 주제 아이디어 얻기 (E-E-A-T 기반, 카테고리별, 에버그린, 롱테일, 메모/파일) */}
          {activeMainTab === "ideas" && (
            <>
              <TopicIdeaSection
                settings={settings}
                onSelectTopic={handleSelectTopic}
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
              {/* 하단 공통 포스트 생성하기 & 에디터 섹션 */}
              <div id="post-creation-area">
                <PostCreationSection
                  topic={selectedTopic}
                  setTopic={setSelectedTopic}
                  extraPromptHint={extraPromptHint}
                  settings={settings}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                />
              </div>
            </>
          )}

          {/* Tab 2 Content: 맛집/카페/여행 멀티모달 비전 엔진 */}
          {activeMainTab === "places" && (
            <PlacesVisionSection
              settings={settings}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          )}

          {/* Tab 3 Content: 키워드 파이터 PRO (7대 분석 엔진 탑재) */}
          {activeMainTab === "keyword-fighter" && (
            <>
              <KeywordFighterSection
                settings={settings}
                onSelectTopic={handleSelectTopic}
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
              {/* 하단 공통 포스트 생성하기 & 에디터 섹션 */}
              <div id="post-creation-area">
                <PostCreationSection
                  topic={selectedTopic}
                  setTopic={setSelectedTopic}
                  extraPromptHint={extraPromptHint}
                  settings={settings}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                />
              </div>
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
          <p>
            © 2026 AIMaster · {APP_NAME} · 사용자 개인 API 키 격리 보관 원칙 준수
          </p>
        </footer>
      </div>

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={(newSettings) => setSettings(newSettings)}
      />

      <TrendLinksModal
        isOpen={isTrendsOpen}
        onClose={() => setIsTrendsOpen(false)}
      />
    </div>
  );
}
