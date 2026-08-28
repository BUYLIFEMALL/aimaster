"use client";

import { useRef, useState, useTransition } from "react";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { analyzeProductImagesAction, uploadProductImageAction } from "@/lib/actions/products";
import { generateImageAction } from "@/lib/actions/ai";
import type { DetailPageSummary } from "@/lib/detailPages";

interface EnrichmentFieldsProps {
  detailPages: DetailPageSummary[];
  onDetailPageSelect?: (page: DetailPageSummary | null) => void;
  /** 상품명은 이 섹션 위(부모 폼)에서 입력받아 여기로는 참고용으로만 전달된다. */
  productName?: string;
  /** 이미지 분석 결과 AI가 상품명을 추론했는데 아직 입력되지 않았을 때 부모로 값을 올려준다. */
  onProductNameSuggested?: (name: string) => void;
  /** 쿠팡처럼 검색으로 이미 확보한 상품 이미지 URL이 있으면 5번(대표 이미지) 후보로 바로 제공한다. */
  initialImageUrl?: string;
}

const MAX_REFERENCE_IMAGES = 10;

interface ImageCandidate {
  key: string;
  label: string;
  previewUrl: string;
  /** 이미 호스팅된 URL이면 그대로 사용, 로컬 파일이면 선택 시점에 업로드한다. */
  remoteUrl?: string;
  file?: File;
}

