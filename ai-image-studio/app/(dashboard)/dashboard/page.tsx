"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Step1PromptEnhancer } from "@/components/Step1PromptEnhancer";
import { Step2PlatformGenerator } from "@/components/Step2PlatformGenerator";
import { GuideModal } from "@/components/GuideModal";
import { PageHeaderLogo } from "@/components/PageHeaderLogo";

function DashboardContent() {
  const searchParams = useSearchParams();
  const [step2Prompt, setStep2Prompt] = useState("");
  const [step2NegativePrompt, setStep2NegativePrompt] = useState("");

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
    if (negativePrompt) setStep2NegativePrompt(negativePrompt);

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
            OpenAI, FLUX, Google Imagen 3, Stability AI 등 다양한 생성 플랫폼을 하나의 올인원 작업실에서 사용해보세요.
          </p>
        </div>

        {/* Top-Right Logo Component */}
        <PageHeaderLogo />
      </div>

      {/* Step 1: AI Prompt Enhancer */}
      <Step1PromptEnhancer onApplyPrompt={handleApplyPrompt} />

      {/* Step 2: Multi-Platform Generator */}
      <Step2PlatformGenerator
        initialPrompt={step2Prompt}
        initialNegativePrompt={step2NegativePrompt}
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
