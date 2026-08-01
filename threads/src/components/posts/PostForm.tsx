"use client";

import { startTransition, useActionState, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { PostActionState } from "@/lib/actions/posts";
import { generateContentAction, generateImageAction } from "@/lib/actions/ai";
import { createClient } from "@/lib/supabase/client";
import type { ThreadsTone } from "@/lib/ai/generator";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type PublishMode = "draft" | "schedule" | "now";
type Tone = ThreadsTone;

// blog(AutoBlog) AI 글쓰기 폼과 동일한 5가지 톤 옵션
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

// blog(AutoBlog)의 나노바나나 4종 모델 옵션과 동일하게 맞춘 구성
const IMAGE_MODEL_OPTIONS = [
  { value: "nanobanana-2-2k", label: "NanoBanana 2-2K (2K 고화질 비주얼 - 추천)" },
  { value: "nanobanana-2-4k", label: "NanoBanana 2-4K (4K 울트라 HD)" },
  { value: "nanobanana-pro", label: "NanoBanana Pro (프로페셔널 인포그래픽)" },
  { value: "nanobanana", label: "NanoBanana Standard (기본 모델)" },
] as const;

interface PostFormProps {
  action: (prevState: PostActionState, formData: FormData) => Promise<PostActionState>;
  submitLabel: string;
  userId: string;
  initialContent?: string;
  initialImageUrl?: string;
  initialScheduledAtLocal?: string;
  initialPublishMode?: PublishMode;
  hasThreadsAccount: boolean;
  // true면 별도 "생성" 버튼 없이, 제출(생성하기) 버튼 클릭 시 텍스트+이미지를
  // 무조건 함께 생성한 뒤 그 결과로 저장까지 한 번에 처리한다 (새 글 작성 전용).
  aiGenerateOnSubmit?: boolean;
}

const initialState: PostActionState = {};

export function PostForm({
  action,
  submitLabel,
  userId,
  initialContent = "",
  initialImageUrl = "",
  initialScheduledAtLocal = "",
  initialPublishMode = "draft",
  hasThreadsAccount,
  aiGenerateOnSubmit = false,
}: PostFormProps) {
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

  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState<Tone>("친근함");
  const [keywordInput, setKeywordInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [referenceUrls, setReferenceUrls] = useState<string[]>(["", "", ""]);
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);

  const handleReferenceUrlChange = (index: number, value: string) => {
    setReferenceUrls((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
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

  const [imagePrompt, setImagePrompt] = useState("");
  const [imageModel, setImageModel] = useState<(typeof IMAGE_MODEL_OPTIONS)[number]["value"]>(
    "nanobanana-2-2k",
  );
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [isGeneratingImage, startGeneratingImage] = useTransition();
  const [imageGenError, setImageGenError] = useState<string | null>(null);

  const handleGenerateImage = () => {
    const prompt = imagePrompt.trim() || topic.trim();
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

  // blog(AutoBlog)의 "AI 글 생성 시작" 방식처럼, 주제만 주면 게시글 본문과
  // 이미지를 한 번에 자동 생성한다 (텍스트 생성 후 이어서 이미지 생성).
  // useTransition이 아닌 일반 state로 관리한다: formAction(서버 액션 dispatch)을
  // 별도 startTransition 콜백 안에 중첩 호출하면 redirect()가 정상 처리되지
  // 않는 문제가 있어(저장은 되지만 화면 전환이 안 됨), handleSubmit 자체의
  // async 흐름에서 곧바로 호출해야 한다.
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const runGenerateAll = async (): Promise<{ content: string; imageUrl: string } | null> => {
    setAiError(null);
    setImageGenError(null);
    const validReferenceUrls = referenceUrls.map((u) => u.trim()).filter((u) => u.length > 0);

    setStatusMsg("AI가 Threads 트렌드를 분석해서 게시글을 작성하고 있습니다...");
    const textResult = await generateContentAction({
      topic,
      tone,
      keywords,
      referenceUrls: validReferenceUrls,
      apiKey: openaiApiKey,
    });
    if (textResult.error) {
      setAiError(textResult.error);
      setStatusMsg(null);
      return null;
    }
    const finalContent = textResult.content ?? "";
    setContent(finalContent);

    let finalImageUrl = imageUrl;
    const prompt = imagePrompt.trim() || topic.trim();
    if (prompt) {
      // 나노바나나가 프롬프트에 따라(안전 필터/모델 판단 등) 이미지를 못
      // 돌려주는 경우가 종종 있어, 완전히 포기하기 전에 한 번 더 시도한다.
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
        // 재시도까지 실패해도 텍스트는 이미 성공했으므로 전체를 막지 않는다
        setImageGenError(lastError);
      }
    }

    setStatusMsg(null);
    return { content: finalContent, imageUrl: finalImageUrl };
  };

  // handleGenerateAll: 수정 화면에서만 노출되는 수동 "함께 생성" 버튼용
  // (aiGenerateOnSubmit=false일 때). 새 글 작성에서는 제출 시 자동으로 실행됨.
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
    fd.set("publishMode", publishMode);
    fd.set("scheduledAt", scheduledAtIso);
    return fd;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!aiGenerateOnSubmit) {
      // formAction(useActionState의 dispatch)은 반드시 startTransition 안에서
      // 호출해야 한다 (React 19 요구사항 — 그렇지 않으면 redirect()가 정상
      // 처리되지 않고 저장만 되고 화면 전환이 안 되는 문제가 있었다).
      startTransition(() => {
        formAction(buildFormData(content, imageUrl));
      });
      return;
    }

    if (!topic.trim()) {
      setAiError("주제를 입력해주세요.");
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

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
        <div>
          <label className="block text-sm font-medium text-neutral-700">AI로 글+이미지 자동 생성</label>
          <p className="text-xs text-neutral-500">
            {aiGenerateOnSubmit
              ? `주제나 키워드를 입력하고 아래 "${submitLabel}"를 누르면, Threads 트렌드에 맞춰 500자 이내·반말 톤 게시글과 나노바나나 이미지가 무조건 함께 생성된 뒤 바로 저장됩니다.`
              : "주제나 키워드를 주면 Threads 트렌드에 맞춰 500자 이내, 반말 톤으로 게시글을 쓰고, 이어서 나노바나나로 어울리는 이미지까지 함께 생성합니다."}
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

        {!aiGenerateOnSubmit && (
          <Button
            type="button"
            onClick={handleGenerateAll}
            disabled={isGeneratingAll || !topic.trim()}
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
            {`"${submitLabel}" 클릭 시 위 AI 설정으로 자동 생성되어 채워집니다.`}
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
              placeholder={topic ? `비워두면 "${topic}" 주제를 그대로 사용합니다` : "이미지 설명을 입력하세요"}
              autoComplete="off"
              name="ai_image_prompt_field"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleGenerateImage}
              disabled={isGeneratingImage || isGeneratingAll || (!imagePrompt.trim() && !topic.trim())}
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
            className="text-sm text-neutral-600"
          />
          {isUploading && <span className="text-xs text-neutral-500">업로드 중...</span>}
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
        <label className="mb-2 block text-sm font-medium text-neutral-700">게시 방식</label>
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
