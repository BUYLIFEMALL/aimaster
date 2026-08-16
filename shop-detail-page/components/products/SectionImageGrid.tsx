"use client";

import { useRef, useState } from "react";
import {
  generateSectionImageAction,
  addCustomSectionImageAction,
  selectSectionImageAction,
  setProductStatusAction,
} from "@/lib/actions/images";
import { uploadCustomSectionImage } from "@/lib/uploadImageClient";
import { ApiKeyRequiredModal } from "@/components/settings/ApiKeyRequiredModal";
import { IMAGE_MODEL_OPTIONS, DEFAULT_IMAGE_MODEL, IMAGE_MODEL_COST_USD, type ImageModelKey } from "@/lib/ai/imageModels";

interface TemplateInfo {
  id: string;
  section_key: string;
  section_name: string;
  section_order: number;
}

interface SectionState {
  status: "idle" | "generating" | "uploading" | "done" | "error";
  url?: string;
  history: string[];
  error?: string;
}

export function SectionImageGrid({
  productId,
  language,
  templates,
  initialImages,
  initialModel,
}: {
  productId: string;
  language: string;
  templates: TemplateInfo[];
  initialImages: Record<string, { url: string; history: string[] }>;
  // /products/new에서 상품 저장 시 미리 선택해둔 모델(shop_products.default_image_model).
  initialModel?: ImageModelKey;
}) {
  const [states, setStates] = useState<Record<string, SectionState>>(() => {
    const init: Record<string, SectionState> = {};
    for (const t of templates) {
      const existing = initialImages[t.section_key];
      init[t.section_key] = existing
        ? { status: "done", url: existing.url, history: existing.history }
        : { status: "idle", history: [] };
    }
    return init;
  });
  const [model, setModel] = useState<ImageModelKey>(initialModel ?? DEFAULT_IMAGE_MODEL);
  const [isRunning, setIsRunning] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const uploadTargetRef = useRef<TemplateInfo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function generateOne(template: TemplateInfo) {
    setStates((prev) => ({
      ...prev,
      [template.section_key]: { ...prev[template.section_key], status: "generating" },
    }));
    const result = await generateSectionImageAction(productId, template.id, model);
    if (result.needsApiKey) {
      setShowApiKeyModal(true);
      setStates((prev) => ({
        ...prev,
        [template.section_key]: { ...prev[template.section_key], status: "idle" },
      }));
      return false;
    }
    if (result.error || !result.url) {
      setStates((prev) => ({
        ...prev,
        [template.section_key]: { ...prev[template.section_key], status: "error", error: result.error },
      }));
      return false;
    }
    setStates((prev) => ({
      ...prev,
      [template.section_key]: {
        status: "done",
        url: result.url,
        history: [...prev[template.section_key].history, result.url!],
      },
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

  async function handleSelect(sectionKey: string, url: string) {
    setStates((prev) => ({ ...prev, [sectionKey]: { ...prev[sectionKey], url } }));
    const result = await selectSectionImageAction(productId, sectionKey, language, url);
    if (result.error) {
      setStates((prev) => ({ ...prev, [sectionKey]: { ...prev[sectionKey], error: result.error } }));
    }
  }

  function triggerCustomUpload(template: TemplateInfo) {
    uploadTargetRef.current = template;
    fileInputRef.current?.click();
  }

  async function handleCustomFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const template = uploadTargetRef.current;
    e.target.value = "";
    if (!file || !template) return;

    setStates((prev) => ({
      ...prev,
      [template.section_key]: { ...prev[template.section_key], status: "uploading" },
    }));

    const uploadResult = await uploadCustomSectionImage(productId, template.section_key, file);
    if (uploadResult.error || !uploadResult.url) {
      setStates((prev) => ({
        ...prev,
        [template.section_key]: { ...prev[template.section_key], status: "error", error: uploadResult.error },
      }));
      return;
    }

    const result = await addCustomSectionImageAction(productId, template.id, uploadResult.url);
    if (result.error) {
      setStates((prev) => ({
        ...prev,
        [template.section_key]: { ...prev[template.section_key], status: "error", error: result.error },
      }));
      return;
    }

    setStates((prev) => ({
      ...prev,
      [template.section_key]: {
        status: "done",
        url: uploadResult.url,
        history: [...prev[template.section_key].history, uploadResult.url!],
      },
    }));
  }

  const doneCount = Object.values(states).filter((s) => s.status === "done").length;
  const hasAnyImage = doneCount > 0;

  return (
    <div className="space-y-4">
      {showApiKeyModal && (
        <ApiKeyRequiredModal
          missingLabels={["Google (Gemini / 나노바나나)"]}
          onClose={() => setShowApiKeyModal(false)}
        />
      )}

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 cursor-zoom-out"
          onClick={() => setLightboxUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="원본 이미지"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleCustomFileChange}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          {doneCount} / {templates.length} 섹션 생성 완료
        </p>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            {IMAGE_MODEL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setModel(opt.value)}
                disabled={isRunning}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  model === opt.value
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
                title={opt.hint}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleGenerateAll}
            disabled={isRunning}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-60 text-white font-bold py-2 px-5 rounded-xl transition-all text-sm whitespace-nowrap"
          >
            {isRunning ? "생성 중..." : "🎨 전체 이미지 생성"}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600">
        <p className="font-semibold text-gray-700 mb-1.5">💰 예상 비용 (2K 해상도 · Google 공식 요금 기준)</p>
        <div className="space-y-1">
          {IMAGE_MODEL_OPTIONS.map((opt) => {
            const total = (IMAGE_MODEL_COST_USD[opt.value] * templates.length).toFixed(2);
            const isSelected = model === opt.value;
            return (
              <p key={opt.value} className={isSelected ? "font-semibold text-gray-900" : ""}>
                {isSelected ? "▶ " : "· "}
                {opt.label}: 장당 ${IMAGE_MODEL_COST_USD[opt.value].toFixed(3)} · {templates.length}장 전체 생성 시 약 ${total}
              </p>
            );
          })}
        </div>
        <p className="mt-1.5 text-gray-400">* 실제 청구 금액은 사용량과 환율에 따라 달라질 수 있는 참고용 추정치입니다.</p>

        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="font-semibold text-gray-700 mb-1.5">💡 비용 절약 팁</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>먼저 Nanobanana2(가성비)로 전체 생성해보고, 마음에 드는 섹션만 Pro로 재생성하세요.</li>
            <li>&quot;전체 이미지 생성&quot; 대신, 마음에 안 드는 섹션만 개별 &quot;재생성&quot; 버튼으로 다시 만들면 비용이 줄어요.</li>
            <li>이미 보유한 상품 사진이 있다면 각 섹션의 &quot;+&quot; 버튼으로 직접 업로드하세요 — AI 생성 비용이 들지 않아요.</li>
            <li>&quot;5. 이미지 생성 시 추가로 반영할 내용&quot;에 원하는 스타일을 미리 적어두면 재생성 횟수를 줄일 수 있어요.</li>
          </ul>
        </div>
      </div>

      {/* 실제 병합 결과와 동일하게 세로 한 줄로 나열 */}
      <div className="flex flex-col gap-3 max-w-md mx-auto">
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
                  <img
                    src={state.url}
                    alt={t.section_name}
                    className="w-full h-full object-cover cursor-zoom-in"
                    onClick={() => setLightboxUrl(state.url!)}
                  />
                )}
                {state.status === "generating" && (
                  <span className="text-xs text-gray-400 animate-pulse">생성 중...</span>
                )}
                {state.status === "uploading" && (
                  <span className="text-xs text-gray-400 animate-pulse">업로드 중...</span>
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

              {/* 재생성 이력 + 직접 업로드 - 원하는 버전을 골라 최종 이미지로 선택 */}
              <div className="flex gap-1.5 overflow-x-auto px-2 pb-2">
                {state.history.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => handleSelect(t.section_key, url)}
                    className={`shrink-0 w-12 h-12 rounded overflow-hidden border-2 ${
                      state.url === url ? "border-blue-500" : "border-transparent opacity-70"
                    }`}
                    title={`버전 ${i + 1}${state.url === url ? " (선택됨)" : ""}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`버전 ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => triggerCustomUpload(t)}
                  className="shrink-0 w-12 h-12 rounded border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-gray-50 flex items-center justify-center text-gray-400 text-lg transition-colors"
                  title="직접 보유한 이미지 추가"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {hasAnyImage && (
        <a
          href={`/api/products/${productId}/export`}
          className="block w-full text-center text-sm font-semibold text-white bg-gray-900 hover:bg-black px-4 py-3 rounded-xl transition-all"
        >
          📥 선택한 이미지로 최종 상세페이지 병합 다운로드
        </a>
      )}
    </div>
  );
}
