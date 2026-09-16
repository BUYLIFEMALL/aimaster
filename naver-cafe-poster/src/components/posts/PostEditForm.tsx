"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { createClient } from "@/lib/supabase/client";
import { updateAndRepublishPostAction, type PostActionState } from "@/lib/actions/posts";
import { generateCafeImageAction, generateCafeImagePromptAction } from "@/lib/actions/ai";
import type { CafePost, CafeTarget, PostStatus } from "@/types/post";

const initialState: PostActionState = {};

// DraftItem.tsx의 영상 첨부 규격(threads-affiliate-poster 기준 1GB)과 동일하게 맞춘다 —
// 네이버 카페 오픈API의 공식 영상 첨부 규격은 문서로 확인 못 했다.
const MAX_VIDEO_BYTES = 1024 * 1024 * 1024;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

const IMAGE_MODEL_OPTIONS = [
  { label: "NanoBanana 2-2K (2K 고화질 비주얼 - 추천)", value: "nanobanana-2-2k" },
  { label: "NanoBanana 2-4K (4K 울트라 HD)", value: "nanobanana-2-4k" },
  { label: "NanoBanana Pro (프로페셔널 인포그래픽)", value: "nanobanana-pro" },
  { label: "NanoBanana Standard (기본 모델)", value: "nanobanana" },
] as const;

/** 네이버 카페 오픈API는 content를 그대로 HTML로 저장하고(<p>로 감싸짐), 속성이 있는
 * HTML 태그(<img src=...>, <a href=...> 등)가 섞이면 403으로 거부한다는 것을 실계정
 * 테스트로 이미 확인했다(publish-core.ts 참고) — 그래서 이 에디터는 실제로 검증되지
 * 않은 굵게/기울임 같은 HTML 서식 버튼은 넣지 않는다. 대신 실제로 카페에 그대로 반영되는
 * "일반 텍스트 + 줄바꿈(<br>)" 모델에 맞는 서식 도구만 제공한다(네이버 스마트에디터의
 * 툴바 구성을 참고하되, 실제로 결과에 반영되는 것만 골랐다 — 2026-09-13 요청).
 */
const TEXT_ACTIONS: { icon: string; label: string; title: string; before: string; after?: string }[] = [
  { icon: "¶", label: "문단", title: "문단을 나눕니다", before: "\n\n" },
  { icon: "―", label: "구분선", title: "구분선을 추가합니다", before: "\n──────────\n" },
  { icon: "•", label: "목록", title: "글머리 기호 목록을 추가합니다", before: "\n• " },
  { icon: "①", label: "번호목록", title: "번호 목록을 추가합니다", before: "\n1. " },
  { icon: "❝", label: "인용구", title: "인용구 스타일 줄을 추가합니다", before: "\n❝ ", after: " ❞" },
  { icon: "★", label: "강조", title: "선택한 글자를 【 】로 감쌉니다", before: "【", after: "】" },
  { icon: "📢", label: "안내", title: "안내 문구용 이모지를 추가합니다", before: "\n📢 " },
];

// cafeGenerator.ts/publish-core.ts와 동일한 CTA 형식("\n\n📢 문구 URL", 같은 줄 공백 하나)을
// 그대로 따른다 — 이미 CTA가 붙어있는 글을 수정 모드로 열면 본문에서 분리해 별도 입력칸으로
// 보여주고, 저장 시 같은 형식으로 다시 합쳐서 보낸다("추천 링크 기능도 추가해달라",
// 2026-09-13 요청).
const CTA_SUFFIX_PATTERN = /\r?\n\r?\n📢 (.+) (\S+)\s*$/;

function splitInitialCta(raw: string): { body: string; ctaText: string; ctaUrl: string } {
  const match = raw.match(CTA_SUFFIX_PATTERN);
  if (!match) return { body: raw, ctaText: "", ctaUrl: "" };
  const [full, ctaText, ctaUrl] = match;
  return { body: raw.slice(0, raw.length - full.length), ctaText, ctaUrl };
}

function buildFinalContent(body: string, ctaText: string, ctaUrl: string): string {
  if (!ctaText.trim() || !ctaUrl.trim()) return body;
  return `${body}\n\n📢 ${ctaText.trim()} ${ctaUrl.trim()}`;
}

