"use client";

import { useRef, useState } from "react";
import { uploadImageDirect } from "@/lib/uploadImageClient";
import { analyzeProductAction, createProductAction } from "@/lib/actions/products";
import { ApiKeyRequiredModal } from "@/components/settings/ApiKeyRequiredModal";
import type { FlatProductAnalysis } from "@/lib/ai/flattenAnalysis";

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

export function ProductAnalyzeForm({ hasGeminiKey }: { hasGeminiKey: boolean }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);

  const [productLabel, setProductLabel] = useState("");
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
  const [referenceImageUrls, setReferenceImageUrls] = useState<string[]>([]);
  const [sourceText, setSourceText] = useState("");
  const [fields, setFields] = useState<FlatProductAnalysis>(EMPTY_FIELDS);
  const [price, setPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");

  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingReference, setIsUploadingReference] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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

      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-2">
        <label className="block font-bold text-gray-800">상품명</label>
        <p className="text-xs text-gray-500">
          AI 분석과 별개로 직접 관리하는 상품명입니다. 최종 상세페이지 제작 시 이 이름을 참고합니다.
        </p>
        <input
          name="productLabel"
          className="input"
          placeholder="예: TP-Link Archer BE550 공유기"
          value={productLabel}
          onChange={(e) => setProductLabel(e.target.value)}
        />
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
        <h2 className="font-bold text-gray-800">1. 대표이미지 업로드</h2>
        <p className="text-xs text-gray-500">
          이 이미지는 이후 상세페이지 섹션 이미지를 생성할 때 합성 기준 이미지로 사용됩니다.
          <br />
          <span className="font-semibold text-amber-600">
            가급적 배경이 제거된 누끼컷 이미지를 올려주세요 — 이미지 합성 시 결과물이 더 자연스러워집니다.
          </span>
        </p>
        <div
          className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer border-gray-300 hover:border-blue-400 hover:bg-gray-50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          {sourceImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={sourceImageUrl} alt="대표이미지" className="max-h-48 mx-auto rounded-lg" />
          ) : (
            <>
              <div className="text-3xl mb-2">📷</div>
              <p className="text-gray-600 font-medium">
                {isUploading ? "업로드 중..." : "클릭해서 대표이미지를 업로드하세요"}
              </p>
              <p className="text-sm text-gray-400 mt-1">JPG, PNG, WEBP · 최대 10MB · 누끼컷 권장</p>
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

      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
        <h2 className="font-bold text-gray-800">
          2. 참고 이미지 추가 (선택, 최대 {MAX_REFERENCE_IMAGES}장)
        </h2>
        <p className="text-xs text-gray-500">
          상세페이지가 여러 장의 원본 이미지로 구성된 경우, 정면/후면/구성품/스펙표 등 추가 사진을
          올려주시면 AI가 더 정확하게 분석합니다. (이 이미지들은 분석에만 사용되고, 이미지 생성 시
          합성 기준으로는 쓰이지 않습니다.)
        </p>
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {referenceImageUrls.map((url) => (
            <div key={url} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="참고이미지" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeReferenceImage(url)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
          {referenceImageUrls.length < MAX_REFERENCE_IMAGES && (
            <div
              className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-gray-50 cursor-pointer flex items-center justify-center text-gray-400 text-2xl transition-colors"
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

      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
        <h2 className="font-bold text-gray-800">3. 상품 원본 정보 (선택)</h2>
        <label className="block text-sm font-semibold text-gray-700">
          상품명, 가격, 원산지, 스펙 등 — 추가로 등록 해주시면 상품분석도가 더 올라갑니다
        </label>
        <textarea
          className="input"
          rows={3}
          placeholder="예: 상품명, 가격, 원산지, 스펙 등 알고 있는 정보를 자유롭게 입력하세요."
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
        />

        <button
          type="button"
          onClick={handleAnalyze}
          disabled={!sourceImageUrl || isAnalyzing}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-60 text-white font-bold py-3 px-4 rounded-xl transition-all"
        >
          {isAnalyzing ? "AI 분석 중..." : "✨ AI로 상품 분석하기"}
        </button>
        {!hasGeminiKey && (
          <p className="text-xs text-amber-600">
            Gemini API 키가 등록되어 있지 않습니다. 분석 시도 시 등록 안내가 표시됩니다.
          </p>
        )}
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
        <h2 className="font-bold text-gray-800">
          4. 분석 결과 확인 및 수정 {analyzed && <span className="text-green-600 text-sm">(AI 분석 완료)</span>}
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">상품명</label>
            <input
              name="name"
              className="input-sm"
              value={fields.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">카테고리</label>
            <input
              name="category"
              className="input-sm"
              value={fields.category}
              onChange={(e) => updateField("category", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">정상가</label>
            <input
              name="price"
              type="number"
              className="input-sm"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">할인가</label>
            <input
              name="salePrice"
              type="number"
              className="input-sm"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">핵심특징 (줄바꿈으로 구분)</label>
          <textarea
            name="keyFeatures"
            className="input-sm"
            rows={4}
            value={fields.keyFeatures}
            onChange={(e) => updateField("keyFeatures", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">상세스펙</label>
          <textarea
            name="specs"
            className="input-sm"
            rows={4}
            value={fields.specs}
            onChange={(e) => updateField("specs", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">사용방법</label>
          <textarea
            name="howToUse"
            className="input-sm"
            rows={3}
            value={fields.howToUse}
            onChange={(e) => updateField("howToUse", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">타겟고객</label>
          <textarea
            name="targetCustomer"
            className="input-sm"
            rows={3}
            value={fields.targetCustomer}
            onChange={(e) => updateField("targetCustomer", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">메인컬러</label>
            <input
              name="mainColor"
              className="input-sm"
              value={fields.mainColor}
              onChange={(e) => updateField("mainColor", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">서브컬러</label>
            <input
              name="subColor"
              className="input-sm"
              value={fields.subColor}
              onChange={(e) => updateField("subColor", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">배경스타일</label>
            <input
              name="backgroundStyle"
              className="input-sm"
              value={fields.backgroundStyle}
              onChange={(e) => updateField("backgroundStyle", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">폰트스타일</label>
            <input
              name="fontStyle"
              className="input-sm"
              value={fields.fontStyle}
              onChange={(e) => updateField("fontStyle", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">레이아웃밀도</label>
            <input
              name="layoutDensity"
              className="input-sm"
              value={fields.layoutDensity}
              onChange={(e) => updateField("layoutDensity", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">분위기키워드 (쉼표로 구분)</label>
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

      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
        <h2 className="font-bold text-gray-800">5. 이미지 생성 시 추가로 반영할 내용 (선택)</h2>
        <p className="text-xs text-gray-500">
          여기에 적은 내용은 15개 섹션 이미지를 생성할 때마다 프롬프트에 공통으로 함께 반영됩니다.
        </p>
        <textarea
          name="imageGenerationNotes"
          className="input"
          rows={3}
          placeholder="예: 텍스트는 최소화하고 제품 사진 위주로 구성해주세요 / 배경은 항상 화이트톤 유지 등"
        />
      </div>

      <button
        type="submit"
        disabled={!sourceImageUrl || isSaving}
        className="w-full bg-gray-900 hover:bg-black disabled:opacity-60 text-white font-bold py-3 px-4 rounded-xl transition-all"
      >
        {isSaving ? "저장 중..." : "상품정보 저장 후 상세페이지 만들기"}
      </button>
    </form>
  );
}
