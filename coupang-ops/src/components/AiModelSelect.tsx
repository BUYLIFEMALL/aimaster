"use client";

import { useEffect, useState } from "react";
import { loadPrefsAction, savePrefsAction } from "@/lib/actions/prefs";
import { AI_MODEL_OPTIONS, AI_PROVIDERS, DEFAULT_AI_MODEL, DEFAULT_AI_MODELS, PROVIDER_LABEL, providerOfModel, type AIModelProvider } from "@/lib/ai/models";
import { openAIModelBadge, openAIModelNotice } from "@/lib/ai/openaiRequestParams";

const KEY = "coupang-ops:ai-model";
const field = "rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[13px] focus:border-blue-500 focus:outline-none";

// 플랫폼별 모델은 회원 설정(서버)에 저장해 PC가 바뀌어도 유지한다. 마지막에 쓴 플랫폼은 브라우저에 기억한다
type AiModels = Partial<Record<AIModelProvider, string>>;
let cached: Promise<AiModels> | null = null;
export const loadAiModels = () => (cached ??= loadPrefsAction().then((p) => p.aiModels).catch(() => ({} as AiModels)));
export async function rememberAiModel(model: string): Promise<boolean> {
  const provider = providerOfModel(model);
  if (!provider) return false;
  const aiModels = { ...(await loadAiModels()), [provider]: model };
  cached = Promise.resolve(aiModels);
  const r = await savePrefsAction({ aiModels }).catch(() => ({ ok: false as const }));
  return r.ok;
}

/** 고른 모델을 문의 초안·상품 추천에서 함께 쓴다 */
export function useAiModel() {
  const [model, setModelState] = useState(DEFAULT_AI_MODEL);
  useEffect(() => {
    let saved = "";
    try {
      saved = localStorage.getItem(KEY) ?? "";
    } catch {}
    const provider = providerOfModel(saved) ?? "anthropic";
    if (providerOfModel(saved)) setModelState(saved);
    let live = true;
    void loadAiModels().then((m) => {
      if (live && m[provider]) setModelState(m[provider]!);
    });
    return () => {
      live = false;
    };
  }, []);
  const setModel = (next: string) => {
    setModelState(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    void rememberAiModel(next);
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
      <select aria-label="AI 플랫폼" value={provider} onChange={(e) => {
        const p = e.target.value as AIModelProvider;
        void loadAiModels().then((m) => onChange(m[p] ?? DEFAULT_AI_MODELS[p]));
      }} className={field}>
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
