"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { ImageZoomModal } from "@/components/posts/ImageZoomModal";
import {
  regenerateSlideImageAction,
  selectSlideImageAction,
  uploadSlideCustomImageAction,
  type SlideActionState,
} from "@/lib/actions/slides";
import type { Database, InstaPostType } from "@/types/database.types";

type Slide = Database["public"]["Tables"]["insta_post_slides"]["Row"];

const IMAGE_MODEL_OPTIONS = [
  { value: "nanobanana-2-2k", label: "NanoBanana 2-2K (추천)" },
  { value: "nanobanana-2-4k", label: "NanoBanana 2-4K" },
  { value: "nanobanana-pro", label: "NanoBanana Pro" },
  { value: "nanobanana", label: "NanoBanana Standard" },
] as const;

const initialState: SlideActionState = {};

// shots/src/components/candidates/SegmentCard.tsx의 "이력 갤러리 + 선택 + 재생성" 패턴을 이식.
export function SlideGallery({
  postId,
  slides,
  postType,
}: {
  postId: string;
  slides: Slide[];
  postType?: InstaPostType;
}) {
  // 2x2 격자로 두면 카드가 좁아져서 프롬프트가 잘 안 보인다. 캐러셀 순서대로 세로로
  // 한 장씩 나열해서(스크롤 없이 전부 보이게) 카드를 넓게 쓴다.
  return (
    <div className="flex flex-col gap-4">
      {slides.map((slide) => (
        <SlideCard key={slide.id} postId={postId} slide={slide} allowUpload={postType === "feed"} />
      ))}
    </div>
  );
}

function SlideCard({
  postId,
  slide,
  allowUpload,
}: {
  postId: string;
  slide: Slide;
  allowUpload: boolean;
}) {
  const [regenState, regenAction, isRegenerating] = useActionState(regenerateSlideImageAction, initialState);
  const [selectState, selectAction] = useActionState(selectSlideImageAction, initialState);
  const [uploadState, uploadAction, isUploading] = useActionState(uploadSlideCustomImageAction, initialState);
  const [prompt, setPrompt] = useState(slide.image_prompt ?? "");
  const [model, setModel] = useState<(typeof IMAGE_MODEL_OPTIONS)[number]["value"]>("nanobanana-2-2k");
  const [apiKey, setApiKey] = useState("");
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const history = slide.image_urls ?? [];

  return (
    <div className="space-y-2 rounded-lg border border-neutral-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-500">슬라이드 {slide.slide_order}</span>
      </div>

      {slide.image_url ? (
        <button
          type="button"
          onClick={() => setZoomUrl(slide.image_url)}
          className="mx-auto block w-full max-w-sm"
          title="클릭하면 확대해서 볼 수 있습니다"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slide.image_url} alt={`슬라이드 ${slide.slide_order}`} className="aspect-square w-full rounded-md object-cover" />
        </button>
      ) : (
        <div className="mx-auto flex aspect-square w-full max-w-sm items-center justify-center rounded-md border border-dashed border-neutral-300 text-xs text-neutral-400">
          이미지 없음
        </div>
      )}

      <form action={regenAction} className="space-y-1.5">
        <input type="hidden" name="slideId" value={slide.id} />
        <input type="hidden" name="postId" value={postId} />
        <Textarea
          name="imagePrompt"
          rows={10}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="text-xs leading-relaxed"
        />
        <div className="flex flex-wrap gap-1.5">
          <select
            name="model"
            value={model}
            onChange={(e) => setModel(e.target.value as typeof model)}
            className="rounded-lg border border-neutral-300 px-2 py-1 text-xs text-neutral-700"
          >
            {IMAGE_MODEL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            name="apiKey"
            autoComplete="new-password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="내 Gemini 키 (선택)"
            className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-2 py-1 text-xs"
            style={{ WebkitTextSecurity: "disc" } as React.CSSProperties}
          />
        </div>
        <Button type="submit" variant="secondary" className="w-full text-xs" disabled={isRegenerating}>
          {isRegenerating ? "생성 중..." : "다시 생성"}
        </Button>
        {regenState.error && <p className="text-xs text-red-600">{regenState.error}</p>}
      </form>

      {allowUpload && (
        <form
          action={uploadAction}
          className="space-y-1.5 border-t border-dashed border-neutral-200 pt-2"
        >
          <input type="hidden" name="slideId" value={slide.id} />
          <input type="hidden" name="postId" value={postId} />
          <p className="text-[11px] text-neutral-400">
            AI 이미지가 마음에 안 들면 직접 가진 이미지 파일을 올려서 쓸 수도 있습니다.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            name="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              if (e.target.files?.length) e.currentTarget.form?.requestSubmit();
            }}
            className="block w-full text-xs text-neutral-500 file:mr-2 file:rounded-md file:border-0 file:bg-neutral-100 file:px-2 file:py-1 file:text-xs file:font-medium file:text-neutral-700"
          />
          {isUploading && <p className="text-xs text-neutral-500">업로드 중...</p>}
          {uploadState.error && <p className="text-xs text-red-600">{uploadState.error}</p>}
        </form>
      )}

      {history.length > 1 && (
        <div>
          <p className="mb-1 text-[11px] text-neutral-400">생성 이력 (클릭해서 선택, 돋보기로 확대)</p>
          <div className="flex flex-wrap gap-1.5">
            {history.map((url) => {
              const isSelected = url === slide.image_url;
              return (
                <form key={url} action={selectAction} className="relative">
                  <input type="hidden" name="slideId" value={slide.id} />
                  <input type="hidden" name="postId" value={postId} />
                  <input type="hidden" name="imageUrl" value={url} />
                  <button
                    type="submit"
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
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setZoomUrl(url);
                    }}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900/80 text-[10px] text-white"
                    title="확대해서 보기"
                  >
                    🔍
                  </button>
                </form>
              );
            })}
          </div>
          {selectState.error && <p className="mt-1 text-xs text-red-600">{selectState.error}</p>}
        </div>
      )}

      {zoomUrl && (
        <ImageZoomModal
          imageUrl={zoomUrl}
          title={`슬라이드 ${slide.slide_order}`}
          onClose={() => setZoomUrl(null)}
        />
      )}
    </div>
  );
}
