"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { IntroSection } from "./IntroSection";
import { StepBuilder } from "./StepBuilder";
import { ResultSection } from "./ResultSection";
import { ApiKeyModal } from "./ApiKeyModal";
import { HelpModal } from "./HelpModal";
import { PromptFormData, PromptMode, GeneratedPromptResult, MagicStrategyType } from "@/types/prompt";
import { PromptPreset } from "@/data/presets";
import { SuggestType } from "@/lib/prompt-engine";

interface PromptStudioAppProps {
  userEmail?: string | null;
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

export function PromptStudioApp({ userEmail }: PromptStudioAppProps) {
  const [currentTab, setCurrentTab] = useState<"mode" | "build" | "result">("mode");
  const [formData, setFormData] = useState<PromptFormData>(DEFAULT_FORM_STATE);
  const [result, setResult] = useState<GeneratedPromptResult | null>(null);

  // 로딩 상태
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);

  // API 키 및 도움말 모달
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);

  // 초기 API 키 확인
  useEffect(() => {
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

  const handleRestart = () => {
    setFormData(DEFAULT_FORM_STATE);
    setResult(null);
    setCurrentTab("mode");
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col md:flex-row antialiased text-neutral-900 font-sans">
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

      {/* 메인 작업 영역 (화이트 베이스 클린 테마) */}
      <main className="flex-1 min-h-screen overflow-y-auto p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
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
