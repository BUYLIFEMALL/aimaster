"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PROVIDERS_REGISTRY } from "@/lib/providers/registry";
import { OptionFormRenderer } from "./OptionFormRenderer";
import { ImageResultViewer } from "./ImageResultViewer";
import { Layers, Sliders, Image as ImageIcon, AlertCircle, RefreshCw, Key, RotateCcw } from "lucide-react";

interface Step2PlatformGeneratorProps {
  initialPrompt?: string;
  initialNegativePrompt?: string;
}

export function Step2PlatformGenerator({ initialPrompt = "", initialNegativePrompt = "" }: Step2PlatformGeneratorProps) {
  const [selectedProviderId, setSelectedProviderId] = useState<string>("openai");
  const [selectedModelId, setSelectedModelId] = useState<string>("gpt-image-2");
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

  const [highlightFlash, setHighlightFlash] = useState(false);

  useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
      setHighlightFlash(true);
      const timer = setTimeout(() => setHighlightFlash(false), 3500);
      return () => clearTimeout(timer);
    }
    if (initialNegativePrompt) setNegativePrompt(initialNegativePrompt);
  }, [initialPrompt, initialNegativePrompt]);

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

  const handleResetInputs = () => {
    setPrompt("");
    setNegativePrompt("");
    if (currentModel) {
      const defaults: Record<string, any> = {};
      currentModel.options.forEach((opt) => {
        defaults[opt.id] = opt.default;
      });
      setOptionValues(defaults);
    }
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
    <div id="step2-container" className="space-y-6 scroll-mt-20">
      <div className={`rounded-2xl border bg-zinc-900/80 p-6 sm:p-7 backdrop-blur-xl space-y-6 shadow-xl transition-all duration-500 ${
        highlightFlash ? "border-amber-400 ring-4 ring-amber-400/20" : "border-zinc-800"
      }`}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 px-3.5 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 shrink-0 whitespace-nowrap">
            <span className="text-sm font-bold">Step 2</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-amber-400" />
              플랫폼 & 모델 & 세부 옵션 선택 생성
            </h2>
            <p className="text-sm text-zinc-300 mt-0.5">
              원하는 이미지 생성 플랫폼과 모델을 선택하고 비율, 화질 등 세부 옵션을 맞춤 설정하여 이미지를 생성합니다.
            </p>
          </div>
        </div>

        {/* Platform Cards */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-zinc-200">이미지 생성 플랫폼 선택</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            {PROVIDERS_REGISTRY.map((prov) => {
              const isSelected = prov.id === selectedProviderId;
              const isKeyRegistered = registeredKeys.includes(prov.apiKeyProvider);

              return (
                <button
                  key={prov.id}
                  type="button"
                  onClick={() => handleProviderChange(prov.id)}
                  className={`relative flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10"
                      : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1.5">
                    <span className="text-sm font-bold text-white">{prov.name}</span>
                    {loadingKeys ? (
                      <span className="h-2.5 w-2.5 rounded-full bg-zinc-700 animate-pulse" />
                    ) : isKeyRegistered ? (
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/30">
                        연동됨
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                        키 미등록
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-300 line-clamp-2 leading-normal">{prov.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {!loadingKeys && !hasKey && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 text-sm text-amber-300">
            <div className="flex items-center gap-2.5">
              <Key className="h-5 w-5 shrink-0 text-amber-400" />
              <span>
                <strong>[{currentProvider.name}]</strong> API 키가 아직 등록되지 않았습니다. API 키를 등록하셔야 생성이 가능합니다.
              </span>
            </div>
            <Link
              href="/settings"
              className="flex items-center gap-1.5 font-bold text-amber-400 hover:underline shrink-0 bg-amber-500/20 px-4 py-2 rounded-lg border border-amber-500/30 text-sm"
            >
              API 키 등록하러 가기 &rarr;
            </Link>
          </div>
        )}

        {/* Model Selector & Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-200">생성 모델 선택</label>
              <select
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm font-medium text-zinc-100 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                {currentProvider.models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.description}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-200">최종 프롬프트 (Prompt)</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Step 1에서 최적화된 영문 프롬프트가 이 곳에 자동으로 입력되거나, 직접 입력할 수 있습니다."
                rows={4}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none font-mono leading-relaxed"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-200">부정 프롬프트 (Negative Prompt - 선택사항)</label>
              <input
                type="text"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="blurry, low quality, distorted, extra limbs, watermark"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-mono"
              />
            </div>
          </div>

          {/* Dynamic Options */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 text-sm font-bold text-white">
              <Sliders className="h-5 w-5 text-amber-400" />
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
          <div className="flex items-center gap-2.5 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3.5 text-sm text-red-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-zinc-800">
          {(() => {
            const hasResetContent = Boolean(prompt.trim() || negativePrompt.trim() || generatedResult);
            return (
              <button
                type="button"
                disabled={!hasResetContent}
                onClick={handleResetInputs}
                className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 px-8 py-3.5 text-sm font-bold border border-amber-400/50 shadow-lg shadow-amber-500/20 transition-all active:scale-95 min-w-[180px] disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500 disabled:border-zinc-700 disabled:shadow-none disabled:active:scale-100"
                title={hasResetContent ? "입력된 프롬프트와 옵션을 초기화합니다" : "초기화할 내용이 없습니다"}
              >
                <RotateCcw className="h-4 w-4" />
                <span>입력창 초기화 (Reset)</span>
              </button>
            );
          })()}

          {(() => {
            const isReadyToGenerate = Boolean(prompt.trim() && hasKey && !generating);
            return (
              <button
                onClick={handleGenerate}
                disabled={!isReadyToGenerate}
                className={`flex items-center gap-3 rounded-xl px-9 py-4 text-base font-black transition-all transform duration-300 cursor-pointer ${
                  isReadyToGenerate
                    ? "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-zinc-950 hover:from-amber-300 hover:to-yellow-300 shadow-xl shadow-amber-500/40 ring-4 ring-amber-400/50 hover:ring-amber-300 active:scale-95 hover:scale-[1.02]"
                    : "bg-zinc-800 text-zinc-500 border border-zinc-700 opacity-50 cursor-not-allowed shadow-none"
                } ${highlightFlash ? "ring-8 ring-yellow-300 shadow-2xl shadow-amber-400 animate-pulse scale-[1.03]" : ""}`}
              >
                {generating ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>AI 이미지 생성 중... (10~20초 소요)</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-6 w-6 stroke-[2.5]" />
                    <span>✨ 이미지 생성 시작하기</span>
                  </>
                )}
              </button>
            );
          })()}
        </div>
      </div>

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
