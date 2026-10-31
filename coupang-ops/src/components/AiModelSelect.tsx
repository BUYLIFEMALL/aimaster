"use client";

import { useEffect, useState } from "react";
import { AI_MODEL_OPTIONS, AI_PROVIDERS, DEFAULT_AI_MODEL, DEFAULT_AI_MODELS, PROVIDER_LABEL, providerOfModel, type AIModelProvider } from "@/lib/ai/models";
import { openAIModelBadge, openAIModelNotice } from "@/lib/ai/openaiRequestParams";

const KEY = "coupang-ops:ai-model";
const field = "rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[13px] focus:border-blue-500 focus:outline-none";

/** 고른 모델을 브라우저에 기억해 문의 초안·상품 추천에서 함께 쓴다 */
export function useAiModel() {
  const [model, setModelState] = useState(DEFAULT_AI_MODEL);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved && providerOfModel(saved)) setModelState(saved);
    } catch {}
  }, []);
  const setModel = (next: string) => {
    setModelState(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {}
  };
  return [model, setModel] as const;
}

export function AiModelSelect({ model, onChange }: { model: string; onChange: (model: string) => void }) {
  const provider = providerOfModel(model) ?? "anthropic";
  const badge = openAIModelBadge(model);
  const notice = openAIModelNotice(model);
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-700">
      <span>AI 선택</span>
      <select aria-label="AI 플랫폼" value={provider} onChange={(e) => onChange(DEFAULT_AI_MODELS[e.target.value as AIModelProvider])} className={field}>
        {AI_PROVIDERS.map((p) => <option key={p} value={p}>{PROVIDER_LABEL[p]}</option>)}
      </select>
      <select aria-label="AI 모델" value={model} onChange={(e) => onChange(e.target.value)} className={`${field} min-w-0 max-w-full`}>
        {AI_MODEL_OPTIONS.filter((o) => o.provider === provider).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {badge && <span className="font-normal text-slate-500">{badge}</span>}
      {notice && <span className="font-normal text-amber-800">{notice}</span>}
    </div>
  );
}
