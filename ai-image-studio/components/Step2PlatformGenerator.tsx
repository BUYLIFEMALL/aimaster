"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PROVIDERS_REGISTRY } from "@/lib/providers/registry";
import { OptionFormRenderer } from "./OptionFormRenderer";
import { ImageResultViewer } from "./ImageResultViewer";
import { Sparkles, Layers, Sliders, Image as ImageIcon, AlertCircle, RefreshCw, Key } from "lucide-react";

interface Step2PlatformGeneratorProps {
  initialPrompt?: string;
  initialNegativePrompt?: string;
}

export function Step2PlatformGenerator({ initialPrompt = "", initialNegativePrompt = "" }: Step2PlatformGeneratorProps) {
  const [selectedProviderId, setSelectedProviderId] = useState<string>("openai");
  const [selectedModelId, setSelectedModelId] = useState<string>("dall-e-3");
  const [prompt, setPrompt] = useState<string>(initialPrompt);
  const [negativePrompt, setNegativePrompt] = useState<string>(initialNegativePrompt);

  const [optionValues, setOptionValues] = useState<Record<string, any>>({});
  const [registeredKeys, setRegisteredKeys] = useState<string[]>([]);
  const [loadingKeys, setLoadingKeys] = useState<boolean>(true);

  const [generating, setGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [generatedResult, setGeneratedResult] = useState<{
    imageUrl: string;
    revisedPrompt?: string;
    metadata?: Record<string, any>;
  } | null>(null);

  // Sync initialPrompt
  useEffect(() => {
    if (initialPrompt) setPrompt(initialPrompt);
    if (initialNegativePrompt) setNegativePrompt(initialNegativePrompt);
  }, [initialPrompt, initialNegativePrompt]);

  // Fetch registered user API keys
  useEffect(() => {
    fetch("/api/user-keys")
      .then((res) => res.json())
      .then((data) => {
        if (data.registeredProviders) {
          setRegisteredKeys(data.registeredProviders);
        }
      })
      .catch((err) => console.error("Failed to load user keys", err))
      .finally(() => setLoadingKeys(false));
  }, []);

  const currentProvider = PROVIDERS_REGISTRY.find((p) => p.id === selectedProviderId) || PROVIDERS_REGISTRY[0];
  const currentModel = currentProvider.models.find((m) => m.id === selectedModelId) || currentProvider.models[0];

  const hasKey = registeredKeys.includes(currentProvider.apiKeyProvider);

  // When model changes, set default option values
  useEffect(() => {
    if (currentModel) {
      const defaults: Record<string, any> = {};
      currentModel.options.forEach((opt) => {
        defaults[opt.id] = opt.default;
      });
      setOptionValues(defaults);
    }
  }, [selectedProviderId, selectedModelId]);

  const handleProviderChange = (providerId: string) => {
    setSelectedProviderId(providerId);
    const prov = PROVIDERS_REGISTRY.find((p) => p.id === providerId);
    if (prov && prov.models.length > 0) {
      setSelectedModelId(prov.models[0].id);
    }
  };

  const handleOptionChange = (key: string, value: any) => {
    setOptionValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("생성할 이미지 프롬프트를 입력해주세요.");
      return;
    }
    setGenerating(true);
    setError(null);
    setGeneratedResult(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProviderId,
          model: selectedModelId,
          prompt,
          negativePrompt,
          options: optionValues
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "이미지 생성 요청에 실패했습니다.");
      }

      setGeneratedResult({
        imageUrl: data.imageUrl,
        revisedPrompt: data.revisedPrompt,
        metadata: data.metadata
      });
    } catch (err: any) {
      setError(err.message || "오류가 발생했습니다.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-xl space-y-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="text-xs font-bold">Step 2</span>
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-amber-400" />
              플랫폼 & 모델 & 세부 옵션 선택 생성
            </h2>
            <p className="text-xs text-zinc-400">
              원하는 이미지 생성 플랫폼과 모델을 선택하고 비율, 화질 등 세부 옵션을 맞춤 설정하여 이미지를 생성합니다.
            </p>
          </div>
        </div>

        {/* Platform Selection Cards */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300">이미지 생성 플랫폼 선택</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PROVIDERS_REGISTRY.map((prov) => {
              const isSelected = prov.id === selectedProviderId;
              const isKeyRegistered = registeredKeys.includes(prov.apiKeyProvider);

              return (
                <button
                  key={prov.id}
                  type="button"
                  onClick={() => handleProviderChange(prov.id)}
                  className={`relative flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10"
                      : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-bold text-white">{prov.name}</span>
                    {loadingKeys ? (
                      <span className="h-2 w-2 rounded-full bg-zinc-700 animate-pulse" />
                    ) : isKeyRegistered ? (
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">
                        연동됨
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                        키 미등록
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 line-clamp-2">{prov.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {!loadingKeys && !hasKey && (
          <div className="flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 shrink-0" />
              <span>
                <strong>[{currentProvider.name}]</strong> API 키가 아직 등록되지 않았습니다. API 키를 등록하셔야 생성이 가능합니다.
              </span>
            </div>
            <Link
              href="/settings"
              className="flex items-center gap-1 font-bold text-amber-400 hover:underline shrink-0 bg-amber-500/20 px-3 py-1 rounded-lg border border-amber-500/30"
            >
              API 키 등록하러 가기 &rarr;
            </Link>
          </div>
        )}

        {/* Model Selector & Option Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">생성 모델 선택</label>
              <select
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                {currentProvider.models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.description}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">최종 프롬프트 (Prompt)</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Step 1에서 최적화된 영문 프롬프트가 이 곳에 자동으로 입력되거나, 직접 입력할 수 있습니다."
                rows={4}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">부정 프롬프트 (Negative Prompt - 선택사항)</label>
              <input
                type="text"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="blurry, low quality, distorted, extra limbs, watermark"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
              />
            </div>
          </div>

          {/* Dynamic Option Schema Form */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 space-y-3">
            <div className="flex items-center gap-1.5 border-b border-zinc-800 pb-2 text-xs font-bold text-zinc-200">
              <Sliders className="h-4 w-4 text-amber-400" />
              <span>{currentModel.name} 모델 세부 옵션</span>
            </div>
            <OptionFormRenderer
              options={currentModel.options}
              values={optionValues}
              onChange={handleOptionChange}
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end pt-2">
          <button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim() || !hasKey}
            className="flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 px-7 py-3 text-xs font-bold text-zinc-950 hover:from-amber-400 hover:to-yellow-300 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/20"
          >
            {generating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                AI 이미지 생성 중... (10~20초 소요)
              </>
            ) : (
              <>
                <ImageIcon className="h-4 w-4 stroke-[2.5]" />
                이미지 생성 시작하기
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generated Result Viewer */}
      {generatedResult && (
        <ImageResultViewer
          imageUrl={generatedResult.imageUrl}
          revisedPrompt={generatedResult.revisedPrompt}
          providerName={currentProvider.name}
          modelName={currentModel.name}
          originalPrompt={prompt}
        />
      )}
    </div>
  );
}
