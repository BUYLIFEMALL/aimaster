"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import ApiKeyModal from "@/components/ApiKeyModal";
import GuideModal from "@/components/GuideModal";
import FullscreenModal from "@/components/FullscreenModal";
import StrategyColumn from "@/components/StrategyColumn";
import SettingsColumn from "@/components/SettingsColumn";
import ResultColumn from "@/components/ResultColumn";
import { Download, Upload, HelpCircle, Key, Sparkles } from "lucide-react";
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

interface WorkspaceProps {
  userEmail: string;
}

export default function Workspace({ userEmail }: WorkspaceProps) {
  const [apiKey, setApiKey] = useState("");
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(1);

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

  // Load API Key from server or localStorage
  useEffect(() => {
    async function loadKey() {
      // 1. 서버에 저장된 사용자 키 확인
      try {
        const res = await fetch("/api/user/key");
        if (res.ok) {
          const data = await res.json();
          if (data.key) {
            setApiKey(data.key);
            localStorage.setItem(API_KEY_STORAGE_KEY, data.key);
            return;
          }
        }
      } catch {
        // fallback to localStorage
      }

      // 2. localStorage 확인
      const saved = localStorage.getItem(API_KEY_STORAGE_KEY);
      if (saved) setApiKey(saved);
    }
    loadKey();
  }, []);

  const handleSaveApiKey = async (newKey: string) => {
    setApiKey(newKey);
    localStorage.setItem(API_KEY_STORAGE_KEY, newKey);

    // 서버 user_api_keys 테이블에도 동기화 저장
    try {
      await fetch("/api/user/key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: newKey }),
      });
    } catch {
      // ignore server sync error
    }
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
      setActiveStep(2);
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
    setActiveStep(2);
  };

  // 4. Generate Thumbnail Image
  const handleGenerateImage = async (feedback?: string) => {
    if (!apiKey.trim()) {
      setIsApiKeyModalOpen(true);
      return;
    }
    if (!settings.title.trim()) {
      setErrorMessage("2단계에서 썸네일 제목(문구)을 먼저 입력해주세요.");
      setActiveStep(2);
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
      setActiveStep(3);
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
  const handleImportProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
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
    e.target.value = "";
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 md:flex-row antialiased">
      {/* Sidebar (docs/SIDEBAR_LAYOUT_STANDARD.md 규격) */}
      <Sidebar
        userEmail={userEmail}
        activeStep={activeStep}
        onSelectStep={setActiveStep}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Mini Header */}
        <header className="bg-white/80 backdrop-blur-xs border-b border-slate-200 px-5 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-700">
              AI 유튜브 썸네일 & A/B 전략 스튜디오
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Backup export/import */}
            <button
              onClick={handleExportProject}
              title="설정 JSON 백업 다운로드"
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              백업
            </button>
            <label className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              불러오기
              <input
                type="file"
                accept=".json"
                onChange={handleImportProject}
                className="hidden"
              />
            </label>

            <button
              onClick={() => setIsGuideModalOpen(true)}
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="가이드"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsApiKeyModalOpen(true)}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                apiKey.trim()
                  ? "bg-slate-900 text-white hover:bg-slate-800"
                  : "bg-amber-500 text-white hover:bg-amber-600 animate-bounce"
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>{apiKey.trim() ? "Gemini 연동됨" : "API키 등록"}</span>
            </button>
          </div>
        </header>

        {/* 3-Column Studio Grid */}
        <main className="flex-1 p-4 sm:p-6 lg:p-7">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* 1. 기획 및 전략 */}
            <div className={activeStep === 1 ? "ring-2 ring-indigo-500/20 rounded-2xl" : ""}>
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
            </div>

            {/* 2. 썸네일 상세 설정 */}
            <div className={activeStep === 2 ? "ring-2 ring-indigo-500/20 rounded-2xl" : ""}>
              <SettingsColumn
                settings={settings}
                onSettingsChange={setSettings}
              />
            </div>

            {/* 3. 결과물 */}
            <div className={activeStep === 3 ? "ring-2 ring-indigo-500/20 rounded-2xl" : ""}>
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
          </div>
        </main>

        {/* Footer */}
        <footer className="py-5 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
          <p>© 2026 AIMaster · AI 유튜브 썸네일 프로 PRO (v1.01) · All Rights Reserved</p>
        </footer>
      </div>

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
