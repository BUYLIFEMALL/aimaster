"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Step1PromptEnhancer } from "@/components/Step1PromptEnhancer";
import { Step2PlatformGenerator } from "@/components/Step2PlatformGenerator";
import { GuideModal } from "@/components/GuideModal";
import { PageHeaderLogo } from "@/components/PageHeaderLogo";
import type { CustomStylePrompt } from "@/lib/prompts/customStylePrompts";
import { promptSourceInfo } from "@/lib/promptSource";

function DashboardContent() {
  const searchParams = useSearchParams();
  const [step2Prompt, setStep2Prompt] = useState("");
  const [step2NegativePrompt, setStep2NegativePrompt] = useState("");
  const [customPrompt, setCustomPrompt] = useState<CustomStylePrompt | null>(null);
  const [customError, setCustomError] = useState("");
  const customPromptId = searchParams.get("customPrompt");
  // v1.26: 프롬프트를 보낸 프로그램(`&src=`) — 정해 둔 이름만, 프롬프트와 함께 왔을 때만
  const promptSource = searchParams.get("prompt") ? promptSourceInfo(searchParams.get("src")) : undefined;

  useEffect(() => {
    setCustomPrompt(null); setCustomError("");
    if (!customPromptId) return;
    const controller = new AbortController();
    fetch(`/api/prompts/custom?id=${encodeURIComponent(customPromptId)}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "내 프롬프트를 불러오지 못했습니다."); return data; })
      .then(data => { if (!controller.signal.aborted) setCustomPrompt(data.prompt); })
      .catch(error => { if (!controller.signal.aborted) setCustomError(error.message || "내 프롬프트를 불러오지 못했습니다."); });
    return () => controller.abort();
  }, [customPromptId]);

  useEffect(() => {
    const initialPromptParam = searchParams.get("prompt");
    if (initialPromptParam) {
      setStep2Prompt(initialPromptParam);
      const step2Element = document.getElementById("step2-container");
      if (step2Element) {
        step2Element.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [searchParams]);

  const handleApplyPrompt = (prompt: string, negativePrompt?: string) => {
    setStep2Prompt(prompt);
    setStep2NegativePrompt(negativePrompt ?? "");

    const step2Element = document.getElementById("step2-container");
    if (step2Element) {
      step2Element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Title Hero with Top-Right Logo */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            🎨 이미지 생성 작업실
          </h1>
          <p className="text-sm text-zinc-300">
            OpenAI GPT Image, Google Gemini(Nano Banana), FLUX.2, Z-Image 등 다양한 AI 엔진으로 1장~10장 연속 생성과 세부 옵션 맞춤 설정을 사용해보세요.
          </p>
        </div>

        {/* Top-Right Logo Component */}
        <PageHeaderLogo />
      </div>

      {/* Step 1: AI Prompt Enhancer */}
      {customError && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{customError}</p>}
      {customPrompt && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">{customPrompt.label}을 불러왔습니다. 내용을 확인한 뒤 그대로 사용하거나 AI로 추가 보강할 수 있습니다.</p>}
      <Step1PromptEnhancer key={customPromptId || "default"} onApplyPrompt={handleApplyPrompt} initialCustomPrompt={customPrompt} />

      {/* Step 2: Multi-Platform Generator */}
      {promptSource && (
        <p role="status" data-prompt-source className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 text-sm text-sky-200">
          「{promptSource.name}」에서 보낸 프롬프트를 2단계 칸에 채웠습니다. 엔진·모델을 고르고 확인한 뒤 생성해 주세요.{" "}
          <a href={promptSource.url} data-prompt-back className="font-bold underline underline-offset-2 whitespace-nowrap">↩ {promptSource.name} 화면으로 돌아가기</a>
        </p>
      )}
      <Step2PlatformGenerator
        initialPrompt={step2Prompt}
        initialNegativePrompt={step2NegativePrompt}
        ideaSource={promptSource?.key}
      />

      {/* Manual & Guide Modal Box at Bottom */}
      <GuideModal />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="text-zinc-400 p-8">로딩 중...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
