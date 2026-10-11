"use client";

import React, { useState, useEffect } from "react";
import {
  Lightbulb,
  Utensils,
  Search,
  Sparkles,
} from "lucide-react";
import { Header } from "@/components/Header";
import { SettingsModal } from "@/components/SettingsModal";
import { TrendLinksModal } from "@/components/TrendLinksModal";
import { TopicIdeaSection } from "@/components/TopicIdeaSection";
import { PlacesVisionSection } from "@/components/PlacesVisionSection";
import { PostCreationSection } from "@/components/PostCreationSection";
import { AppSettings, DEFAULT_SETTINGS, getStoredSettings } from "@/lib/storage";

type MainTab = "ideas" | "places" | "keyword-fighter";

export default function HomePage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTrendsOpen, setIsTrendsOpen] = useState(false);

  // Active Main Tab
  const [activeMainTab, setActiveMainTab] = useState<MainTab>("ideas");

  // Selected Topic state passed to PostCreationSection
  const [selectedTopic, setSelectedTopic] = useState("");
  const [extraPromptHint, setExtraPromptHint] = useState("");

  useEffect(() => {
    setSettings(getStoredSettings());
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <Header
        settings={settings}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenTrends={() => setIsTrendsOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Main 3 Tabs Navigation Bar */}
        <div className="flex items-center gap-2 border-b border-slate-200/90 pb-2">
          <button
            type="button"
            onClick={() => setActiveMainTab("ideas")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition ${
              activeMainTab === "ideas"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span>주제 아이디어 얻기</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab("places")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition ${
              activeMainTab === "places"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Utensils className="w-4 h-4 text-emerald-500" />
            <span>맛집/카페/여행</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab("keyword-fighter")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition ${
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
          </button>
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

        {/* Tab 3 Content: 키워드 파이터 PRO 스켈레톤 (STEP 4에서 구현) */}
        {activeMainTab === "keyword-fighter" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Search className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                키워드 파이터 PRO (실시간 뉴스 & 키워드 경쟁력)
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Google/Naver 자동완성 키워드, 국내 언론사 실시간 RSS 뉴스 피드, 상위 블로그 PostView 다이렉트 수집기 및 오늘의 전략 키워드 10대 이슈를 제공합니다.
              </p>
            </div>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Sparkles className="w-3.5 h-3.5" />
                STEP 4 단계에서 탑재 예정입니다.
              </span>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>
          © 2026 AIMaster · 네이버 블로그 올인원 마스터 PRO · 사용자 개인 API 키 격리 보관 원칙 준수
        </p>
      </footer>

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
