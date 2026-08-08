"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import {
  saveSegmentAction,
  regenerateSegmentImageAction,
  selectSegmentImageAction,
  type SaveSegmentState,
  type RegenerateImageState,
  type SelectImageState,
} from "@/lib/actions/scripts";
import { NANO_BANANA_MODEL_OPTIONS } from "@/lib/ai/nanoBananaModels";
import type { Database } from "@/types/database.types";

type Segment = Database["public"]["Tables"]["shorts_video_segments"]["Row"];

const initialSaveState: SaveSegmentState = {};
const initialRegenerateState: RegenerateImageState = {};
const initialSelectState: SelectImageState = {};

export function SegmentCard({ videoId, segment }: { videoId: string; segment: Segment }) {
  const [saveState, saveAction, isSaving] = useActionState(saveSegmentAction, initialSaveState);
  const [regenState, regenAction, isRegenerating] = useActionState(
    regenerateSegmentImageAction,
    initialRegenerateState,
  );
  const [selectState, selectAction] = useActionState(selectSegmentImageAction, initialSelectState);

  // 저장 버튼을 누르지 않고 바로 "다시 생성"을 눌러도 최신 입력값이 쓰이도록
  // 두 폼이 같은 값을 공유하게 컨트롤드 state로 관리한다.
  const [narration, setNarration] = useState(segment.narration);
  const [imagePrompt, setImagePrompt] = useState(segment.image_prompt);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  return (
    <div className="rounded-lg border border-neutral-200 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-bold text-neutral-900">
          장면 {segment.segment_index} · {segment.duration_seconds}초
        </span>
      </div>

      <form action={saveAction} className="space-y-2">
        <input type="hidden" name="segmentId" value={segment.id} />
        <input type="hidden" name="videoId" value={videoId} />
        <div>
          <label className="mb-1 block text-xs text-neutral-500">대사(내레이션)</label>
          <Textarea
            name="narration"
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            rows={2}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">이미지 프롬프트</label>
          <Textarea
            name="imagePrompt"
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            rows={2}
            required
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
          >
            {isSaving ? "저장 중..." : "대사/프롬프트 저장"}
          </button>
          {saveState.error && <p className="text-xs text-red-600">{saveState.error}</p>}
          {saveState.success && <p className="text-xs text-green-600">저장됨</p>}
        </div>
      </form>

      <form action={regenAction} className="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
        <input type="hidden" name="segmentId" value={segment.id} />
        <input type="hidden" name="videoId" value={videoId} />
        <input type="hidden" name="narration" value={narration} />
        <input type="hidden" name="imagePrompt" value={imagePrompt} />
        <select
          name="imageModel"
          defaultValue="nanobanana-2-2k"
          className="rounded-lg border border-neutral-300 px-2 py-1.5 text-xs text-neutral-900 outline-none focus:border-neutral-900"
        >
          {NANO_BANANA_MODEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={isRegenerating}>
          {isRegenerating ? "생성 중..." : segment.image_url ? "이 이미지 다시 생성" : "이 이미지 생성"}
        </Button>
        {regenState.error && <p className="text-xs text-red-600">{regenState.error}</p>}
      </form>

      {segment.image_urls.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs text-neutral-500">
            생성된 이미지 {segment.image_urls.length}개 · 마음에 드는 걸 선택하세요
          </p>
          <div className="flex flex-wrap gap-2">
            {segment.image_urls.map((url, i) => {
              const isSelected = url === segment.image_url;
              return (
                <div key={url} className="relative">
                  <form action={selectAction}>
                    <input type="hidden" name="segmentId" value={segment.id} />
                    <input type="hidden" name="videoId" value={videoId} />
                    <input type="hidden" name="imageUrl" value={url} />
                    <button
                      type="submit"
                      disabled={isSelected}
                      className={`relative block overflow-hidden rounded-md ring-2 ${
                        isSelected ? "ring-blue-500" : "ring-transparent hover:ring-neutral-300"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`장면 ${segment.segment_index} 후보 이미지 ${i + 1}`}
                        className="aspect-9/16 w-24 object-cover"
                      />
                      {isSelected && (
                        <span className="absolute bottom-0 left-0 right-0 bg-blue-500 py-0.5 text-center text-[10px] font-medium text-white">
                          선택됨
                        </span>
                      )}
                    </button>
                  </form>
                  <button
                    type="button"
                    onClick={() => setLightboxUrl(url)}
                    title="크게 보기"
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded bg-black/60 text-xs text-white hover:bg-black/80"
                  >
                    ⤢
                  </button>
                </div>
              );
            })}
          </div>
          {selectState.error && <p className="mt-1 text-xs text-red-600">{selectState.error}</p>}
        </div>
      )}

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg text-white hover:bg-white/20"
            aria-label="닫기"
          >
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt={`장면 ${segment.segment_index} 확대 이미지`}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
