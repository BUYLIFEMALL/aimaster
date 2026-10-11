"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Sidebar, MainTabType } from "@/components/Sidebar";
import { SettingsModal } from "@/components/SettingsModal";
import { TrendLinksModal } from "@/components/TrendLinksModal";
import { TopicIdeaSection } from "@/components/TopicIdeaSection";
import { PlacesVisionSection } from "@/components/PlacesVisionSection";
import { KeywordFighterSection } from "@/components/KeywordFighterSection";
import { PostCreationSection } from "@/components/PostCreationSection";
import { LibrarySection } from "@/components/blog/LibrarySection";
import { getPost } from "@/lib/blog/postsApi";
import type { SavedPost } from "@/lib/blog/types";
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

  // 보관함에서 연 글(글 작성 영역이 한 번 읽고 비운다)
  const [loadedPost, setLoadedPost] = useState<SavedPost | null>(null);

  const openFromLibrary = async (id: string): Promise<string | null> => {
    try {
      const saved = await getPost(id);
      setLoadedPost(saved);
      setActiveMainTab("ideas");
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "저장된 글을 불러오지 못했습니다.";
    }
  };

  // Handle URL query parameters without breaking SSR
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const tabParam = sp.get("tab");
      if (tabParam === "ideas" || tabParam === "places" || tabParam === "library") {
        setActiveMainTab(tabParam);
      } else if (tabParam === "keyword-finder" || tabParam === "keyword-fighter") {
        setActiveMainTab("keyword-finder");
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

    // Load Supabase user email safely
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user?.email) {
          setUserEmail(data.user.email);
        }
      }).catch((err) => {
        console.warn("Failed to load user email:", err);
      });
    } catch (e) {
      console.warn("Supabase client init error:", e);
    }
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

          {/* Tab 1 Content: 주제 아이디어 얻기 (E-E-A-T 기반, 카테고리별, 에버그린, 롱테일, 메모/파일) */}
          {activeMainTab === "ideas" && (
            <>
              <TopicIdeaSection
                settings={settings}
                onSelectTopic={handleSelectTopic}
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
            </>
          )}

          {/* Tab 2 Content: 맛집/카페/여행 멀티모달 비전 엔진 */}
          {activeMainTab === "places" && (
            <PlacesVisionSection
              settings={settings}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          )}

          {/* Tab 3 Content: 키워드 파인더 PRO (7대 분석 엔진 탑재) */}
          {(activeMainTab === "keyword-finder" || activeMainTab === "keyword-fighter") && (
            <>
              <KeywordFighterSection
                settings={settings}
                onSelectTopic={handleSelectTopic}
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
            </>
          )}

          {/* 글 작성·결과 영역은 한 곳에 고정한다(탭을 바꿔도 작업 중인 글·이미지가 사라지지 않게). 맛집 탭·보관함 탭에서는 숨긴다. */}
          <div id="post-creation-area" className={activeMainTab === "places" || activeMainTab === "library" ? "hidden" : ""}>
            <PostCreationSection
              topic={selectedTopic}
              setTopic={setSelectedTopic}
              extraPromptHint={extraPromptHint}
              settings={settings}
              onOpenSettings={() => setIsSettingsOpen(true)}
              loaded={loadedPost}
              onLoadedConsumed={() => setLoadedPost(null)}
              onOpenLibrary={() => setActiveMainTab("library")}
            />
          </div>

          {/* Tab 4: 내 보관함 (저장한 글·이미지) */}
          {activeMainTab === "library" && (
            <LibrarySection onOpen={openFromLibrary} onGoCreate={() => setActiveMainTab("ideas")} />
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
