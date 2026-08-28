"use client";

import { startTransition, useActionState, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { PostActionState } from "@/lib/actions/posts";
import { generateAffiliateContentAction, generateImageAction } from "@/lib/actions/ai";
import { createClient } from "@/lib/supabase/client";
import type { ThreadsTone } from "@/lib/ai/generator";
import type { AffiliateProduct } from "@/types/product";
import { PLATFORM_LABELS } from "@/types/product";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type PublishMode = "draft" | "schedule" | "now";
type Tone = ThreadsTone;

const TONE_OPTIONS: { value: Tone; label: string }[] = [
  { value: "전문적", label: "전문적" },
  { value: "친근함", label: "친근함" },
  { value: "설득력있는", label: "설득력있는" },
  { value: "격식있는", label: "격식있는" },
  { value: "위트있는", label: "위트있는" },
];

const IMAGE_MODEL_OPTIONS = [
  { value: "nanobanana-2-2k", label: "NanoBanana 2-2K (2K 고화질 비주얼 - 추천)" },
  { value: "nanobanana-2-4k", label: "NanoBanana 2-4K (4K 울트라 HD)" },
  { value: "nanobanana-pro", label: "NanoBanana Pro (프로페셔널 인포그래픽)" },
  { value: "nanobanana", label: "NanoBanana Standard (기본 모델)" },
] as const;

// 플랫폼별 제휴 고지 문구 미리보기(실제 삽입은 서버의 generateAffiliatePostContent()가
// 담당한다 — 여기서는 사용자에게 "이 문구가 자동으로 붙습니다"를 미리 보여주는 용도).
const DISCLOSURE_PREVIEW: Record<AffiliateProduct["platform"], string | null> = {
  coupang: "(광고) 이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받을 수 있습니다.",
  aliexpress: "(광고) 이 포스팅은 제휴 마케팅 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받을 수 있습니다.",
  naver: null,
};

interface ProductPostFormProps {
  action: (prevState: PostActionState, formData: FormData) => Promise<PostActionState>;
  submitLabel: string;
  userId: string;
  products: AffiliateProduct[];
  initialContent?: string;
  initialImageUrl?: string;
  initialScheduledAtLocal?: string;
  initialPublishMode?: PublishMode;
  initialProductId?: string;
  hasThreadsAccount: boolean;
  // true면 제출 시 캡션+이미지를 무조건 함께 생성한 뒤 그 결과로 저장까지 한 번에 처리한다.
  aiGenerateOnSubmit?: boolean;
}

const initialState: PostActionState = {};

export function ProductPostForm({
  action,
  submitLabel,
  userId,
  products,
  initialContent = "",
  initialImageUrl = "",
  initialScheduledAtLocal = "",
  initialPublishMode = "draft",
  initialProductId = "",
  hasThreadsAccount,
  aiGenerateOnSubmit = false,
}: ProductPostFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [publishMode, setPublishMode] = useState<PublishMode>(initialPublishMode);
  const [scheduledAtLocal, setScheduledAtLocal] = useState(initialScheduledAtLocal);
  const [content, setContent] = useState(initialContent);

  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setUploadError("이미지 크기는 5MB를 넘을 수 없습니다.");
      return;
    }

    setUploadError(null);
    setIsUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage.from("post-images").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;

      const { data } = supabase.storage.from("post-images").getPublicUrl(path);
      setImageUrl(data.publicUrl);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "업로드에 실패했습니다.");
    } finally {
      setIsUploading(false);
    }
  };

  const [productId, setProductId] = useState(initialProductId);
  const selectedProduct = products.find((p) => p.id === productId) ?? null;
  const [tone, setTone] = useState<Tone>("친근함");
  const [keywordInput, setKeywordInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);

  const handleAddKeyword = (kw: string) => {
    const trimmed = kw.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords((prev) => [...prev, trimmed]);
    }
    setKeywordInput("");
  };

  const handleRemoveKeyword = (target: string) => {
    setKeywords((prev) => prev.filter((k) => k !== target));
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddKeyword(keywordInput);
    }
  };

  const [imagePrompt, setImagePrompt] = useState("");
  const [imageModel, setImageModel] = useState<(typeof IMAGE_MODEL_OPTIONS)[number]["value"]>(
    "nanobanana-2-2k",
  );
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [isGeneratingImage, startGeneratingImage] = useTransition();
  const [imageGenError, setImageGenError] = useState<string | null>(null);

  const handleGenerateImage = () => {
    const prompt = imagePrompt.trim() || selectedProduct?.product_name.trim() || "";
    if (!prompt) return;

    setImageGenError(null);
    startGeneratingImage(async () => {
      const result = await generateImageAction({ prompt, apiKey: geminiApiKey, model: imageModel });
      if (result.error) {
        setImageGenError(result.error);
        return;
      }
      if (result.imageUrl) {
        setImageUrl(result.imageUrl);
      }
    });
  };

  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const runGenerateAll = async (): Promise<{ content: string; imageUrl: string } | null> => {
    setAiError(null);
    setImageGenError(null);

    if (!productId) {
      setAiError("먼저 상품을 선택해주세요. (상품 관리 화면에서 미리 등록해두세요.)");
      return null;
    }

    let finalContent = content.trim();

    if (!finalContent) {
      setStatusMsg("AI가 상품 정보를 바탕으로 홍보 게시글을 작성하고 있습니다...");
      const textResult = await generateAffiliateContentAction({
        productId,
        tone,
        keywords,
        apiKey: openaiApiKey,
      });
      if (textResult.error) {
        setAiError(textResult.error);
        setStatusMsg(null);
        return null;
      }
      finalContent = textResult.content ?? "";
      setContent(finalContent);
    } else {
      setStatusMsg("입력된 내용을 저장하고 있습니다...");
    }

    let finalImageUrl = imageUrl;
    const prompt = imagePrompt.trim() || selectedProduct?.product_name.trim() || "";
    if (prompt && !finalImageUrl) {
      const MAX_IMAGE_ATTEMPTS = 2;
      let lastError: string | undefined;
      for (let attempt = 1; attempt <= MAX_IMAGE_ATTEMPTS; attempt += 1) {
        setStatusMsg(
          attempt === 1
            ? "게시글에 어울리는 이미지를 나노바나나로 생성하고 있습니다..."
            : `이미지 생성에 실패해서 다시 시도하고 있습니다... (${attempt}/${MAX_IMAGE_ATTEMPTS})`,
        );
        const imageResult = await generateImageAction({ prompt, apiKey: geminiApiKey, model: imageModel });
        if (imageResult.imageUrl) {
          finalImageUrl = imageResult.imageUrl;
          setImageUrl(imageResult.imageUrl);
          lastError = undefined;
          break;
        }
        lastError = imageResult.error;
      }
      if (lastError) {
        setImageGenError(lastError);
      }
    }

    setStatusMsg(null);
    return { content: finalContent, imageUrl: finalImageUrl };
  };

  const handleGenerateAll = async () => {
    setIsGeneratingAll(true);
    await runGenerateAll();
    setIsGeneratingAll(false);
  };

  const scheduledAtIso =
    publishMode === "schedule" && scheduledAtLocal
      ? new Date(scheduledAtLocal).toISOString()
      : "";

  const buildFormData = (finalContent: string, finalImageUrl: string) => {
    const fd = new FormData();
    fd.set("content", finalContent);
    fd.set("imageUrl", finalImageUrl);
    fd.set("videoFileName", "");
    fd.set("publishMode", publishMode);
    fd.set("scheduledAt", scheduledAtIso);
    fd.set("productId", productId);
    return fd;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!aiGenerateOnSubmit) {
      startTransition(() => {
        formAction(buildFormData(content, imageUrl));
      });
      return;
    }

    if (!productId) {
      setAiError("먼저 상품을 선택해주세요.");
      return;
    }

    setIsGeneratingAll(true);
    const result = await runGenerateAll();
    setIsGeneratingAll(false);
    if (!result) return;
    startTransition(() => {
      formAction(buildFormData(result.content, result.imageUrl));
    });
  };

  const disclosurePreview = selectedProduct ? DISCLOSURE_PREVIEW[selectedProduct.platform] : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
        <div>
          <label className="block text-sm font-medium text-neutral-700">AI로 글+이미지 자동 생성</label>
          <p className="text-xs text-neutral-500">
            등록된 상품을 고르고 &quot;{submitLabel}&quot;를 누르면, 그 상품의 제휴 링크를 담아 500자
            이내·반말 톤 게시글과 나노바나나 이미지가 무조건 함께 생성된 뒤 바로 저장됩니다.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">상품 선택 (필수)</label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-700"
          >
            <option value="">상품을 선택해주세요</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                [{PLATFORM_LABELS[p.platform]}] {p.product_name}
              </option>
            ))}
          </select>
          {products.length === 0 && (
            <p className="mt-1 text-xs text-amber-600">
              등록된 상품이 없습니다. &quot;상품 관리&quot; 화면에서 먼저 상품을 등록해주세요.
            </p>
          )}
        </div>

        {selectedProduct && (
          <div className="rounded-lg border border-neutral-200 bg-white p-3 text-xs text-neutral-600">
            <p>
              제휴 링크: <span className="break-all font-mono">{selectedProduct.affiliate_url}</span>
            </p>
            {disclosurePreview && (
              <p className="mt-1 text-amber-700">
                ⚠️ 캡션 끝에 아래 고지 문구가 자동으로 붙습니다(삭제 불가):
                <br />
                {disclosurePreview}
              </p>
            )}
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">답장 톤</label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as Tone)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-700"
          >
            {TONE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-neutral-500">키워드 (선택)</label>
          <Input
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={handleKeywordKeyDown}
            placeholder="키워드 입력 후 Enter (선택)"
            className="text-sm"
            autoComplete="off"
            name="ai_keyword_field"
          />
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {keywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1 rounded-md bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-700"
                >
                  #{kw}
                  <button
                    type="button"
                    onClick={() => handleRemoveKeyword(kw)}
                    className="text-neutral-500 hover:text-neutral-900"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {!aiGenerateOnSubmit && (
          <Button
            type="button"
            onClick={handleGenerateAll}
            disabled={isGeneratingAll || !productId}
          >
            {isGeneratingAll ? "생성 중..." : "✨ AI로 글+이미지 함께 생성"}
          </Button>
        )}

        {statusMsg && (
          <p className="animate-pulse rounded-md bg-neutral-900/5 px-3 py-2 text-xs font-medium text-neutral-700">
            🚀 {statusMsg}
          </p>
        )}

        <Input
          type="text"
          name="openai_key_field"
          autoComplete="new-password"
          value={openaiApiKey}
          onChange={(e) => setOpenaiApiKey(e.target.value)}
          placeholder="내 OpenAI API 키 (선택, 비워두면 설정에 저장된 키 사용)"
          className="text-xs"
          style={{ WebkitTextSecurity: "disc" } as React.CSSProperties}
        />
        {aiError && <p className="text-xs text-red-600">{aiError}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">게시글 내용</label>
        {aiGenerateOnSubmit && (
          <p className="mb-1 text-xs text-neutral-400">
            {`"${submitLabel}" 클릭 시 위 상품/톤 설정으로 자동 생성되어 채워집니다.`}
          </p>
        )}
        <Textarea
          name="content"
          rows={6}
          maxLength={500}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Threads에 게시할 내용을 입력하세요."
        />
        <p className="mt-1 text-right text-xs text-neutral-400">{content.length} / 500</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">이미지 (선택)</label>

        {selectedProduct?.image_url && (
          <div className="mb-2 flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedProduct.image_url}
              alt="상품 등록 이미지"
              className="h-14 w-14 rounded object-cover"
            />
            <div className="flex-1 text-xs text-neutral-500">
              상품 등록 시 선택한 대표 이미지가 있습니다.
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setImageUrl(selectedProduct.image_url ?? "")}
              disabled={imageUrl === selectedProduct.image_url}
            >
              {imageUrl === selectedProduct.image_url ? "사용 중" : "이 이미지 사용하기"}
            </Button>
          </div>
        )}

        <div className="mb-2 space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <label className="block text-sm font-medium text-neutral-700">
            AI로 이미지 생성 (나노바나나, 선택)
          </label>
          <div className="flex flex-wrap gap-2">
            <select
              value={imageModel}
              onChange={(e) => setImageModel(e.target.value as typeof imageModel)}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-700"
            >
              {IMAGE_MODEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Input
              className="min-w-[200px] flex-1"
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder={
                selectedProduct
                  ? `비워두면 "${selectedProduct.product_name}"를 그대로 사용합니다`
                  : "이미지 설명을 입력하세요"
              }
              autoComplete="off"
              name="ai_image_prompt_field"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleGenerateImage}
              disabled={isGeneratingImage || isGeneratingAll || (!imagePrompt.trim() && !selectedProduct)}
            >
              {isGeneratingImage ? "생성 중..." : "이미지만 다시 생성"}
            </Button>
          </div>
          <Input
            type="text"
            name="gemini_key_field"
            autoComplete="new-password"
            value={geminiApiKey}
            onChange={(e) => setGeminiApiKey(e.target.value)}
            placeholder="내 Gemini API 키 (선택, 비워두면 설정에 저장된 키 사용)"
            className="text-xs"
            style={{ WebkitTextSecurity: "disc" } as React.CSSProperties}
          />
          {imageGenError && <p className="text-xs text-red-600">{imageGenError}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading}
            className="hidden"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? "업로드 중..." : "이미지 직접 등록하기"}
          </Button>
        </div>
        {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
        <Input
          name="imageUrl"
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://example.com/image.jpg (또는 위에서 직접 업로드)"
          className="mt-2"
        />
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt="첨부 이미지 미리보기"
            className="mt-2 max-h-40 rounded-lg border border-neutral-200 object-contain"
          />
        )}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-700">게시방식 결정</label>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { value: "draft", label: "임시저장" },
              { value: "schedule", label: "예약 게시" },
              { value: "now", label: "즉시 게시" },
            ] as const
          ).map((option) => (
            <label
              key={option.value}
              className={`cursor-pointer rounded-lg border px-3 py-2 text-sm ${
                publishMode === option.value
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-300 text-neutral-600"
              }`}
            >
              <input
                type="radio"
                name="publishMode"
                value={option.value}
                checked={publishMode === option.value}
                onChange={() => setPublishMode(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
        {publishMode === "now" && !hasThreadsAccount && (
          <p className="mt-2 text-xs text-red-600">
            Threads 계정이 연결되어 있지 않아 즉시 게시할 수 없습니다. 계정 연결 후 이용해주세요.
          </p>
        )}
      </div>

      {publishMode === "schedule" && (
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">예약 시각</label>
          <Input
            type="datetime-local"
            value={scheduledAtLocal}
            onChange={(e) => setScheduledAtLocal(e.target.value)}
          />
        </div>
      )}
      <input type="hidden" name="scheduledAt" value={scheduledAtIso} />
      <input type="hidden" name="productId" value={productId} />

      {state.error && (
        <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        disabled={isPending || isGeneratingAll || (publishMode === "now" && !hasThreadsAccount)}
      >
        {isGeneratingAll ? "생성 중..." : isPending ? "처리 중..." : submitLabel}
      </Button>
    </form>
  );
}
