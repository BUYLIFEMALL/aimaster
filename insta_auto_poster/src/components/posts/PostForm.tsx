"use client";

import { startTransition, useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { PostActionState } from "@/lib/actions/posts";
import {
  generateContentAction,
  generateImageAction,
  generateCardNewsContentAction,
  generateCardNewsCaptionAction,
  generateVisualPromptsAction,
} from "@/lib/actions/ai";
import { uploadCustomImageAction } from "@/lib/actions/upload";
import { ApiKeyRequiredModal } from "@/components/settings/ApiKeyRequiredModal";
import { ImageZoomModal } from "@/components/posts/ImageZoomModal";
import { PROVIDER_LABELS } from "@/lib/apiKeyLabels";
import type { ImageAspectRatio, InstaTone } from "@/lib/ai/generator";
import type { ApiKeyProvider, InstaPostType } from "@/types/database.types";

type PublishMode = "draft" | "schedule" | "now";
type Tone = InstaTone;

interface SlideDraft {
  imagePrompt: string;
  imageUrl: string;
  imageUrls: string[];
}

const TONE_OPTIONS: { value: Tone; label: string }[] = [
  { value: "전문적", label: "전문적" },
  { value: "친근함", label: "친근함" },
  { value: "설득력있는", label: "설득력있는" },
  { value: "격식있는", label: "격식있는" },
  { value: "위트있는", label: "위트있는" },
];

const SUGGESTED_TOPICS = [
  "신제품 출시 소식",
  "이번 주 트렌드 인사이트",
  "고객 후기 하이라이트",
  "업계 꿀팁 공유",
  "한정 프로모션 안내",
  "브랜드 스토리 한 조각",
];

const ASPECT_RATIO_OPTIONS: { value: ImageAspectRatio; label: string }[] = [
  { value: "9:16", label: "9:16 (세로, 기본)" },
  { value: "1:1", label: "1:1 (정사각)" },
  { value: "16:9", label: "16:9 (가로)" },
];

const IMAGE_MODEL_OPTIONS = [
  { value: "nanobanana-2-2k", label: "NanoBanana 2-2K (2K 고화질 비주얼 - 추천)" },
  { value: "nanobanana-2-4k", label: "NanoBanana 2-4K (4K 울트라 HD)" },
  { value: "nanobanana-pro", label: "NanoBanana Pro (프로페셔널 인포그래픽)" },
  { value: "nanobanana", label: "NanoBanana Standard (기본 모델)" },
] as const;

const CARD_NEWS_SLIDE_COUNT = 4;

interface PostFormProps {
  action: (prevState: PostActionState, formData: FormData) => Promise<PostActionState>;
  submitLabel: string;
  mode: "create" | "edit";
  initialPostType?: InstaPostType;
  initialCaption?: string;
  initialHashtags?: string[];
  initialScheduledAtLocal?: string;
  initialPublishMode?: PublishMode;
  hasInstagramAccount: boolean;
  // 설정에서 본인이 등록해둔 API 키 provider 목록. 등록 안 된 provider로 생성을
  // 시도하면 조용히 실패시키지 않고 팝업으로 안내한다 (관리자 공용 키로 폴백하지 않음).
  registeredProviders?: ApiKeyProvider[];
  initialTopic?: string;
  initialKeywords?: string[];
}

const initialState: PostActionState = {};

export function PostForm({
  action,
  submitLabel,
  mode,
  initialPostType = "feed",
  initialCaption = "",
  initialHashtags = [],
  initialScheduledAtLocal = "",
  initialPublishMode = "draft",
  hasInstagramAccount,
  registeredProviders = [],
  initialTopic = "",
  initialKeywords = [],
}: PostFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [postType, setPostType] = useState<InstaPostType>(initialPostType);
  const [publishMode, setPublishMode] = useState<PublishMode>(initialPublishMode);
  const [scheduledAtLocal, setScheduledAtLocal] = useState(initialScheduledAtLocal);
  const [caption, setCaption] = useState(initialCaption);
  const [hashtags, setHashtags] = useState(initialHashtags.join(" "));

  const isCreate = mode === "create";

  const [topic, setTopic] = useState(initialTopic);
  const [tone, setTone] = useState<Tone>("친근함");
  const [keywordInput, setKeywordInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>(initialKeywords);
  const [referenceUrls, setReferenceUrls] = useState<string[]>(["", "", ""]);
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [missingKeyModal, setMissingKeyModal] = useState<string[] | null>(null);

  const registeredSet = new Set(registeredProviders);
  // 캡션/원고 생성은 항상 OpenAI, 이미지 생성은 항상 Gemini가 필요하다. 폼에 직접
  // 키를 입력해둔 경우(선택 필드)는 그것도 "본인 키 있음"으로 인정한다.
  const findMissingProviders = (): string[] => {
    const missing: string[] = [];
    if (!registeredSet.has("openai") && !openaiApiKey.trim()) missing.push(PROVIDER_LABELS.openai);
    if (!registeredSet.has("gemini") && !geminiApiKey.trim()) missing.push(PROVIDER_LABELS.gemini);
    return missing;
  };

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
  const handleReferenceUrlChange = (index: number, value: string) => {
    setReferenceUrls((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const [imageModel, setImageModel] = useState<(typeof IMAGE_MODEL_OPTIONS)[number]["value"]>(
    "nanobanana-2-2k",
  );
  const [aspectRatio, setAspectRatio] = useState<ImageAspectRatio>("9:16");
  const [geminiApiKey, setGeminiApiKey] = useState("");

  // 카드뉴스는 4개, 피드는 1개 슬라이드를 관리한다 (insta_post_slides 1행 = 1슬라이드와 동일 개념).
  const [slides, setSlides] = useState<SlideDraft[]>([]);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [, startRegenerating] = useTransition();

  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  async function generateOneImage(prompt: string): Promise<string | null> {
    const MAX_ATTEMPTS = 2;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const result = await generateImageAction({
        prompt,
        apiKey: geminiApiKey,
        model: imageModel,
        aspectRatio,
      });
      if (result.imageUrl) return result.imageUrl;
    }
    return null;
  }

  const generateSlideImages = async (
    sourceText: string,
    slideCount: number,
  ): Promise<SlideDraft[] | null> => {
    setStatusMsg("본문을 분석해서 이미지 프롬프트를 만들고 있습니다...");
    const promptsResult = await generateVisualPromptsAction({ text: sourceText, slideCount, apiKey: openaiApiKey });
    if (promptsResult.error || !promptsResult.slides || promptsResult.slides.length === 0) {
      setAiError(promptsResult.error ?? "이미지 프롬프트 생성에 실패했습니다.");
      setStatusMsg(null);
      return null;
    }

    const nextSlides: SlideDraft[] = [];
    for (let i = 0; i < promptsResult.slides.length; i += 1) {
      setStatusMsg(
        slideCount > 1
          ? `슬라이드 이미지 ${i + 1}/${promptsResult.slides.length}를 생성하고 있습니다...`
          : "나노바나나로 이미지를 생성하고 있습니다...",
      );
      const imageUrl = await generateOneImage(promptsResult.slides[i].imagePrompt);
      if (!imageUrl) {
        setAiError(`슬라이드 ${i + 1} 이미지 생성에 실패했습니다. 다시 시도해주세요.`);
        setStatusMsg(null);
        return null;
      }
      nextSlides.push({ imagePrompt: promptsResult.slides[i].imagePrompt, imageUrl, imageUrls: [imageUrl] });
      setSlides([...nextSlides]);
    }
    return nextSlides;
  };

  const runGenerateAll = async (): Promise<{ caption: string; hashtags: string; slides: SlideDraft[] } | null> => {
    setAiError(null);
    const validReferenceUrls = referenceUrls.map((u) => u.trim()).filter((u) => u.length > 0);
    const alreadyHasCaption = caption.trim().length > 0;

    // 게시글 주제 수집(/candidates)에서 넘어온 캡션은 이제 그 자체로 900~1400자짜리
    // 장문 소스 콘텐츠다(collector.ts 참고) — 짧은 완성 캡션이 아니라 "재료"로 취급한다.
    const seedContent = alreadyHasCaption ? caption.trim() : "";

    if (postType === "card_news") {
      let title = topic;
      let content = seedContent;

      if (!seedContent) {
        setStatusMsg("카드뉴스 원고를 생성하고 있습니다...");
        const contentResult = await generateCardNewsContentAction({
          topic,
          keywords,
          referenceUrls: validReferenceUrls,
          apiKey: openaiApiKey,
        });
        if (contentResult.error || !contentResult.content) {
          setAiError(contentResult.error ?? "카드뉴스 원고 생성에 실패했습니다.");
          setStatusMsg(null);
          return null;
        }
        title = contentResult.title ?? topic;
        content = contentResult.content;
      }

      setStatusMsg("인스타그램 카드뉴스용 캡션(900~1400자)으로 재가공하고 있습니다...");
      const captionResult = await generateCardNewsCaptionAction({
        title,
        content,
        apiKey: openaiApiKey,
      });
      if (captionResult.error || !captionResult.caption) {
        setAiError(captionResult.error ?? "캡션 생성에 실패했습니다.");
        setStatusMsg(null);
        return null;
      }
      const finalCaption = captionResult.caption;
      const finalHashtags = (captionResult.hashtags ?? []).join(" ");
      setCaption(finalCaption);
      setHashtags(finalHashtags);

      const nextSlides = await generateSlideImages(content, CARD_NEWS_SLIDE_COUNT);
      if (!nextSlides) return null;

      setStatusMsg(null);
      return { caption: finalCaption, hashtags: finalHashtags, slides: nextSlides };
    }

    // 피드: 짧은 캡션(450자 내외) 하나면 충분하다. 후보에서 넘어온 장문 소스가 있으면
    // 그걸 근거로 압축해서 짧은 캡션을 새로 뽑고, 없으면 주제만으로 생성한다.
    setStatusMsg(
      seedContent
        ? "수집된 콘텐츠를 압축해서 인스타그램 캡션으로 재가공하고 있습니다..."
        : "AI가 인스타그램 트렌드를 분석해서 캡션을 작성하고 있습니다...",
    );
    const textResult = await generateContentAction({
      topic,
      tone,
      keywords,
      referenceUrls: validReferenceUrls,
      sourceContent: seedContent || undefined,
      cta: ctaUrl.trim() ? { text: ctaText.trim(), url: ctaUrl.trim() } : undefined,
      apiKey: openaiApiKey,
    });
    if (textResult.error || !textResult.caption) {
      setAiError(textResult.error ?? "캡션 생성에 실패했습니다.");
      setStatusMsg(null);
      return null;
    }
    const finalCaption = textResult.caption;
    const finalHashtags = (textResult.hashtags ?? []).join(" ");
    setCaption(finalCaption);
    setHashtags(finalHashtags);

    const nextSlides = await generateSlideImages(finalCaption, 1);
    if (!nextSlides) return null;

    setStatusMsg(null);
    return { caption: finalCaption, hashtags: finalHashtags, slides: nextSlides };
  };

  const handleRegenerateSlide = (index: number) => {
    const current = slides[index];
    if (!current) return;
    setRegeneratingIndex(index);
    startRegenerating(async () => {
      const imageUrl = await generateOneImage(current.imagePrompt);
      if (imageUrl) {
        setSlides((prev) =>
          prev.map((s, i) => (i === index ? { ...s, imageUrl, imageUrls: [...s.imageUrls, imageUrl] } : s)),
        );
      } else {
        setAiError(`슬라이드 ${index + 1} 이미지 재생성에 실패했습니다.`);
      }
      setRegeneratingIndex(null);
    });
  };

  const handleSlidePromptChange = (index: number, value: string) => {
    setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, imagePrompt: value } : s)));
  };

  const handleSelectSlideImage = (index: number, url: string) => {
    setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, imageUrl: url } : s)));
  };

  const handleUploadSlideImage = (index: number, file: File) => {
    setRegeneratingIndex(index);
    startRegenerating(async () => {
      const fd = new FormData();
      fd.set("file", file);
      const result = await uploadCustomImageAction(fd);
      if (result.imageUrl) {
        const url = result.imageUrl;
        setSlides((prev) =>
          prev.map((s, i) => (i === index ? { ...s, imageUrl: url, imageUrls: [...s.imageUrls, url] } : s)),
        );
      } else {
        setAiError(result.error ?? "이미지 업로드에 실패했습니다.");
      }
      setRegeneratingIndex(null);
    });
  };

  const [zoomTarget, setZoomTarget] = useState<{ index: number; url: string } | null>(null);

  const scheduledAtIso =
    publishMode === "schedule" && scheduledAtLocal ? new Date(scheduledAtLocal).toISOString() : "";

  const buildFormData = (finalCaption: string, finalHashtags: string, finalSlides: SlideDraft[]) => {
    const fd = new FormData();
    fd.set("postType", postType);
    fd.set("caption", finalCaption);
    fd.set("hashtags", finalHashtags);
    fd.set("slidesJson", JSON.stringify(finalSlides));
    fd.set("publishMode", publishMode);
    fd.set("scheduledAt", scheduledAtIso);
    return fd;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isCreate) {
      // 수정 화면: 슬라이드는 별도 액션으로 이미 반영돼 있으므로 캡션/발행 정보만 제출한다.
      startTransition(() => {
        formAction(buildFormData(caption, hashtags, slides));
      });
      return;
    }

    if (!topic.trim()) {
      setAiError("주제를 입력해주세요.");
      return;
    }

    const missing = findMissingProviders();
    if (missing.length > 0) {
      setMissingKeyModal(missing);
      return;
    }

    setIsGeneratingAll(true);
    const result = await runGenerateAll();
    setIsGeneratingAll(false);
    if (!result) return;
    startTransition(() => {
      formAction(buildFormData(result.caption, result.hashtags, result.slides));
    });
  };

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-5">
      {isCreate && (
        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-700">게시물 형식</label>
          <div className="flex gap-2">
            {(
              [
                { value: "feed", label: "피드 (이미지 1장)" },
                { value: "card_news", label: "카드뉴스 (캐러셀 4장)" },
              ] as const
            ).map((option) => (
              <label
                key={option.value}
                className={`cursor-pointer rounded-lg border px-3 py-2 text-sm ${
                  postType === option.value
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 text-neutral-600"
                }`}
              >
                <input
                  type="radio"
                  name="postTypeRadio"
                  value={option.value}
                  checked={postType === option.value}
                  onChange={() => {
                    setPostType(option.value);
                    setSlides([]);
                  }}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>
      )}
      {isCreate && (
        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-700">화면비율</label>
          <div className="flex gap-2">
            {ASPECT_RATIO_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`cursor-pointer rounded-lg border px-3 py-2 text-sm ${
                  aspectRatio === option.value
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 text-neutral-600"
                }`}
              >
                <input
                  type="radio"
                  name="aspectRatioRadio"
                  value={option.value}
                  checked={aspectRatio === option.value}
                  onChange={() => setAspectRatio(option.value)}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-neutral-400">
            4장 모두 이 비율로 생성됩니다. 인스타그램은 세로(9:16)가 기본으로 유리합니다.
          </p>
        </div>
      )}
      {isCreate && (
        <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700">
              AI로 {postType === "card_news" ? "카드뉴스 원고+이미지 4장" : "캡션+이미지"} 자동 생성
            </label>
            <p className="text-xs text-neutral-500">
              {`주제나 키워드를 입력하고 아래 "${submitLabel}"를 누르면 인스타그램 톤(반말)의 캡션과 나노바나나 이미지가 함께 생성된 뒤 바로 저장됩니다.`}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">주제 (필수)</label>
            <div className="flex flex-wrap gap-2">
              <Input
                className="min-w-[200px] flex-1"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="주제를 입력하세요 (예: 여름 세일 프로모션)"
                autoComplete="off"
                name="ai_topic_field"
              />
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
          </div>

          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_TOPICS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTopic(item)}
                className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-600 transition-colors hover:border-neutral-400 hover:text-neutral-900"
              >
                {item}
              </button>
            ))}
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

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-neutral-500">참고 웹페이지 링크 (선택)</label>
              <span className="text-[11px] text-neutral-400">최대 3개</span>
            </div>
            <div className="space-y-1.5">
              {referenceUrls.map((url, idx) => (
                <Input
                  key={idx}
                  type="text"
                  name={`ai_reference_url_field_${idx + 1}`}
                  autoComplete="off"
                  value={url}
                  onChange={(e) => handleReferenceUrlChange(idx, e.target.value)}
                  placeholder={`https://example.com/reference-${idx + 1}`}
                  className="text-sm"
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            <label className="block text-xs font-medium text-neutral-500">
              🔗 홍보 링크 (선택) — 캡션 하단에 자연스럽게 삽입됩니다
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input
                type="text"
                name="cta_text_field"
                autoComplete="off"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                placeholder="추천 문구 (예: 지금 바로 확인하기)"
                className="text-sm"
              />
              <Input
                type="url"
                name="cta_url_field"
                autoComplete="off"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                placeholder="https://example.com/offer"
                className="text-sm"
              />
            </div>
          </div>

          {statusMsg && (
            <p className="animate-pulse rounded-md bg-neutral-900/5 px-3 py-2 text-xs font-medium text-neutral-700">
              🚀 {statusMsg}
            </p>
          )}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
              type="text"
              name="gemini_key_field"
              autoComplete="new-password"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              placeholder="내 Gemini API 키 (선택, 비워두면 설정에 저장된 키 사용)"
              className="text-xs"
              style={{ WebkitTextSecurity: "disc" } as React.CSSProperties}
            />
          </div>
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
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">캡션</label>
        {isCreate && (
          <p className="mb-1 text-xs text-neutral-400">
            {`"${submitLabel}" 클릭 시 위 AI 설정으로 자동 생성되어 채워집니다.`}
          </p>
        )}
        <Textarea
          name="caption"
          rows={14}
          maxLength={2200}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="인스타그램에 게시할 캡션을 입력하세요."
        />
        <p className="mt-1 text-right text-xs text-neutral-400">
          {caption.length} / {postType === "card_news" ? "1400자 권장 (최대 2200)" : "450자 권장 (최대 2200)"}
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">해시태그 (선택)</label>
        <Input
          name="hashtags"
          value={hashtags}
          onChange={(e) => setHashtags(e.target.value)}
          placeholder="공백으로 구분 (예: 다이어트팁 여름세일)"
        />
        <p className="mt-1 text-xs text-neutral-400">캡션 아래에 자동으로 #과 함께 붙어서 게시됩니다.</p>
      </div>

      {isCreate && (
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            {postType === "card_news" ? `이미지 (필수, ${CARD_NEWS_SLIDE_COUNT}장)` : "이미지 (필수, 1장)"}
          </label>
          <p className="mb-2 text-xs text-neutral-400">
            인스타그램 게시물은 이미지가 반드시 있어야 합니다. 위 &quot;{submitLabel}&quot;를 누르면 자동으로
            채워지고, 생성 후에는 이미지를 클릭해 확대해서 확인하거나, 프롬프트를 고쳐 개별 재생성하거나,
            {postType === "feed" && " 직접 가진 이미지 파일을 올려서 쓰거나, "}이전에 생성했던 후보 중에서
            골라 쓸 수 있습니다.
          </p>
          {slides.length === 0 ? (
            <p className="rounded-lg border border-dashed border-neutral-300 p-4 text-center text-sm text-neutral-400">
              아직 생성된 이미지가 없습니다.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {slides.map((slide, index) => (
                <div key={index} className="space-y-2 rounded-lg border border-neutral-200 bg-white p-3">
                  <button
                    type="button"
                    onClick={() => setZoomTarget({ index, url: slide.imageUrl })}
                    className="mx-auto block w-full max-w-sm"
                    title="클릭하면 확대해서 볼 수 있습니다"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slide.imageUrl}
                      alt={`슬라이드 ${index + 1}`}
                      className="aspect-square w-full rounded-md object-cover"
                    />
                  </button>
                  <Textarea
                    rows={10}
                    value={slide.imagePrompt}
                    onChange={(e) => handleSlidePromptChange(index, e.target.value)}
                    className="text-xs leading-relaxed"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full text-xs"
                    onClick={() => handleRegenerateSlide(index)}
                    disabled={regeneratingIndex === index || isGeneratingAll}
                  >
                    {regeneratingIndex === index ? "생성/업로드 중..." : `슬라이드 ${index + 1} 다시 생성`}
                  </Button>

                  {postType === "feed" && (
                    <label className="block cursor-pointer rounded-lg border border-dashed border-neutral-300 px-2 py-1.5 text-center text-xs text-neutral-500 hover:border-neutral-400">
                      이미지 파일 직접 첨부 (JPG/PNG/WEBP, 10MB 이하)
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        disabled={regeneratingIndex === index || isGeneratingAll}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadSlideImage(index, file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}

                  {slide.imageUrls.length > 1 && (
                    <div>
                      <p className="mb-1 text-[11px] text-neutral-400">생성/업로드 이력 (클릭해서 선택)</p>
                      <div className="flex flex-wrap gap-1.5">
                        {slide.imageUrls.map((url) => {
                          const isSelected = url === slide.imageUrl;
                          return (
                            <div key={url} className="relative">
                              <button
                                type="button"
                                onClick={() => handleSelectSlideImage(index, url)}
                                disabled={isSelected}
                                className={`relative h-14 w-14 overflow-hidden rounded-md border-2 ${
                                  isSelected ? "border-blue-500" : "border-transparent"
                                }`}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt="후보 이미지" className="h-full w-full object-cover" />
                                {isSelected && (
                                  <span className="absolute inset-0 flex items-center justify-center bg-blue-500/30 text-[9px] font-medium text-white">
                                    선택됨
                                  </span>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => setZoomTarget({ index, url })}
                                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900/80 text-[10px] text-white"
                                title="확대해서 보기"
                              >
                                🔍
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
        {publishMode === "now" && !hasInstagramAccount && (
          <p className="mt-2 text-xs text-red-600">
            인스타그램 계정이 연결되어 있지 않아 즉시 게시할 수 없습니다. 계정 연결 후 이용해주세요.
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

      {state.error && (
        <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        disabled={isPending || isGeneratingAll || (publishMode === "now" && !hasInstagramAccount)}
      >
        {isGeneratingAll ? "생성 중..." : isPending ? "처리 중..." : submitLabel}
      </Button>
    </form>
    {missingKeyModal && (
      <ApiKeyRequiredModal missingLabels={missingKeyModal} onClose={() => setMissingKeyModal(null)} />
    )}
    {zoomTarget && (
      <ImageZoomModal
        imageUrl={zoomTarget.url}
        title={`슬라이드 ${zoomTarget.index + 1}`}
        isActive={zoomTarget.url === slides[zoomTarget.index]?.imageUrl}
        onSelect={() => {
          handleSelectSlideImage(zoomTarget.index, zoomTarget.url);
          setZoomTarget(null);
        }}
        onClose={() => setZoomTarget(null)}
      />
    )}
    </>
  );
}
