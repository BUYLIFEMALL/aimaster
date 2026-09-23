"use client";

import { useState } from "react";
import { Step1PromptEnhancer } from "@/components/Step1PromptEnhancer";
import { Step2PlatformGenerator } from "@/components/Step2PlatformGenerator";
import { GuideModal } from "@/components/GuideModal";

export default function DashboardPage() {
  const [step2Prompt, setStep2Prompt] = useState("");
  const [step2NegativePrompt, setStep2NegativePrompt] = useState("");

  const handleApplyPrompt = (prompt: string, negativePrompt?: string) => {
    setStep2Prompt(prompt);
    if (negativePrompt) setStep2NegativePrompt(negativePrompt);

    // Smooth scroll to Step 2 section
    const step2Element = document.getElementById("step2-container");
    if (step2Element) {
      step2Element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Title Hero */}
      <div className="space-y-1">
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
          🎨 AI 이미지 스튜디오 (Image Studio)
        </h1>
        <p className="text-sm text-zinc-300">
          OpenAI, FLUX, Google Imagen 3, Stability AI 등 다양한 생성 플랫폼을 하나의 올인원 작업실에서 사용해보세요.
        </p>
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
