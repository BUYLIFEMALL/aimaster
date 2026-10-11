"use client";

import React, { useState, useEffect } from "react";
import { Sidebar, FlowStep } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { UrlInputSection } from "@/components/scraper/UrlInputSection";
import { ScraperTabs, TabId } from "@/components/scraper/ScraperTabs";
import { SectorModal } from "@/components/modals/SectorModal";
import { SettingsModal } from "@/components/modals/SettingsModal";
import { HelpModal } from "@/components/modals/HelpModal";
import {
  CrawlResult,
  AiStructuredItem,
  AppSettings,
  DEFAULT_SETTINGS,
  SelectedSector,
} from "@/lib/types";
import {
  getStoredSettings,
  saveStoredSettings,
  getStoredLastCrawl,
  saveStoredLastCrawl,
  exportDataAsJson,
} from "@/lib/storage";
import { analyzeHtmlWithGemini } from "@/lib/gemini";
import { AlertCircle, Sparkles, Database } from "lucide-react";

interface ScraperWorkspaceProps {
  userEmail: string;
}

export default function ScraperWorkspace({ userEmail }: ScraperWorkspaceProps) {
  const [url, setUrl] = useState("https://buylife.blog");
  const [crawlResult, setCrawlResult] = useState<CrawlResult | null>(null);
  const [aiItems, setAiItems] = useState<AiStructuredItem[] | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [currentStep, setCurrentStep] = useState<FlowStep>("input");
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const [isSectorModalOpen, setIsSectorModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // 1. 초기 로컬스토리지 및 서버 키 로드
  useEffect(() => {
    const local = getStoredSettings();
    setSettings(local);

    const last = getStoredLastCrawl();
    if (last) {
      setCrawlResult(last);
      setUrl(last.metadata.url || "https://buylife.blog");
    }

    // 서버 DB(user_api_keys)에서 개인 Gemini 키 확인
    if (!local.geminiApiKey) {
      fetch("/api/user/key")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.key) {
            setSettings((prev) => {
              const updated = { ...prev, geminiApiKey: data.key };
              saveStoredSettings(updated);
              return updated;
            });
          }
        })
        .catch(() => {});
    }
  }, []);

  // 2. 크롤링 실행 핸들러
  const handleStartCrawl = async (targetOverride?: string) => {
    const target = (targetOverride || url).trim();
    if (!target) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "웹사이트 크롤링에 실패했습니다.");
      }

      setCrawlResult(data);
      saveStoredLastCrawl(data);
      setCurrentStep("review");
      setActiveTab("overview");
    } catch (err: any) {
      setErrorMessage(err.message || "크롤링 도중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 3. AI 분석 실행 핸들러
  const handleRunAiAnalysis = async (customHtml?: string) => {
    const targetHtml = customHtml || crawlResult?.cleanedHtml;
    if (!targetHtml) {
      setErrorMessage("분석할 웹페이지 HTML이 없습니다. 먼저 크롤링을 진행해주세요.");
      return;
    }

    if (!settings.geminiApiKey) {
      setIsSettingsModalOpen(true);
      setErrorMessage("Gemini API 키가 필요합니다. 설정 창에서 API 키를 등록해주세요.");
      return;
    }

    setIsAiLoading(true);
    setErrorMessage(null);

    try {
      const results = await analyzeHtmlWithGemini(
        settings.geminiApiKey,
        crawlResult?.metadata.url || url,
        targetHtml,
        settings.geminiModel
      );
      setAiItems(results);
      setCurrentStep("ai");
      setActiveTab("aiResult");
    } catch (err: any) {
      setErrorMessage(err.message || "AI 분석 중 오류가 발생했습니다.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // 4. 시각적 섹터 선택 시 해당 HTML로 AI 분석 실행
  const handleSelectSectorForAi = (sector: SelectedSector) => {
    handleRunAiAnalysis(sector.html);
  };

  // 5. 전체 데이터 JSON 내보내기
  const handleExportJson = () => {
    if (!crawlResult) return;
    const exportData = {
      crawlResult,
      aiItems,
      exportedAt: new Date().toISOString(),
      generator: "Whbsite Scraper v1.06",
    };
    exportDataAsJson(exportData, `whbsite_scraper_${new URL(crawlResult.metadata.url).hostname}`);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* 좌측 표준 사이드바 */}
      <Sidebar
        currentStep={currentStep}
        onSelectStep={setCurrentStep}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenSectorModal={() => setIsSectorModalOpen(true)}
        onExportJson={handleExportJson}
        crawlResult={crawlResult}
        isOpenMobile={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
        userEmail={userEmail}
      />

      {/* 우측 메인 영역 */}
      <div className="flex flex-1 flex-col min-w-0">
        <Header
          settings={settings}
          onOpenHelp={() => setIsHelpModalOpen(true)}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* 오류 메시지 배너 */}
          {errorMessage && (
            <div className="flex items-start gap-3 p-4 rounded-2xl border border-rose-200 bg-rose-50 text-rose-800 text-xs">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">안내 및 오류</p>
                <p className="mt-0.5 text-rose-700 leading-relaxed">{errorMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-400 hover:text-rose-600 text-[11px] font-bold"
              >
                닫기
              </button>
            </div>
          )}

          {/* 1. URL 입력 및 크롤링 섹션 */}
          <UrlInputSection
            url={url}
            onChangeUrl={setUrl}
            onStartCrawl={() => handleStartCrawl()}
            onOpenSectorModal={() => setIsSectorModalOpen(true)}
            isLoading={isLoading}
          />

          {/* 2. 크롤링 결과 7대 탭 뷰어 */}
          {crawlResult ? (
            <ScraperTabs
              activeTab={activeTab}
              onChangeTab={setActiveTab}
              crawlResult={crawlResult}
              aiItems={aiItems}
              onRunAiAnalysis={() => handleRunAiAnalysis()}
              isAiLoading={isAiLoading}
            />
          ) : (
            <div className="py-20 text-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 space-y-3">
              <Database className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">
                크롤링된 데이터가 없습니다
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                상단 입력창에 수집할 웹사이트 URL을 입력하고 <strong>'크롤링 시작'</strong> 버튼을
                누르거나, <strong>'시각적 섹터 선택'</strong>을 클릭하여 웹 화면에서 직접 데이터를
                캡처하세요.
              </p>
            </div>
          )}
        </main>

        {/* 푸터 */}
        <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
          <p>© 2026 AIMaster · Whbsite Scraper · 사용자 개인 API 키 격리 보관 원칙 준수</p>
        </footer>
      </div>

      {/* 모달 목록 */}
      <SectorModal
        isOpen={isSectorModalOpen}
        onClose={() => setIsSectorModalOpen(false)}
        targetUrl={url}
        onSelectSectorForAi={handleSelectSectorForAi}
        onNavigateUrl={(newUrl) => {
          setUrl(newUrl);
          handleStartCrawl(newUrl);
        }}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={setSettings}
      />

      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />
    </div>
  );
}
