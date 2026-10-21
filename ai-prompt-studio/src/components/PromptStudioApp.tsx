"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "./Sidebar";
import { IntroSection } from "./IntroSection";
import { StepBuilder } from "./StepBuilder";
import { ResultSection } from "./ResultSection";
import { ApiKeyModal } from "./ApiKeyModal";
import { HelpModal } from "./HelpModal";
import { PromptGuideView } from "./PromptGuideView";
import { TemplatesView } from "./templates/TemplatesView";
import type { PromptTemplate } from "@/types/template";
import { extractVariables } from "@/types/template";
import { PromptFormData, PromptMode, GeneratedPromptResult, MagicStrategyType } from "@/types/prompt";
import { PromptPreset } from "@/data/presets";
import { SuggestType } from "@/lib/prompt-engine";

interface PromptStudioAppProps {
  userEmail?: string | null;
  initialTab?: "mode" | "build" | "result" | "guide" | "templates";
}

const DEFAULT_FORM_STATE: PromptFormData = {
  mode: "RTSC",
  goal: "",
  role: "",
  task: "",
  structure: "",
  chain: "",
  excludedCapabilities: [],
  feedback: "",
};

export function PromptStudioApp({ userEmail, initialTab = "mode" }: PromptStudioAppProps) {
  const [currentTab, setCurrentTab] = useState<"mode" | "build" | "result" | "guide" | "templates">(initialTab);
  const [formData, setFormData] = useState<PromptFormData>(DEFAULT_FORM_STATE);
  const [result, setResult] = useState<GeneratedPromptResult | null>(null);

  // 로딩 상태
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);

  // API 키 및 도움말 모달
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);

  // 📁 내 템플릿 보관함(2026-10-21 병합 C): 결과 화면에서 저장할 초안
  const [templateDraft, setTemplateDraft] = useState<PromptTemplate | null>(null);
  const openApiKeyModal = useCallback(() => setApiKeyModalOpen(true), []);
  const clearTemplateDraft = useCallback(() => setTemplateDraft(null), []);

  // 초기 API 키 확인 및 URL 쿼리 파라미터 확인
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "guide" || tabParam === "templates" || tabParam === "mode" || tabParam === "build" || tabParam === "result") {
        setCurrentTab(tabParam as any);
      }
    }

    fetch("/api/user-key")
      .then((res) => res.json())
      .then((data) => {
        if (data.hasKey) {
          setMaskedKey(data.maskedKey);
        }
      })
      .catch((err) => console.error("API 키 상태 조회 실패:", err));
  }, []);

  // 폼 필드 부분 업데이트
  const handleFormChange = (updates: Partial<PromptFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  // 모드 선택
  const handleSelectMode = (mode: PromptMode) => {
    setFormData((prev) => ({ ...prev, mode }));
  };

  // 프리셋 적용
  const handleApplyPreset = (preset: PromptPreset) => {
    setFormData({
      mode: preset.mode,
      goal: preset.goal,
      role: preset.role,
      task: preset.task,
      structure: preset.structure,
      chain: preset.chain,
      excludedCapabilities: preset.excludedCapabilities || [],
      feedback: "",
    });
  };

  // 실시간 AI 필드별 제안 호출
  const handleCallSuggest = async (
    type: SuggestType,
    context: { goal: string; role?: string; task?: string }
  ): Promise<string[] | string> => {
    const res = await fetch("/api/ai-suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, context }),
    });

    const data = await res.json();
    if (!res.ok) {
      if (data.needApiKey) {
        setApiKeyModalOpen(true);
      }
      throw new Error(data.error || "제안 요청 실패");
    }

    return data.suggestion;
  };

  // 프롬프트 생성 실행
  const handleGeneratePrompt = async (overrideForm?: PromptFormData) => {
    const targetData = overrideForm || formData;
    if (!targetData.goal.trim()) {
      alert("목표 또는 주제를 입력해주세요.");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(targetData),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.needApiKey) {
          setApiKeyModalOpen(true);
        }
        throw new Error(data.error || "프롬프트 생성 실패");
      }

      setResult(data.result);
      setCurrentTab("result");
    } catch (err: any) {
      alert(err.message || "프롬프트 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  // 빠른 프롬프트 만들기 (Quick Magic) 즉시 생성
  const handleQuickMagic = (magicType: MagicStrategyType, rawIdea: string) => {
    const quickForm: PromptFormData = {
      mode: "ARCHITECT",
      magicType,
      goal: rawIdea,
      task: "",
      role: "",
      structure: "",
      chain: "",
      excludedCapabilities: [],
      feedback: "",
    };
    setFormData(quickForm);
    handleGeneratePrompt(quickForm);
  };

  // 피드백 반영 재작성
  const handleFeedback = async (feedbackText: string) => {
    setIsRefining(true);
    try {
      const updatedForm: PromptFormData = {
        ...formData,
        feedback: feedbackText,
      };

      const res = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedForm),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.needApiKey) {
          setApiKeyModalOpen(true);
        }
        throw new Error(data.error || "피드백 반영 실패");
      }

      setResult(data.result);
    } catch (err: any) {
      alert(err.message || "피드백 처리 중 오류가 발생했습니다.");
    } finally {
      setIsRefining(false);
    }
  };

  // API 키 저장 핸들러
  const handleSaveKey = async (apiKey: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/user-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMaskedKey(data.maskedKey);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // 결과 화면 「📁 내 템플릿으로 저장」: 완성 프롬프트를 새 템플릿 초안으로 넘기고 보관함 편집 창을 연다
  const handleSaveAsTemplate = () => {
    if (!result) return;
    const content = result.generatedPrompt;
    setTemplateDraft({
      id: "",
      title: formData.goal.trim().slice(0, 60) || "새 프롬프트 템플릿",
      description: `AI Prompt ${formData.mode} 모드로 설계한 프롬프트`,
      content,
      category: "Personal",
      variables: extractVariables(content),
      createdAt: Date.now(),
    });
    setCurrentTab("templates");
  };

  const handleRestart = () => {
    setFormData(DEFAULT_FORM_STATE);
    setResult(null);
    setCurrentTab("mode");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row antialiased text-slate-900 font-sans">
      {/* 플랫폼 표준 좌측 사이드바 */}
      <Sidebar
        currentTab={currentTab}
        setTab={setCurrentTab}
        selectedMode={formData.mode}
        hasResult={!!result}
        onOpenApiKey={() => setApiKeyModalOpen(true)}
        onOpenHelp={() => setHelpModalOpen(true)}
        userEmail={userEmail}
      />

      {/* 메인 작업 영역 (포커스 스튜디오 단일 테마) */}
      <main className="flex-1 min-h-screen overflow-y-auto p-4 md:p-8 bg-[#f8fafc]">
        <div className="max-w-5xl mx-auto">
          {currentTab === "guide" && (
            <PromptGuideView
              onGoToStudio={() => setCurrentTab("mode")}
              onOpenApiKey={() => setApiKeyModalOpen(true)}
            />
          )}

          {currentTab === "templates" && (
            <TemplatesView draft={templateDraft} onDraftConsumed={clearTemplateDraft} onNeedApiKey={openApiKeyModal} />
          )}

          {currentTab === "mode" && (
            <IntroSection
              currentMode={formData.mode}
              onSelectMode={handleSelectMode}
              onApplyPreset={handleApplyPreset}
              onQuickMagic={handleQuickMagic}
              onNextStep={() => setCurrentTab("build")}
            />
          )}

          {currentTab === "build" && (
            <StepBuilder
              formData={formData}
              onChange={handleFormChange}
              onGenerate={() => handleGeneratePrompt()}
              onPrevStep={() => setCurrentTab("mode")}
              isGenerating={isGenerating}
              onCallSuggest={handleCallSuggest}
            />
          )}

          {currentTab === "result" && (
            <ResultSection
              result={result}
              onFeedback={handleFeedback}
              isRefining={isRefining}
              onRestart={handleRestart}
              onBackToEdit={() => setCurrentTab("build")}
              onSaveTemplate={handleSaveAsTemplate}
            />
          )}
        </div>
      </main>

      {/* API 키 모달 */}
      <ApiKeyModal
        isOpen={apiKeyModalOpen}
        onClose={() => setApiKeyModalOpen(false)}
        maskedKey={maskedKey}
        onSaveKey={handleSaveKey}
      />

      {/* 사용 가이드 모달 */}
      <HelpModal
        isOpen={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
      />
    </div>
  );
}