export function PostEditForm({ post, targets }: { post: CafePost; targets: CafeTarget[] }) {
  const [state, formAction, isPending] = useActionState(updateAndRepublishPostAction, initialState);
  const [title, setTitle] = useState(post.title);
  const initialSplit = useState(() => splitInitialCta(post.content))[0];
  const [content, setContent] = useState(initialSplit.body);
  const [ctaText, setCtaText] = useState(initialSplit.ctaText || "추천링크");
  const [ctaUrl, setCtaUrl] = useState(initialSplit.ctaUrl);
  const [targetId, setTargetId] = useState(post.target_id ?? "");
  const [imageUrl, setImageUrl] = useState(post.image_url ?? "");
  const [videoUrl, setVideoUrl] = useState(post.video_url ?? "");
  // "이미지 다시 생성"을 누를 때마다 기존 이미지를 덮어쓰지 않고 후보로 함께 쌓아둔다 —
  // 여러 시안 중 마음에 드는 것을 직접 골라서 게시에 쓸 수 있게 한다(사용자 요청, 2026-09-16).
  const [imageOptions, setImageOptions] = useState<string[]>(post.image_url ? [post.image_url] : []);
  const addImageOption = (url: string) => {
    if (!url) return;
    setImageOptions((prev) => (prev.includes(url) ? prev : [...prev, url]));
  };
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null);

  // AI 이미지 (재)생성 — DraftItem.tsx/DraftComposer.tsx와 동일한 나노바나나 패턴을
  // 그대로 가져왔다("이미지를 새로 AI로 생성하거나 직접 추가한 이미지/영상 링크로 최종
  // 결과물을 만들 수 있게 해달라"는 요청, 2026-09-13).
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageModel, setImageModel] = useState("nanobanana-2-2k");
  const [imageApiKey, setImageApiKey] = useState("");
  const [imageEndpoint, setImageEndpoint] = useState("");
  const [imageGenError, setImageGenError] = useState<string | null>(null);
  const [isGeneratingImage, startGeneratingImage] = useTransition();

  const contentRef = useRef<HTMLTextAreaElement>(null);
  // 툴바의 "🖼 사진"/"🎬 동영상" 버튼이 여는 실제 파일 선택창(숨김 input) — 아래 URL
  // 입력칸(링크로 직접 붙여넣기)과는 별개다: 하나는 "파일 첨부", 하나는 "링크 입력".
  const imageFileRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);

  const status = post.status as PostStatus;

  const insertAtCursor = (before: string, after = "") => {
    const el = contentRef.current;
    if (!el) {
      setContent((prev) => `${prev}${before}${after}`);
      return;
    }
    const start = el.selectionStart ?? content.length;
    const end = el.selectionEnd ?? content.length;
    const selected = content.slice(start, end);
    const next = content.slice(0, start) + before + selected + after + content.slice(end);
    setContent(next);
    const cursorPos = start + before.length + selected.length + after.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursorPos, cursorPos);
    });
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (imageFileRef.current) imageFileRef.current.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setImageUploadError("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageUploadError("이미지 크기는 20MB를 넘을 수 없습니다.");
      return;
    }

    setImageUploadError(null);
    setIsUploadingImage(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${post.user_id}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage.from("post-images").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;

      const { data } = supabase.storage.from("post-images").getPublicUrl(path);
      setImageUrl(data.publicUrl);
      addImageOption(data.publicUrl);
      setVideoUrl(""); // 이미지/영상은 서로 배타적으로 관리한다(DraftItem.tsx와 동일)
    } catch (err) {
      setImageUploadError(err instanceof Error ? err.message : "업로드에 실패했습니다.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (videoFileRef.current) videoFileRef.current.value = "";
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setVideoUploadError("영상 파일만 업로드할 수 있습니다.");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setVideoUploadError("영상 크기는 1GB를 넘을 수 없습니다.");
      return;
    }

    setVideoUploadError(null);
    setIsUploadingVideo(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "mp4";
      const path = `${post.user_id}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage.from("post-images").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;

      const { data } = supabase.storage.from("post-images").getPublicUrl(path);
      setVideoUrl(data.publicUrl);
      setImageUrl("");
    } catch (err) {
      setVideoUploadError(err instanceof Error ? err.message : "업로드에 실패했습니다.");
    } finally {
      setIsUploadingVideo(false);
    }
  };

  /** 나노바나나(Gemini)가 같은 프롬프트에도 가끔 이미지 없이 응답하는 비결정적 특성이 있어서
   * DraftItem.tsx/DraftComposer.tsx와 동일하게 최대 2회까지 자동 재시도한다. */
  const runImageGeneration = async (prompt: string) => {
    const MAX_IMAGE_ATTEMPTS = 2;
    let lastError: string | undefined;
    for (let attempt = 1; attempt <= MAX_IMAGE_ATTEMPTS; attempt += 1) {
      const result = await generateCafeImageAction({
        prompt,
        apiKey: imageApiKey.trim() || undefined,
        model: imageModel as never,
        endpoint: imageEndpoint.trim() || undefined,
      });
      if (result.imageUrl) {
        setImageUrl(result.imageUrl);
        addImageOption(result.imageUrl);
        setVideoUrl(""); // 이미지/영상은 서로 배타적으로 관리한다
        lastError = undefined;
        break;
      }
      lastError = result.error;
    }
    if (lastError) setImageGenError(lastError);
  };

  const handleGenerateImage = () => {
    setImageGenError(null);
    startGeneratingImage(async () => {
      // 프롬프트를 직접 안 적었으면, 지금 편집 중인 제목/본문을 분석해서 이미지 프롬프트를
      // 자동으로 만든다(DraftComposer와 동일한 흐름).
      let prompt = imagePrompt.trim();
      if (!prompt) {
        const promptResult = await generateCafeImagePromptAction({ title, content });
        if (promptResult.error && !promptResult.prompt) {
          setImageGenError(promptResult.error);
          return;
        }
        prompt = promptResult.prompt || title;
        if (promptResult.prompt) setImagePrompt(promptResult.prompt);
      }
      await runImageGeneration(prompt);
    });
  };

  const charCount = content.length;

  return (
    <form action={formAction} className="space-y-0">
      <input type="hidden" name="postId" value={post.id} />

      {/* 네이버 스마트에디터 스타일 — 상단 고정 헤더 + 아이콘 툴바 + 넓은 단일 캔버스
          (2026-09-13 요청: "네이버 편집기 스타일로", 미리보기 패널은 제거). */}
      <div className="sticky top-0 z-10 -mx-4 mb-4 flex items-center gap-2 border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <Link href={`/posts/${post.id}`} className="text-sm font-medium text-neutral-500 hover:text-neutral-900">
          ← 취소
        </Link>
        <span className="text-sm font-bold text-neutral-900">✏️ 게시글 편집기</span>
      </div>

      {state.error && <p className="mb-4 text-xs text-red-600">{state.error}</p>}

      {status === "published" && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          이미 카페에 게시된 글입니다. 네이버 오픈API에는 수정 기능이 없어, 저장하면 카페에{" "}
          <b>새 글로 다시 게시</b>됩니다 — 기존에 올라간 글은 그대로 남아있으니 필요하면 카페에서
          직접 삭제/수정해주세요.
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2 rounded-xl border border-neutral-200 bg-neutral-50/80 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-700">📁 등록할 카페 선택</p>
            <span className="rounded-md border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-600">
              {targetId ? "1개 선택됨" : "아직 안 정함"}
            </span>
          </div>
          <input type="hidden" name="targetId" value={targetId} />
          <div className="flex flex-wrap gap-2 pt-1">
            {targets.map((target) => {
              const isSelected = targetId === target.id;
              return (
                <button
                  key={target.id}
                  type="button"
                  onClick={() => setTargetId(isSelected ? "" : target.id)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                    isSelected
                      ? "scale-105 bg-blue-600 text-white shadow-md shadow-blue-500/30"
                      : "border border-neutral-200 bg-white text-neutral-700 hover:bg-blue-50"
                  }`}
                >
                  {isSelected && "✓ "}
                  {target.label}
                </button>
              );
            })}
            {targets.length === 0 && (
              <p className="text-xs text-neutral-500">
                등록된 카페가 없습니다 —{" "}
                <Link href="/settings" className="font-medium underline">
                  설정 페이지에서 먼저 등록해주세요
                </Link>
                .
              </p>
            )}
          </div>
        </div>

        {/* 네이버 카페/블로그 에디터처럼 "제목 + 툴바 + 넓은 흰색 캔버스"를 하나의 종이처럼
            묶은 레이아웃. */}
        <div className="overflow-hidden rounded-2xl border border-neutral-300 bg-white shadow-sm">
          <input
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="제목을 입력하세요"
            className="w-full border-b border-neutral-200 px-5 py-4 text-lg font-bold text-neutral-900 outline-none placeholder:font-normal placeholder:text-neutral-400"
          />

          <div className="flex flex-wrap items-center gap-0.5 border-b border-neutral-200 bg-neutral-50 px-3 py-1.5">
            {TEXT_ACTIONS.map((action, idx) => (
              <div key={action.label} className="flex items-center">
                {(idx === 4 || idx === 5) && <span className="mx-1 h-5 w-px bg-neutral-300" />}
                <button
                  type="button"
                  title={action.title}
                  onClick={() => insertAtCursor(action.before, action.after)}
                  className="flex flex-col items-center gap-0.5 rounded-md px-2.5 py-1.5 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900"
                >
                  <span className="text-sm leading-none">{action.icon}</span>
                  <span className="text-[10px] leading-none">{action.label}</span>
                </button>
              </div>
            ))}
            <span className="mx-1 h-5 w-px bg-neutral-300" />

            <input
              ref={imageFileRef}
              type="file"
              accept="image/*"
              onChange={handleImageFileChange}
              disabled={isUploadingImage}
              className="hidden"
            />
            <button
              type="button"
              title="이미지 파일 첨부"
              onClick={() => imageFileRef.current?.click()}
              disabled={isUploadingImage}
              className="flex flex-col items-center gap-0.5 rounded-md px-2.5 py-1.5 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 disabled:opacity-50"
            >
              <span className="text-sm leading-none">🖼</span>
              <span className="text-[10px] leading-none">{isUploadingImage ? "업로드 중" : "사진"}</span>
            </button>

            <input
              ref={videoFileRef}
              type="file"
              accept="video/*"
              onChange={handleVideoFileChange}
              disabled={isUploadingVideo}
              className="hidden"
            />
            <button
              type="button"
              title="영상 파일 첨부"
              onClick={() => videoFileRef.current?.click()}
              disabled={isUploadingVideo}
              className="flex flex-col items-center gap-0.5 rounded-md px-2.5 py-1.5 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 disabled:opacity-50"
            >
              <span className="text-sm leading-none">🎬</span>
              <span className="text-[10px] leading-none">{isUploadingVideo ? "업로드 중" : "동영상"}</span>
            </button>

            <span className="ml-auto pr-1 text-xs text-neutral-400">{charCount.toLocaleString()}자</span>
          </div>
          {(imageUploadError || videoUploadError) && (
            <p className="border-b border-neutral-200 bg-red-50 px-3 py-1.5 text-xs text-red-600">
              {imageUploadError || videoUploadError}
            </p>
          )}

          {/* 실제 전송되는 값은 본문 + CTA를 합친 최종 결과다 — 아래 보이는 입력창은
              CTA를 뺀 본문만 다룬다(cafeGenerator.ts의 stripTrailingCta/appendCtaIfNeeded와
              동일한 분리 방식). */}
          <input type="hidden" name="content" value={buildFinalContent(content, ctaText, ctaUrl)} />
          <Textarea
            ref={contentRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={22}
            required
            placeholder="본문 내용을 입력하세요"
            className="w-full border-0 px-5 py-4 text-[15px] leading-relaxed text-neutral-900 outline-none focus:ring-0"
          />

          <div className="border-t border-neutral-200 bg-neutral-50/60 p-4">
            {/* AI 이미지 새로 생성 — DraftItem.tsx와 동일한 나노바나나 패턴. 새로 생성한
                이미지, 직접 첨부한 이미지, 링크로 붙여넣은 이미지 중 마지막에 정해진 것이
                최종 대표 이미지가 된다(모두 같은 imageUrl 상태를 공유). */}
            <div className="space-y-3 rounded-xl border border-amber-200/80 bg-amber-50/60 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-900">
                🖼️ 대표 이미지 — AI로 새로 생성하거나 직접 첨부/링크로 지정
              </p>
              <Textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                rows={2}
                autoGrow
                placeholder="이미지 프롬프트 (비워두면 지금 제목/본문 내용을 분석해서 자동 생성)"
              />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <select
                  value={imageModel}
                  onChange={(e) => setImageModel(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
                >
                  {IMAGE_MODEL_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <Input
                  type="text"
                  value={imageApiKey}
                  onChange={(e) => setImageApiKey(e.target.value)}
                  placeholder="나노바나나 API 키 (비워두면 설정에 등록된 내 키 사용)"
                  autoComplete="new-password"
                  style={{ WebkitTextSecurity: "disc" } as React.CSSProperties}
                />
              </div>
              <Button type="button" variant="secondary" onClick={handleGenerateImage} disabled={isGeneratingImage}>
                {isGeneratingImage ? "이미지 생성 중..." : imageUrl ? "🖼️ 이미지 다시 생성" : "🖼️ 대표 이미지 생성"}
              </Button>
              {imageGenError && <p className="text-xs text-red-600">{imageGenError}</p>}

              {imageOptions.length > 1 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700">
                    생성된 이미지 중 게시에 쓸 것을 선택하세요 ({imageOptions.length}개)
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {imageOptions.map((url, idx) => {
                      const isSelected = imageUrl === url;
                      return (
                        <button
                          key={url}
                          type="button"
                          onClick={() => {
                            setImageUrl(url);
                            setVideoUrl("");
                          }}
                          className={`relative overflow-hidden rounded-lg border-2 transition-colors ${
                            isSelected ? "border-blue-600 ring-2 ring-blue-300" : "border-neutral-200 hover:border-neutral-400"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={`이미지 후보 ${idx + 1}`} className="h-24 w-full object-cover" />
                          {isSelected && (
                            <span className="absolute right-1 top-1 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                              선택됨
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 pt-1 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700">또는 이미지 링크 직접 입력</label>
                  <Input
                    name="imageUrl"
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      if (e.target.value) setVideoUrl("");
                    }}
                    placeholder="https://... (또는 위 툴바에서 파일 첨부)"
                  />
                  {imageUrl && (
                    <div className="space-y-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt="대표 이미지"
                        className="mt-2 max-h-48 rounded-lg border border-neutral-200"
                      />
                      <button
                        type="button"
                        onClick={() => setImageUrl("")}
                        className="text-xs text-red-600 hover:underline"
                      >
                        이미지 제거
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-700">🎬 영상 링크 (직접 입력도 가능)</label>
                  <Input
                    name="videoUrl"
                    value={videoUrl}
                    onChange={(e) => {
                      setVideoUrl(e.target.value);
                      if (e.target.value) setImageUrl("");
                    }}
                    placeholder="https://... (또는 위 툴바에서 파일 첨부)"
                  />
                  {videoUrl && (
                    <div className="space-y-1">
                      <video
                        src={videoUrl}
                        controls
                        className="mt-2 max-h-48 w-full rounded-lg border border-neutral-200"
                      />
                      <button
                        type="button"
                        onClick={() => setVideoUrl("")}
                        className="text-xs text-red-600 hover:underline"
                      >
                        영상 제거
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 🔗 추천 링크(CTA) — DraftComposer.tsx/AIWriteForm.tsx와 동일한 항목("추천 링크
            기능도 하단에 추가해달라", 2026-09-13 요청). 저장 시 본문 끝에
            "\n\n📢 문구 URL"(같은 줄, 공백 하나) 형식으로 합쳐져서 publish-core.ts의
            splitCta()가 그대로 인식한다. */}
        <div className="space-y-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-900">
            🔗 하단 추천 링크 (CTA)
          </label>
          <p className="text-xs text-indigo-700">
            저장 시 본문 끝에 추천 링크가 자동으로 삽입됩니다. 비워두면 추천 링크 없이 저장됩니다.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700">추천 버튼 문구</label>
              <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="예: 자세히 보기" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700">추천 대상 URL</label>
              <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://example.com/offer" />
            </div>
          </div>
        </div>

        <div className="flex justify-start">
          <Button type="submit" variant="info" disabled={isPending}>
            {isPending ? "게시 중..." : "수정 내용 다시 등록"}
          </Button>
        </div>
      </div>
    </form>
  );
}
