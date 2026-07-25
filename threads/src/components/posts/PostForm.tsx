"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { PostActionState } from "@/lib/actions/posts";
import { generateContentAction } from "@/lib/actions/ai";
import { createClient } from "@/lib/supabase/client";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type PublishMode = "draft" | "schedule" | "now";
type Tone = "casual" | "professional" | "friendly";

const TONE_OPTIONS: { value: Tone; label: string }[] = [
  { value: "casual", label: "캐주얼" },
  { value: "professional", label: "전문적" },
  { value: "friendly", label: "다정하게" },
];

interface PostFormProps {
  action: (prevState: PostActionState, formData: FormData) => Promise<PostActionState>;
  submitLabel: string;
  userId: string;
  initialContent?: string;
  initialImageUrl?: string;
  initialScheduledAtLocal?: string;
  initialPublishMode?: PublishMode;
  hasThreadsAccount: boolean;
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
  const [tone, setTone] = useState<Tone>("casual");
  const [aiError, setAiError] = useState<string | null>(null);
  const [isGenerating, startGenerating] = useTransition();

  const handleGenerate = () => {
    setAiError(null);
    startGenerating(async () => {
      const result = await generateContentAction({ topic, tone });
      if (result.error) {
        setAiError(result.error);
        return;
      }
      if (result.content) {
        setContent(result.content);
      }
    });
  };

  const scheduledAtIso =
    publishMode === "schedule" && scheduledAtLocal
      ? new Date(scheduledAtLocal).toISOString()
      : "";

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
        <label className="block text-sm font-medium text-neutral-700">AI로 초안 생성 (선택)</label>
        <div className="flex flex-wrap gap-2">
          <Input
            className="min-w-[200px] flex-1"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="주제를 입력하세요 (예: 여름 세일 프로모션)"
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
          <Button
            type="button"
            variant="secondary"
            onClick={handleGenerate}
            disabled={isGenerating || !topic.trim()}
          >
            {isGenerating ? "생성 중..." : "AI로 생성"}
          </Button>
        </div>
        {aiError && <p className="text-xs text-red-600">{aiError}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">게시글 내용</label>
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

      <Button type="submit" disabled={isPending || (publishMode === "now" && !hasThreadsAccount)}>
        {isPending ? "처리 중..." : submitLabel}
      </Button>
    </form>
  );
}
