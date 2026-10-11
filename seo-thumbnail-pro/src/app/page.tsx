"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import ApiKeyModal from "@/components/ApiKeyModal";
import GuideModal from "@/components/GuideModal";
import FullscreenModal from "@/components/FullscreenModal";
import StrategyColumn from "@/components/StrategyColumn";
import SettingsColumn from "@/components/SettingsColumn";
import ResultColumn from "@/components/ResultColumn";
import {
  ThumbnailSettings,
  SeoStrategy,
  ComprehensiveMetadata,
} from "@/types/thumbnail";
import {
  generateStrategies,
  analyzeSeoData,
  generateThumbnailImage,
} from "@/lib/gemini";

const API_KEY_STORAGE_KEY = "seo_thumbnail_pro_gemini_key";

const INITIAL_SETTINGS: ThumbnailSettings = {
  title: "",
  keywords: "",
  genre: "일상/브이로그",
  mood: "선명한",
  subject: {
    include: false,
    race: "한국인",
    age: "20대",
    gender: "여성",
    description: "",
  },
};

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

  // Step 1 State
  const [script, setScript] = useState("");
  const [strategies, setStrategies] = useState<SeoStrategy[]>([]);
  const [comprehensive, setComprehensive] = useState<ComprehensiveMetadata | null>(null);
  const [isGeneratingStrategies, setIsGeneratingStrategies] = useState(false);
  const [seoRawText, setSeoRawText] = useState("");
  const [isAnalyzingSeo, setIsAnalyzingSeo] = useState(false);

  // Step 2 State
  const [settings, setSettings] = useState<ThumbnailSettings>(INITIAL_SETTINGS);

  // Step 3 State
  const [imageResult, setImageResult] = useState<string | null>(null);
  const [usedPrompt, setUsedPrompt] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load API Key from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (saved) setApiKey(saved);
  }, []);

  const handleSaveApiKey = (newKey: string) => {
    setApiKey(newKey);
    localStorage.setItem(API_KEY_STORAGE_KEY, newKey);
  };

  // 1. Generate Strategies
  const handleGenerateStrategies = async () => {
    if (!apiKey.trim()) {
      setIsApiKeyModalOpen(true);
      return;
    }
    setIsGeneratingStrategies(true);
    setErrorMessage(null);

    try {
      const res = await generateStrategies(apiKey, script);
      setStrategies(res.strategies);
      setComprehensive(res.comprehensive);
    } catch (err: any) {
      setErrorMessage(err.message || "A/B 테스트 전략 생성 실패");
    } finally {
      setIsGeneratingStrategies(false);
    }
  };

  // 2. Direct SEO Analysis
  const handleAnalyzeSeo = async () => {
    if (!apiKey.trim()) {
      setIsApiKeyModalOpen(true);
      return;
    }
    setIsAnalyzingSeo(true);
    setErrorMessage(null);

    try {
      const res = await analyzeSeoData(apiKey, seoRawText);
      setSettings((prev) => ({
        ...prev,
        title: res.title || prev.title,
        keywords: res.keywords || prev.keywords,
        genre: res.genre || prev.genre,
        mood: res.mood || prev.mood,
        subject: {
          ...prev.subject,
          include: res.includePerson ?? prev.subject.include,
          description: res.subjectDescription || prev.subject.description,
        },
      }));
    } catch (err: any) {
      setErrorMessage(err.message || "SEO 역분석 실패");
    } finally {
      setIsAnalyzingSeo(false);
    }
  };

  // 3. Apply Strategy to Settings
  const handleApplyStrategy = (strat: SeoStrategy) => {
    setSettings((prev) => ({
      ...prev,
      title: strat.title,
      keywords: strat.tags.replace(/#/g, "").trim(),
      subject: {
        ...prev.subject,
        include: true,
        description: strat.visualStrategy,
      },
    }));
  };

  // 4. Generate Thumbnail Image
  const handleGenerateImage = async (feedback?: string) => {
    if (!apiKey.trim()) {
      setIsApiKeyModalOpen(true);
      return;
    }
    if (!settings.title.trim()) {
      setErrorMessage("2단계에서 썸네일 제목(문구)을 먼저 입력해주세요.");
      return;
    }

    setIsGeneratingImage(true);
    setErrorMessage(null);

    try {
      const res = await generateThumbnailImage(
        apiKey,
        settings,
        feedback,
        feedback ? imageResult ?? undefined : undefined
      );
      setImageResult(res.image);
      setUsedPrompt(res.prompt);
    } catch (err: any) {
      setErrorMessage(err.message || "썸네일 이미지 생성 실패");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // 5. Export Project JSON
  const handleExportProject = () => {
    const projectData = {
      version: "v1.01",
      exportedAt: new Date().toISOString(),
      script,
      strategies,
      comprehensive,
      settings,
      hasResult: !!imageResult,
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seo-thumbnail-project-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 6. Import Project JSON
  const handleImportProject = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.script) setScript(data.script);
        if (data.strategies) setStrategies(data.strategies);
        if (data.comprehensive) setComprehensive(data.comprehensive);
        if (data.settings) setSettings(data.settings);
        alert("프로젝트 설정을 성공적으로 불러왔습니다!");
      } catch {
        alert("올바른 JSON 프로젝트 파일이 아닙니다.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <Header
        hasApiKey={!!apiKey.trim()}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onOpenGuideModal={() => setIsGuideModalOpen(true)}
        onExportProject={handleExportProject}
        onImportProject={handleImportProject}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Column 1: 기획 및 전략 */}
          <StrategyColumn
            script={script}
            onScriptChange={setScript}
            isGeneratingStrategies={isGeneratingStrategies}
            onGenerateStrategies={handleGenerateStrategies}
            strategies={strategies}
            comprehensive={comprehensive}
            onApplyStrategy={handleApplyStrategy}
            seoRawText={seoRawText}
            onSeoRawTextChange={setSeoRawText}
            isAnalyzingSeo={isAnalyzingSeo}
            onAnalyzeSeo={handleAnalyzeSeo}
          />

          {/* Column 2: 썸네일 상세 설정 */}
          <SettingsColumn
            settings={settings}
            onSettingsChange={setSettings}
          />

          {/* Column 3: 결과물 */}
          <ResultColumn
            imageResult={imageResult}
            usedPrompt={usedPrompt}
            isGeneratingImage={isGeneratingImage}
            onGenerateImage={handleGenerateImage}
            onOpenFullscreen={() => setIsFullscreenOpen(true)}
            errorMessage={errorMessage}
            hasTitle={!!settings.title.trim()}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
        <p>
          © 2026 AIMaster · AI 유튜브 썸네일 프로 PRO (v1.01) · All Rights Reserved
        </p>
      </footer>

      {/* Modals */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
      />

      <GuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />

      <FullscreenModal
        isOpen={isFullscreenOpen}
        onClose={() => setIsFullscreenOpen(false)}
        imageUrl={imageResult || ""}
        onDownload={() => {
          if (!imageResult) return;
          const a = document.createElement("a");
          a.href = imageResult;
          a.download = `youtube-thumbnail-${Date.now()}.png`;
          a.click();
        }}
      />
    </div>
  );
}