// "상품 및 상세페이지 분석" 모드에서 쓰는 입력 섹션. 이 필드가 채워지면 서버 액션에서
// input_mode가 자동으로 "manual"이 되어, 캡션 생성 시 이 내용까지 AI 프롬프트에 반영된다.
// shop-detail-page(상세페이지 자동화, /products/new)의 "AI로 상품 분석하기" 흐름을 참고해서
// 1~6번 단계로 구성했다: 1.대표이미지 2.상세페이지 이미지(선택,최대10) 3.상품 원본 정보
// 4.분석 결과 확인/수정 5.게시글용 대표 이미지(업로드 선택 또는 AI 생성) 6.최종 확인.
export function EnrichmentFields({
  detailPages,
  onDetailPageSelect,
  productName,
  onProductNameSuggested,
  initialImageUrl,
}: EnrichmentFieldsProps) {
  const [description, setDescription] = useState("");
  const [keySellingPoints, setKeySellingPoints] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analyzed, setAnalyzed] = useState(false);
  const [isAnalyzing, startAnalyzing] = useTransition();

  const [sourceImageFile, setSourceImageFile] = useState<File | null>(null);
  const [sourceImagePreview, setSourceImagePreview] = useState<string | null>(null);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [referencePreviews, setReferencePreviews] = useState<string[]>([]);
  const [referenceError, setReferenceError] = useState<string | null>(null);

  const [postImageUrl, setPostImageUrl] = useState(initialImageUrl ?? "");
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageActionError, setImageActionError] = useState<string | null>(null);
  const [isUploadingImage, startUploadingImage] = useTransition();
  const [isGeneratingImage, startGeneratingImage] = useTransition();

  const sourceImageInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);

  function handleSourceImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSourceImageFile(file);
    setSourceImagePreview(file ? URL.createObjectURL(file) : null);
  }

  function handleReferenceImagesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length > MAX_REFERENCE_IMAGES) {
      setReferenceError(`상세페이지 이미지는 최대 ${MAX_REFERENCE_IMAGES}장까지 선택할 수 있습니다.`);
      return;
    }
    setReferenceError(null);
    setReferenceFiles(files);
    setReferencePreviews(files.map((f) => URL.createObjectURL(f)));
  }

  function handleAnalyze() {
    setAnalyzeError(null);
    if (!sourceImageFile) {
      setAnalyzeError("대표 이미지를 먼저 업로드해주세요.");
      return;
    }

    const payload = new FormData();
    payload.append("images", sourceImageFile);
    referenceFiles.forEach((file) => payload.append("images", file));
    payload.set("productName", productName ?? "");
    payload.set("sourceText", sourceText);

    startAnalyzing(async () => {
      const res = await analyzeProductImagesAction(payload);
      if (res.error || !res.result) {
        setAnalyzeError(res.error ?? "분석에 실패했습니다.");
        return;
      }
      if (res.result.productName && !productName?.trim()) {
        onProductNameSuggested?.(res.result.productName);
      }
      setDescription(res.result.description);
      setKeySellingPoints(res.result.keySellingPoints.join("\n"));
      setAnalyzed(true);
    });
  }

  const imageCandidates: ImageCandidate[] = [
    ...(initialImageUrl
      ? [{ key: "initial", label: "선택한 상품 이미지", previewUrl: initialImageUrl, remoteUrl: initialImageUrl }]
      : []),
    ...(sourceImagePreview
      ? [{ key: "source", label: "대표 이미지", previewUrl: sourceImagePreview, file: sourceImageFile! }]
      : []),
    ...referencePreviews.map((url, i) => ({
      key: `ref-${i}`,
      label: `상세페이지 이미지 ${i + 1}`,
      previewUrl: url,
      file: referenceFiles[i],
    })),
  ];

  function handlePickImage(candidate: ImageCandidate) {
    setImageActionError(null);
    if (candidate.remoteUrl) {
      setPostImageUrl(candidate.remoteUrl);
      return;
    }
    if (!candidate.file) return;
    const payload = new FormData();
    payload.set("image", candidate.file);
    startUploadingImage(async () => {
      const res = await uploadProductImageAction(payload);
      if (res.error || !res.url) {
        setImageActionError(res.error ?? "이미지 업로드에 실패했습니다.");
        return;
      }
      setPostImageUrl(res.url);
    });
  }

  function handleGenerateImage() {
    setImageActionError(null);
    const basePrompt =
      imagePrompt.trim() ||
      [
        `상품명: ${productName || "등록 중인 상품"}`,
        description ? `설명: ${description}` : null,
        keySellingPoints ? `핵심 셀링포인트: ${keySellingPoints.replace(/\n/g, ", ")}` : null,
        "SNS(Threads) 홍보 게시글에 어울리는 깔끔하고 눈에 띄는 상품 홍보 이미지로 만들어주세요.",
      ]
        .filter(Boolean)
        .join("\n");

    startGeneratingImage(async () => {
      const res = await generateImageAction({ prompt: basePrompt });
      if (res.error || !res.imageUrl) {
        setImageActionError(res.error ?? "이미지 생성에 실패했습니다.");
        return;
      }
      setPostImageUrl(res.imageUrl);
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-neutral-300 bg-white p-4">
      <h3 className="text-sm font-semibold text-neutral-900">🔍 상품 및 상세페이지 분석</h3>
      <p className="text-xs text-neutral-500">
        이미지를 올리고 분석하거나, 아래에 직접 상품 정보를 입력해주세요. 여기 입력한 내용은
        게시글 캡션을 만들 때 AI가 참고합니다.
      </p>

      {detailPages.length > 0 && (
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">
            기존 상세페이지에서 가져오기 (선택)
          </label>
          <select
            name="detailPageId"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-700"
            onChange={(e) => {
              const page = detailPages.find((p) => p.id === e.target.value) ?? null;
              onDetailPageSelect?.(page);
            }}
            defaultValue=""
          >
            <option value="">선택 안 함</option>
            {detailPages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.product_name} ({page.template})
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-neutral-400">
            &quot;상세페이지 자동화(15P)&quot;로 만든 페이지의 내용을 캡션 생성 참고자료로
            가져옵니다.
          </p>
        </div>
      )}

      {/* 1. 대표 이미지 업로드 */}
      <div className="rounded-lg bg-neutral-50 p-3">
        <label className="mb-1 block text-xs font-medium text-neutral-700">1. 대표 이미지 업로드</label>
        <input
          ref={sourceImageInputRef}
          type="file"
          accept="image/*"
          onChange={handleSourceImageChange}
          className="block w-full text-xs text-neutral-600 file:mr-2 file:rounded-md file:border-0 file:bg-neutral-900 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
        />
        {sourceImagePreview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sourceImagePreview} alt="대표 이미지 미리보기" className="mt-2 h-20 w-20 rounded object-cover" />
        )}
      </div>

      {/* 2. 상세페이지 이미지(선택, 최대 10장) */}
      <div className="rounded-lg bg-neutral-50 p-3">
        <label className="mb-1 block text-xs font-medium text-neutral-700">
          2. 상세페이지 이미지 (선택, 최대 {MAX_REFERENCE_IMAGES}장)
        </label>
        <input
          ref={referenceInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleReferenceImagesChange}
          className="block w-full text-xs text-neutral-600 file:mr-2 file:rounded-md file:border-0 file:bg-neutral-900 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
        />
        {referenceError && <p className="mt-1 text-xs text-red-600">{referenceError}</p>}
        {referencePreviews.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {referencePreviews.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt={`상세페이지 이미지 ${i + 1}`} className="h-16 w-16 rounded object-cover" />
            ))}
          </div>
        )}
      </div>

      {/* 3. 상품 원본 정보 */}
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-700">3. 상품 원본 정보</label>
        <Textarea
          rows={3}
          placeholder="예: 상품명, 가격, 원산지, 스펙 등 알고 있는 정보를 자유롭게 적어주세요."
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" onClick={handleAnalyze} disabled={isAnalyzing}>
          {isAnalyzing ? "AI 분석 중..." : "✨ AI로 상품 분석하기"}
        </Button>
        <p className="text-[11px] text-neutral-400">OpenAI 키 필요 · 결과는 검토 후 저장됩니다</p>
        {analyzed && !isAnalyzing && (
          <span className="text-[11px] font-medium text-green-600">✅ AI 분석 완료</span>
        )}
      </div>
      {analyzeError && <p className="text-xs text-red-600">{analyzeError}</p>}

      {/* 4. 분석 결과 확인 및 수정 */}
      <div className="space-y-3 rounded-lg border border-neutral-200 p-3">
        <p className="text-xs font-medium text-neutral-700">4. 분석 결과 확인 및 수정</p>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">상품 설명</label>
          <Textarea
            name="description"
            rows={3}
            placeholder="상품의 특징이나 장점을 자유롭게 적어주세요."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">
            핵심 셀링포인트 (한 줄에 하나씩)
          </label>
          <Textarea
            name="keySellingPoints"
            rows={3}
            placeholder={"예: 24시간 로켓배송\n1+1 한정 특가\n누적 판매 10만개"}
            value={keySellingPoints}
            onChange={(e) => setKeySellingPoints(e.target.value)}
          />
        </div>
      </div>

      {/* 5. 게시글용 대표 이미지 */}
      <div className="space-y-2 rounded-lg border border-neutral-200 p-3">
        <p className="text-xs font-medium text-neutral-700">5. 게시글용 대표 이미지</p>
        <p className="text-[11px] text-neutral-500">
          업로드한 이미지 중 하나를 고르거나, AI로 새 홍보 이미지를 생성할 수 있습니다.
        </p>

        {imageCandidates.length > 0 && (
          <div>
            <p className="mb-1 text-[11px] text-neutral-500">(A) 업로드 이미지 중 선택</p>
            <div className="flex flex-wrap gap-2">
              {imageCandidates.map((candidate) => {
                const isSelected = postImageUrl === candidate.remoteUrl;
                return (
                  <button
                    key={candidate.key}
                    type="button"
                    onClick={() => handlePickImage(candidate)}
                    disabled={isUploadingImage}
                    className={`flex flex-col items-center gap-1 rounded-lg border p-1 ${
                      isSelected ? "border-neutral-900" : "border-neutral-200"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={candidate.previewUrl} alt={candidate.label} className="h-16 w-16 rounded object-cover" />
                    <span className="text-[10px] text-neutral-500">
                      {isSelected ? "✅ 선택됨" : candidate.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <p className="mb-1 text-[11px] text-neutral-500">(B) AI로 새로 생성</p>
          <Textarea
            rows={2}
            placeholder="비워두면 상품명/설명/셀링포인트를 바탕으로 자동으로 프롬프트를 만듭니다."
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
          />
          <div className="mt-2 flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={handleGenerateImage} disabled={isGeneratingImage}>
              {isGeneratingImage ? "생성 중..." : "✨ AI로 대표 이미지 생성"}
            </Button>
            <p className="text-[11px] text-neutral-400">Gemini 키 필요</p>
          </div>
        </div>

        {imageActionError && <p className="text-xs text-red-600">{imageActionError}</p>}

        {postImageUrl && (
          <div>
            <p className="mb-1 text-[11px] text-neutral-500">선택된 대표 이미지</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={postImageUrl} alt="선택된 대표 이미지" className="h-24 w-24 rounded object-cover" />
          </div>
        )}
        <input type="hidden" name="imageUrl" value={postImageUrl} />
      </div>

      {/* 6. 최종 확인 및 등록 요약 */}
      <div className="rounded-lg border border-dashed border-neutral-300 p-3 text-xs text-neutral-600">
        <p className="mb-1 font-medium text-neutral-700">6. 최종 확인 및 등록</p>
        <p>상품명: {productName || "미입력"}</p>
        <p>상품 설명: {description ? `${description.slice(0, 40)}${description.length > 40 ? "..." : ""}` : "미입력"}</p>
        <p>
          핵심 셀링포인트:{" "}
          {keySellingPoints ? `${keySellingPoints.split("\n").filter(Boolean).length}개` : "미입력"}
        </p>
        <p>대표 이미지: {postImageUrl ? "선택됨" : "미선택"}</p>
        <p className="mt-1 text-neutral-400">아래 등록 버튼을 눌러 저장하세요.</p>
      </div>
    </div>
  );
}
