"use client";

import { useState } from "react";
import { generateSectionImageAction, setProductStatusAction } from "@/lib/actions/images";
import { ApiKeyRequiredModal } from "@/components/settings/ApiKeyRequiredModal";

interface TemplateInfo {
  id: string;
  section_key: string;
  section_name: string;
  section_order: number;
}

interface SectionState {
  status: "idle" | "generating" | "done" | "error";
  url?: string;
  error?: string;
}

export function SectionImageGrid({
  productId,
  templates,
  initialImages,
}: {
  productId: string;
  templates: TemplateInfo[];
  initialImages: Record<string, string>;
}) {
  const [states, setStates] = useState<Record<string, SectionState>>(() => {
    const init: Record<string, SectionState> = {};
    for (const t of templates) {
      init[t.section_key] = initialImages[t.section_key]
        ? { status: "done", url: initialImages[t.section_key] }
        : { status: "idle" };
    }
    return init;
  });
  const [isRunning, setIsRunning] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  async function generateOne(template: TemplateInfo) {
    setStates((prev) => ({ ...prev, [template.section_key]: { status: "generating" } }));
    const result = await generateSectionImageAction(productId, template.id);
    if (result.needsApiKey) {
      setShowApiKeyModal(true);
      setStates((prev) => ({ ...prev, [template.section_key]: { status: "idle" } }));
      return false;
    }
    if (result.error) {
      setStates((prev) => ({
        ...prev,
        [template.section_key]: { status: "error", error: result.error },
      }));
      return false;
    }
    setStates((prev) => ({
      ...prev,
      [template.section_key]: { status: "done", url: result.url },
    }));
    return true;
  }

  async function handleGenerateAll() {
    setIsRunning(true);
    await setProductStatusAction(productId, "generating");
    try {
      for (const template of templates) {
        const ok = await generateOne(template);
        if (!ok) break;
      }
    } finally {
      await setProductStatusAction(productId, "completed");
      setIsRunning(false);
    }
  }

  const doneCount = Object.values(states).filter((s) => s.status === "done").length;

  return (
    <div className="space-y-4">
      {showApiKeyModal && (
        <ApiKeyRequiredModal
          missingLabels={["Google (Gemini / 나노바나나)"]}
          onClose={() => setShowApiKeyModal(false)}
        />
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {doneCount} / {templates.length} 섹션 생성 완료
        </p>
        <button
          onClick={handleGenerateAll}
          disabled={isRunning}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-60 text-white font-bold py-2 px-5 rounded-xl transition-all text-sm"
        >
          {isRunning ? "생성 중..." : "🎨 전체 이미지 생성"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {templates.map((t) => {
          const state = states[t.section_key];
          return (
            <div
              key={t.section_key}
              className="border border-gray-200 rounded-lg overflow-hidden bg-white"
            >
              <div className="aspect-[4/5] bg-gray-50 flex items-center justify-center relative">
                {state.status === "done" && state.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={state.url} alt={t.section_name} className="w-full h-full object-cover" />
                )}
                {state.status === "generating" && (
                  <span className="text-xs text-gray-400 animate-pulse">생성 중...</span>
                )}
                {state.status === "idle" && <span className="text-xs text-gray-300">대기중</span>}
                {state.status === "error" && (
                  <span className="text-xs text-red-500 px-2 text-center">{state.error}</span>
                )}
              </div>
              <div className="flex items-center justify-between px-2 py-1">
                <p className="text-xs text-gray-600 truncate">
                  {t.section_order}. {t.section_name}
                </p>
                {state.status === "done" && (
                  <button
                    onClick={() => generateOne(t)}
                    className="text-[10px] text-blue-600 hover:underline shrink-0"
                  >
                    재생성
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
