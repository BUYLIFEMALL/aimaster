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
import { imageSrc } from "@/lib/imageSrc";
import { instaPostUrl, threadsPostUrl } from "@/lib/threadsLink";

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
  threadsDraft = "",
}: {
  productId: string;
  language: string;
  templates: TemplateInfo[];
  initialImages: Record<string, { url: string; history: string[] }>;
  // /products/new에서 상품 저장 시 미리 선택해둔 모델(shop_products.default_image_model).
  initialModel?: ImageModelKey;
  // v1.19(추가): 쓰레드 쇼핑제휴로 넘길 본문 초안(상품명·핵심 특징, 할인가가 있을 때만 가격).
  threadsDraft?: string;
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
  const [showPhonePreview, setShowPhonePreview] = useState(false);

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
            src={imageSrc(lightboxUrl)}
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

      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/90">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold text-slate-700">섹션 생성 진행률</span>
            <span className="text-xs font-black text-blue-600 bg-blue-100/60 px-2 py-0.5 rounded-full">
              {doneCount} / {templates.length} 완료 ({Math.round((doneCount / (templates.length || 1)) * 100)}%)
            </span>
          </div>
          <div className="w-48 sm:w-64 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300"
              style={{ width: `${Math.round((doneCount / (templates.length || 1)) * 100)}%` }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex rounded-xl border border-slate-200 overflow-hidden text-xs bg-white p-0.5 shadow-2xs">
            {IMAGE_MODEL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setModel(opt.value)}
                disabled={isRunning}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  model === opt.value
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
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
            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold py-2 px-5 rounded-xl shadow-md shadow-blue-500/25 transition-all text-xs sm:text-sm whitespace-nowrap"
          >
            {isRunning ? (
              <>
                <span className="inline-block animate-spin">⏳</span>
                <span>전체 섹션 생성 중...</span>
              </>
            ) : (
              <>
                <span>🎨</span>
                <span>{templates.length}개 섹션 전체 자동 생성</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/40 px-4 py-3 text-xs text-slate-600">
        <p className="font-bold text-slate-800 mb-1.5">💰 예상 비용 (2K 해상도 · Google 공식 요금 기준)</p>
        <div className="space-y-0.5">
          {IMAGE_MODEL_OPTIONS.map((opt) => {
            const total = (IMAGE_MODEL_COST_USD[opt.value] * templates.length).toFixed(2);
            const isSelected = model === opt.value;
            return (
              <p key={opt.value} className={isSelected ? "font-bold text-blue-900" : "text-slate-600"}>
                {isSelected ? "▶ " : "· "}
                {opt.label}: 장당 ${IMAGE_MODEL_COST_USD[opt.value].toFixed(3)} · {templates.length}장 전체 생성 시 약 ${total}
              </p>
            );
          })}
        </div>
        <p className="mt-1 text-[11px] text-slate-400">* 실제 청구 금액은 사용량과 환율에 따라 달라질 수 있는 참고용 추정치입니다.</p>

        <div className="mt-2.5 pt-2.5 border-t border-blue-200/60">
          <p className="font-bold text-slate-800 mb-1">💡 비용 절약 팁</p>
          <ul className="text-[11px] text-slate-600 space-y-0.5 list-disc list-inside">
            <li>마음에 안 드는 섹션만 개별 &quot;재생성&quot; 버튼으로 다시 만들면 불필요한 비용을 절약할 수 있습니다.</li>
            <li>이미 보유한 고화질 상품 사진이 있다면 각 섹션의 &quot;+&quot; 버튼으로 직접 업로드하세요.</li>
          </ul>
        </div>
      </div>

      {/* v1.16(12단에서 옮김): 실제 쇼핑 앱처럼 휴대폰 화면에서 스크롤해 보는 미리보기 */}
      {hasAnyImage && (
        <div className="flex justify-center mt-4">
          <button
            type="button"
            onClick={() => setShowPhonePreview((v) => !v)}
            className="text-xs font-bold px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700"
          >
            {showPhonePreview ? "✕ 모바일 미리보기 닫기" : "📱 모바일 미리보기"}
          </button>
        </div>
      )}
      {showPhonePreview && (
        <div className="flex justify-center">
          <div className="w-[300px] sm:w-[360px] max-w-full rounded-[2.5rem] border-[10px] border-slate-900 bg-slate-900 shadow-xl overflow-hidden">
            <div className="h-5 flex justify-center items-center">
              <div className="w-16 h-1.5 rounded-full bg-slate-700" />
            </div>
            <div className="h-[560px] sm:h-[680px] overflow-y-auto bg-white rounded-b-[1.8rem]">
              {templates.map((t) =>
                states[t.section_key]?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={t.section_key} src={imageSrc(states[t.section_key].url)} alt={t.section_name} className="block w-full" />
                ) : null,
              )}
            </div>
          </div>
        </div>
      )}

      {/* 섹션 세로 한 줄 나열 (실제 상세페이지 레이아웃과 동일) */}
      <div className="flex flex-col gap-4 max-w-lg mx-auto mt-6">
        {templates.map((t) => {
          const state = states[t.section_key];
          const threadsHref = state.status === "done" && state.url ? threadsPostUrl(state.url, threadsDraft) : null;
          const instaHref = state.status === "done" && state.url ? instaPostUrl(state.url, threadsDraft) : null;
          return (
            <div
              key={t.section_key}
              className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all"
            >
              {/* 섹션 카드 상단 헤더 */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/80 border-b border-slate-100">
                <div className="flex items-center gap-2 truncate pr-2">
                  <span className="text-[11px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60 font-mono">
                    #{t.section_order.toString().padStart(2, "0")}
                  </span>
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {t.section_name}
                  </p>
                </div>
                {state.status === "done" && (
                  <button
                    onClick={() => generateOne(t)}
                    disabled={isRunning}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-white hover:bg-blue-50 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors shadow-2xs shrink-0"
                  >
                    <span>🔄</span>
                    <span>재생성</span>
                  </button>
                )}
                {/* v1.18: 아직 만들지 않았거나 실패한 섹션도 한 장씩 만들 수 있게 한다(전체 생성만 있던 문제, S-22-01). */}
                {(state.status === "idle" || state.status === "error") && (
                  <button
                    onClick={() => generateOne(t)}
                    disabled={isRunning}
                    title={`이 섹션만 1장 생성 · 예상 비용 약 $${IMAGE_MODEL_COST_USD[model].toFixed(2)}`}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-2.5 py-1 rounded-lg transition-colors shadow-2xs shrink-0"
                  >
                    <span>✨</span>
                    <span>생성 · 약 ${IMAGE_MODEL_COST_USD[model].toFixed(2)}</span>
                  </button>
                )}
              </div>

              {/* 섹션 이미지 뷰어 */}
              <div className="aspect-[4/5] bg-slate-50 flex items-center justify-center relative overflow-hidden group">
                {state.status === "done" && state.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageSrc(state.url)}
                    alt={t.section_name}
                    className="w-full h-full object-cover cursor-zoom-in group-hover:scale-[1.01] transition-transform"
                    onClick={() => setLightboxUrl(state.url!)}
                  />
                )}
                {state.status === "generating" && (
                  <div className="flex flex-col items-center gap-2 text-slate-500 animate-pulse">
                    <span className="text-2xl animate-spin">⏳</span>
                    <span className="text-xs font-bold">AI 이미지 생성 중...</span>
                  </div>
                )}
                {state.status === "uploading" && (
                  <div className="flex flex-col items-center gap-2 text-slate-500 animate-pulse">
                    <span className="text-2xl">📤</span>
                    <span className="text-xs font-bold">이미지 업로드 중...</span>
                  </div>
                )}
                {state.status === "idle" && (
                  <div className="flex flex-col items-center gap-1.5 text-slate-400">
                    <span className="text-2xl">🖼️</span>
                    <span className="text-xs font-medium">생성 대기 중</span>
                  </div>
                )}
                {state.status === "error" && (
                  <div className="p-4 text-center">
                    <span className="text-xl mb-1 block">⚠️</span>
                    <span className="text-xs font-semibold text-rose-600 leading-tight block">{state.error}</span>
                  </div>
                )}
              </div>

              {/* 재생성 이력 썸네일 바 */}
              <div className="p-3 bg-white border-t border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    VERSIONS ({state.history.length})
                  </p>
                  {/* v1.19(추가, S-22-10): 선택한 이미지 1장을 쓰레드 쇼핑제휴 새 글로 넘긴다(AI 호출 없음). v1.20: 인스타 새 글도. */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {threadsHref && (
                      <a
                        href={threadsHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="선택한 이미지 1장과 상품명·핵심 특징을 쓰레드 쇼핑제휴 자동화의 새 글 화면으로 넘깁니다"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors shadow-2xs shrink-0 whitespace-nowrap"
                      >
                        <span>🧵</span>
                        <span>쓰레드 홍보글</span>
                      </a>
                    )}
                    {instaHref && (
                      <a
                        href={instaHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="선택한 이미지 1장과 상품명·핵심 특징을 INSTA 포스팅 자동화의 새 글 화면으로 넘깁니다"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors shadow-2xs shrink-0 whitespace-nowrap"
                      >
                        <span>📸</span>
                        <span>인스타 홍보글</span>
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {state.history.map((url, i) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => handleSelect(t.section_key, url)}
                      className={`relative shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${
                        state.url === url
                          ? "border-blue-600 ring-2 ring-blue-500/20 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 opacity-60 hover:opacity-100"
                      }`}
                      title={`버전 ${i + 1}${state.url === url ? " (선택됨)" : ""}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageSrc(url)} alt={`버전 ${i + 1}`} className="w-full h-full object-cover" />
                      {state.url === url && (
                        <span className="absolute bottom-0 right-0 bg-blue-600 text-white text-[9px] px-1 font-bold rounded-tl">
                          ✓
                        </span>
                      )}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => triggerCustomUpload(t)}
                    className="shrink-0 w-14 h-14 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/30 flex flex-col items-center justify-center text-slate-400 hover:text-blue-600 text-xs transition-all"
                    title="직접 보유한 이미지 업로드"
                  >
                    <span className="text-base font-bold">+</span>
                    <span className="text-[9px]">직접등록</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 최종 병합 다운로드 버튼 (하단 고정형 시각화) */}
      {hasAnyImage && (
        <div className="sticky bottom-4 z-20 pt-4 flex flex-col sm:flex-row gap-2">
          <a
            href={`/api/products/${productId}/export`}
            className="flex flex-1 items-center justify-center gap-2 text-center text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 px-6 py-4 rounded-2xl shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <span className="text-lg">📥</span>
            <span>선택한 이미지로 최종 {templates.length}단 상세페이지 세로 롱 이미지(860px) 병합 & 다운로드</span>
          </a>
          {/* v1.21: 섹션마다 가로 860px JPG로 맞춰 번호 순서대로 ZIP 하나에(긴 한 장 대신 여러 장으로 올릴 때) */}
          <a
            href={`/api/products/${productId}/export-zip`}
            title="섹션마다 가로 860px JPG로 맞춰 01, 02… 순서로 ZIP 하나에 담아 받습니다"
            className="flex items-center justify-center gap-2 text-center text-sm font-bold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 px-5 py-4 rounded-2xl shadow-xl shadow-blue-500/10 transition-all whitespace-nowrap shrink-0"
          >
            <span className="text-lg">📦</span>
            <span>섹션별 ZIP</span>
          </a>
        </div>
      )}
    </div>
  );
}
