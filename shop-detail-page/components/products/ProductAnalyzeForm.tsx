"use client";

import { useRef, useState } from "react";
import { uploadImageDirect, uploadSpecDocument } from "@/lib/uploadImageClient";
import { analyzeByNameAction, analyzeProductAction, createProductAction } from "@/lib/actions/products";
import { ApiKeyRequiredModal } from "@/components/settings/ApiKeyRequiredModal";
import type { FlatProductAnalysis } from "@/lib/ai/flattenAnalysis";
import { IMAGE_MODEL_OPTIONS, DEFAULT_IMAGE_MODEL, type ImageModelKey } from "@/lib/ai/imageModels";
import { imageSrc } from "@/lib/imageSrc";
import { DEFAULT_LAYOUT_PRESET, LAYOUT_PRESETS, type LayoutPreset } from "@/lib/layoutPresets";

const MAX_REFERENCE_IMAGES = 10;

const EMPTY_FIELDS: FlatProductAnalysis = {
  name: "",
  category: "",
  keyFeatures: "",
  specs: "",
  howToUse: "",
  targetCustomer: "",
  mainColor: "",
  subColor: "",
  backgroundStyle: "",
  moodKeywords: [],
  fontStyle: "",
  layoutDensity: "",
};

export function ProductAnalyzeForm({
  hasGeminiKey,
  initialLabel = "",
  initialSourceText = "",
  initialPrice = "",
}: {
  hasGeminiKey: boolean;
  initialLabel?: string;
  initialSourceText?: string;
  initialPrice?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const specDocInputRef = useRef<HTMLInputElement>(null);

  const [productLabel, setProductLabel] = useState(initialLabel);
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
  const [referenceImageUrls, setReferenceImageUrls] = useState<string[]>([]);
  const [sourceText, setSourceText] = useState(initialSourceText);
  const [fields, setFields] = useState<FlatProductAnalysis>(EMPTY_FIELDS);
  const [price, setPrice] = useState(initialPrice);
  const [salePrice, setSalePrice] = useState("");
  const [defaultImageModel, setDefaultImageModel] = useState<ImageModelKey>(DEFAULT_IMAGE_MODEL);
  const [layoutPreset, setLayoutPreset] = useState<LayoutPreset>(DEFAULT_LAYOUT_PRESET);
  const [specDocument, setSpecDocument] = useState<{ name: string; url: string } | null>(null);
  const [isUploadingSpecDoc, setIsUploadingSpecDoc] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingReference, setIsUploadingReference] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // v1.23: 상품명만으로 채운 결과(AI 추정값)인지 — 확인 안내를 띄운다
  const [isNameEstimate, setIsNameEstimate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setIsUploading(true);
    try {
      const result = await uploadImageDirect(file);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSourceImageUrl(result.url ?? null);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }

  async function handleReferenceFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setError(null);

    const remaining = MAX_REFERENCE_IMAGES - referenceImageUrls.length;
    if (remaining <= 0) {
      setError(`참고 이미지는 최대 ${MAX_REFERENCE_IMAGES}장까지 올릴 수 있습니다.`);
      e.target.value = "";
      return;
    }

    setIsUploadingReference(true);
    try {
      const toUpload = files.slice(0, remaining);
      const uploadedUrls: string[] = [];
      for (const file of toUpload) {
        const result = await uploadImageDirect(file);
        if (result.error) {
          setError(result.error);
          continue;
        }
        if (result.url) uploadedUrls.push(result.url);
      }
      setReferenceImageUrls((prev) => [...prev, ...uploadedUrls]);
    } finally {
      setIsUploadingReference(false);
      e.target.value = "";
    }
  }

  // v1.16(12단에서 옮김): TXT·MD는 내용을 원본 정보 칸에 붙이고, PDF는 본인 폴더에 올려 분석 때 문서로 넘긴다.
  async function handleSpecDocChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      if (/\.(txt|md)$/i.test(file.name) || file.type.startsWith("text/")) {
        const text = (await file.text()).trim();
        if (text) setSourceText((prev) => (prev.trim() ? `${prev.trim()}\n\n${text}` : text));
        return;
      }
      setIsUploadingSpecDoc(true);
      const result = await uploadSpecDocument(file);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.url) setSpecDocument({ name: file.name, url: result.url });
    } finally {
      setIsUploadingSpecDoc(false);
      e.target.value = "";
    }
  }

  function removeReferenceImage(url: string) {
    setReferenceImageUrls((prev) => prev.filter((u) => u !== url));
  }

  async function handleAnalyze() {
    if (!sourceImageUrl) {
      setError("먼저 대표이미지를 업로드해주세요.");
      return;
    }
    setError(null);
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.set("sourceImageUrl", sourceImageUrl);
      for (const url of referenceImageUrls) formData.append("referenceImageUrls", url);
      formData.set("sourceText", sourceText);
      if (specDocument) formData.set("specDocumentUrl", specDocument.url);
      formData.set("productNameHint", productLabel);
      const result = await analyzeProductAction(formData);

      if (result.needsApiKey) {
        setShowApiKeyModal(true);
        return;
      }
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.data) {
        setFields(result.data);
        setAnalyzed(true);
        setIsNameEstimate(false);
      }
    } finally {
      setIsAnalyzing(false);
    }
  }

  // v1.23(AI 12단에서 옮김): 사진 없이 상품명(과 원본 정보)만으로 입력칸을 채운다. 저장·이미지 생성에는 여전히 사진이 필요하다.
  async function handleAnalyzeByName() {
    if (!productLabel.trim()) {
      setError("상품명을 먼저 입력해주세요.");
      return;
    }
    setError(null);
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.set("productName", productLabel);
      formData.set("sourceText", sourceText);
      const result = await analyzeByNameAction(formData);
      if (result.needsApiKey) {
        setShowApiKeyModal(true);
        return;
      }
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.data) {
        setFields(result.data);
        setAnalyzed(true);
        setIsNameEstimate(true);
      }
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!sourceImageUrl) {
      setError("먼저 대표이미지를 업로드해주세요.");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      formData.set("sourceImageUrl", sourceImageUrl);
      for (const url of referenceImageUrls) formData.append("referenceImageUrls", url);
      formData.set("moodKeywords", fields.moodKeywords.join(", "));
      const result = await createProductAction(formData);
      if (result?.error) {
        setError(result.error);
      }
      // 성공 시 createProductAction 내부에서 redirect()로 이동한다.
    } finally {
      setIsSaving(false);
    }
  }

  function updateField<K extends keyof FlatProductAnalysis>(key: K, value: FlatProductAnalysis[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {showApiKeyModal && (
        <ApiKeyRequiredModal
          missingLabels={["Google (Gemini / 나노바나나)"]}
          onClose={() => setShowApiKeyModal(false)}
        />
      )}

      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-2">
        <label className="block text-sm font-bold text-slate-800">상품명 (관리용)</label>
        <p className="text-xs text-slate-500">
          AI 분석과 별개로 직접 관리하는 상품명입니다. 최종 상세페이지 제작 시 이 이름을 참고합니다.
        </p>
        <input
          name="productLabel"
          className="input"
          placeholder="예: 프리미엄 에어 서큘레이터 팬"
          value={productLabel}
          onChange={(e) => setProductLabel(e.target.value)}
        />
      </div>

      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-slate-900">1. 대표이미지 업로드</h2>
          <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">필수</span>
        </div>
        <p className="text-xs text-slate-500">
          이 이미지는 이후 상세페이지 섹션 이미지를 생성할 때 합성 기준 이미지로 사용됩니다.
          <br />
          <span className="font-semibold text-amber-700">
            가급적 배경이 깔끔하게 제거된 누끼컷이나 단색 배경 이미지를 권장합니다.
          </span>
        </p>
        <div
          className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer border-slate-300 hover:border-blue-500 hover:bg-blue-50/30 transition-all group"
          onClick={() => fileInputRef.current?.click()}
        >
          {sourceImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageSrc(sourceImageUrl)} alt="대표이미지" className="max-h-56 mx-auto rounded-xl shadow-xs" />
          ) : (
            <>
              <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">📷</div>
              <p className="text-sm text-slate-700 font-bold">
                {isUploading ? "이미지 업로드 중..." : "클릭해서 대표 상품 이미지를 업로드하세요"}
              </p>
              <p className="text-xs text-slate-400 mt-1">JPG, PNG, WEBP · 최대 10MB · 정방형(1:1) 누끼컷 권장</p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-3">
        <h2 className="text-sm sm:text-base font-bold text-slate-900">
          2. 참고 이미지 추가 (선택, 최대 {MAX_REFERENCE_IMAGES}장)
        </h2>
        <p className="text-xs text-slate-500">
          상세페이지가 여러 장의 원본 이미지로 구성된 경우, 정면/후면/구성품/스펙표 등 추가 사진을
          올려주시면 AI가 더 정확하게 분석합니다. (분석 참고용으로 사용됩니다.)
        </p>
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
          {referenceImageUrls.map((url) => (
            <div key={url} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageSrc(url)} alt="참고이미지" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeReferenceImage(url)}
                className="absolute top-1.5 right-1.5 bg-rose-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-xs"
              >
                ×
              </button>
            </div>
          ))}
          {referenceImageUrls.length < MAX_REFERENCE_IMAGES && (
            <div
              className="aspect-square rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer flex items-center justify-center text-slate-400 text-2xl transition-all"
              onClick={() => referenceInputRef.current?.click()}
            >
              {isUploadingReference ? "…" : "+"}
            </div>
          )}
        </div>
        <input
          ref={referenceInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handleReferenceFilesChange}
        />
      </div>

      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-3">
        <h2 className="text-sm sm:text-base font-bold text-slate-900">3. 상품 원본 정보 (선택)</h2>
        <label className="block text-xs sm:text-sm font-semibold text-slate-700">
          상품명, 가격, 원산지, 스펙 등 — 추가로 등록 해주시면 상품 분석 정확도가 크게 향상됩니다
        </label>
        <textarea
          className="input"
          rows={3}
          placeholder="예: 상품명, 가격, 원산지, 스펙 등 알고 있는 정보를 자유롭게 입력하세요."
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={specDocInputRef}
            type="file"
            accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
            className="hidden"
            onChange={handleSpecDocChange}
          />
          <button
            type="button"
            onClick={() => specDocInputRef.current?.click()}
            disabled={isUploadingSpecDoc}
            className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-white disabled:opacity-50"
          >
            {isUploadingSpecDoc ? "사양서 올리는 중..." : "📄 사양서 불러오기 (PDF · TXT · MD)"}
          </button>
          {specDocument && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1">
              📎 {specDocument.name}
              <button type="button" onClick={() => setSpecDocument(null)} className="text-slate-400 hover:text-rose-500" aria-label="사양서 빼기">
                ✕
              </button>
            </span>
          )}
          <span className="text-[11px] text-slate-400">PDF는 분석 때 AI가 문서 그대로 읽고, TXT·MD는 위 칸에 내용이 들어갑니다.</span>
        </div>

        <button
          type="button"
          onClick={handleAnalyze}
          disabled={!sourceImageUrl || isAnalyzing}
          className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
        >
          {isAnalyzing ? (
            <>
              <span className="inline-block animate-spin">⏳</span>
              <span>Gemini AI 소구점 정밀 분석 중...</span>
            </>
          ) : (
            <>
              <span>✨</span>
              <span>Gemini AI로 상품 소구점 분석하기</span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleAnalyzeByName}
          disabled={!productLabel.trim() || isAnalyzing}
          title="사진이 아직 없을 때 상품명(과 원본 정보)만으로 분석 칸을 먼저 채웁니다. 섹션 이미지를 만들려면 대표 사진이 필요합니다."
          className="w-full bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-bold py-2.5 px-4 rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-2 text-sm"
        >
          <span>📝</span>
          <span>사진 없이 상품명으로 먼저 채우기</span>
        </button>
        {!hasGeminiKey && (
          <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
            ⚠️ Gemini API 키가 등록되어 있지 않습니다. 분석 시도 시 등록 모달이 표시됩니다.
          </p>
        )}
        {error && <p className="text-xs font-semibold text-rose-700 bg-rose-50 rounded-lg p-3 border border-rose-200">{error}</p>}
      </div>

      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-slate-900">
            4. 소구점 분석 결과 확인 및 수정
          </h2>
          {analyzed && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              ✓ AI 분석 완료
            </span>
          )}
        </div>
        {analyzed && isNameEstimate && (
          <p className="text-xs text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-200 leading-relaxed">
            📝 사진 없이 <b>상품명만으로 AI가 추정한 값</b>입니다. 실제 상품과 다른 소재·치수·색상은 꼭 고쳐 주세요. 「확인 필요」 칸은 아는 사실로 채우거나 비워 두세요.
            저장과 섹션 이미지 생성에는 위 1번의 대표이미지가 필요합니다. 사진을 올린 뒤 「Gemini AI로 상품 소구점 분석하기」를 다시 누르면 사진 기준으로 분석합니다.
          </p>
        )}
        {analyzed && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
            ⚠️ AI가 사진·사양서로 <b>추정</b>한 내용입니다. 스펙·인증·가격·효능 표현은 실제 상품 정보와 꼭 맞춰 고친 뒤 저장해 주세요.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">상품명</label>
            <input
              name="name"
              className="input-sm"
              value={fields.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">카테고리</label>
            <input
              name="category"
              className="input-sm"
              value={fields.category}
              onChange={(e) => updateField("category", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">정상가 (원)</label>
            <input
              name="price"
              type="number"
              className="input-sm"
              placeholder="예: 49000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">할인가 / 판매가 (원)</label>
            <input
              name="salePrice"
              type="number"
              className="input-sm"
              placeholder="예: 29900"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">핵심특징 (줄바꿈으로 구분)</label>
          <textarea
            name="keyFeatures"
            className="input-sm"
            rows={4}
            value={fields.keyFeatures}
            onChange={(e) => updateField("keyFeatures", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">상세스펙</label>
          <textarea
            name="specs"
            className="input-sm"
            rows={3}
            value={fields.specs}
            onChange={(e) => updateField("specs", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">사용방법</label>
          <textarea
            name="howToUse"
            className="input-sm"
            rows={3}
            value={fields.howToUse}
            onChange={(e) => updateField("howToUse", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">타겟고객</label>
          <textarea
            name="targetCustomer"
            className="input-sm"
            rows={2}
            value={fields.targetCustomer}
            onChange={(e) => updateField("targetCustomer", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">메인컬러</label>
            <input
              name="mainColor"
              className="input-sm"
              value={fields.mainColor}
              onChange={(e) => updateField("mainColor", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">서브컬러</label>
            <input
              name="subColor"
              className="input-sm"
              value={fields.subColor}
              onChange={(e) => updateField("subColor", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">배경스타일</label>
            <input
              name="backgroundStyle"
              className="input-sm"
              value={fields.backgroundStyle}
              onChange={(e) => updateField("backgroundStyle", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">폰트스타일</label>
            <input
              name="fontStyle"
              className="input-sm"
              value={fields.fontStyle}
              onChange={(e) => updateField("fontStyle", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">레이아웃밀도</label>
            <input
              name="layoutDensity"
              className="input-sm"
              value={fields.layoutDensity}
              onChange={(e) => updateField("layoutDensity", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">분위기키워드</label>
            <input
              className="input-sm"
              value={fields.moodKeywords.join(", ")}
              onChange={(e) =>
                updateField(
                  "moodKeywords",
                  e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                )
              }
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-3">
        <h2 className="text-sm sm:text-base font-bold text-slate-900">5. 이미지 생성 시 추가 반영사항 (선택)</h2>
        <p className="text-xs text-slate-500">
          여기에 적은 내용은 섹션 이미지를 생성할 때마다 프롬프트에 공통으로 함께 반영됩니다.
        </p>
        <textarea
          name="imageGenerationNotes"
          className="input"
          rows={3}
          placeholder="예: 텍스트는 간결하게 유지하고 제품 디테일 중심 / 화이트톤 미니멀 감성"
        />
      </div>

      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-3">
        <h2 className="text-sm sm:text-base font-bold text-slate-900">6. 상세페이지 규격</h2>
        <p className="text-xs text-slate-500">판매할 마켓에 맞춰 섹션 구성을 고르세요. 저장한 뒤에는 바꿀 수 없습니다.</p>
        <input type="hidden" name="layoutPreset" value={layoutPreset} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {(Object.keys(LAYOUT_PRESETS) as LayoutPreset[]).map((key) => {
            const p = LAYOUT_PRESETS[key];
            const active = layoutPreset === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setLayoutPreset(key)}
                className={`text-left rounded-xl border p-3 transition-all ${
                  active ? "border-blue-500 bg-blue-50/60 shadow-xs" : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className={`text-sm font-bold ${active ? "text-blue-700" : "text-slate-800"}`}>{p.label}</div>
                <div className="text-[11px] text-slate-500 mt-1 leading-snug">{p.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-3">
        <h2 className="text-sm sm:text-base font-bold text-slate-900">7. 상세페이지 이미지 생성 모델</h2>
        <p className="text-xs text-slate-500">
          섹션 이미지를 생성할 때 기본으로 사용할 나노바나나 엔진 모델을 선택하세요.
        </p>
        <input type="hidden" name="defaultImageModel" value={defaultImageModel} />
        <div className="flex rounded-xl border border-slate-200 overflow-hidden text-xs w-fit bg-slate-50 p-1 gap-1">
          {IMAGE_MODEL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDefaultImageModel(opt.value)}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${
                defaultImageModel === opt.value
                  ? "bg-white text-blue-600 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
              title={opt.hint}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={!sourceImageUrl || isSaving}
        className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-xl shadow-md shadow-blue-500/25 transition-all text-sm sm:text-base"
      >
        {isSaving ? "상세페이지 프로젝트 저장 중..." : `✓ 상품정보 저장 후 ${LAYOUT_PRESETS[layoutPreset].short} 상세페이지 만들기`}
      </button>
    </form>
  );
}
