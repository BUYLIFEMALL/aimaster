"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import {
  regenerateSlideImageAction,
  selectSlideImageAction,
  type SlideActionState,
} from "@/lib/actions/slides";
import type { Database } from "@/types/database.types";

type Slide = Database["public"]["Tables"]["insta_post_slides"]["Row"];

const IMAGE_MODEL_OPTIONS = [
  { value: "nanobanana-2-2k", label: "NanoBanana 2-2K (추천)" },
  { value: "nanobanana-2-4k", label: "NanoBanana 2-4K" },
  { value: "nanobanana-pro", label: "NanoBanana Pro" },
  { value: "nanobanana", label: "NanoBanana Standard" },
] as const;

const initialState: SlideActionState = {};

// shots/src/components/candidates/SegmentCard.tsx의 "이력 갤러리 + 선택 + 재생성" 패턴을 이식.
export function SlideGallery({ postId, slides }: { postId: string; slides: Slide[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {slides.map((slide) => (
        <SlideCard key={slide.id} postId={postId} slide={slide} />
      ))}
    </div>
  );
}

function SlideCard({ postId, slide }: { postId: string; slide: Slide }) {
  const [regenState, regenAction, isRegenerating] = useActionState(regenerateSlideImageAction, initialState);
  const [selectState, selectAction] = useActionState(selectSlideImageAction, initialState);
  const [prompt, setPrompt] = useState(slide.image_prompt ?? "");
  const [model, setModel] = useState<(typeof IMAGE_MODEL_OPTIONS)[number]["value"]>("nanobanana-2-2k");
  const [apiKey, setApiKey] = useState("");

  const history = slide.image_urls ?? [];

  return (
    <div className="space-y-2 rounded-lg border border-neutral-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-500">슬라이드 {slide.slide_order}</span>
      </div>

      {slide.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={slide.image_url} alt={`슬라이드 ${slide.slide_order}`} className="aspect-square w-full rounded-md object-cover" />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center rounded-md border border-dashed border-neutral-300 text-xs text-neutral-400">
          이미지 없음
        </div>
      )}

      <form action={regenAction} className="space-y-1.5">
        <input type="hidden" name="slideId" value={slide.id} />
        <input type="hidden" name="postId" value={postId} />
        <Textarea
          name="imagePrompt"
          rows={2}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="text-xs"
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

      {history.length > 1 && (
        <div>
          <p className="mb-1 text-[11px] text-neutral-400">생성 이력 (클릭해서 선택)</p>
          <div className="flex flex-wrap gap-1.5">
            {history.map((url) => {
              const isSelected = url === slide.image_url;
              return (
                <form key={url} action={selectAction}>
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
                </form>
              );
            })}
          </div>
          {selectState.error && <p className="mt-1 text-xs text-red-600">{selectState.error}</p>}
        </div>
      )}
    </div>
  );
}
