"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  saveScriptEditsAction,
  generateSegmentImagesAction,
  type SaveScriptEditsState,
  type GenerateImagesState,
} from "@/lib/actions/scripts";
import { NANO_BANANA_MODEL_OPTIONS } from "@/lib/ai/nanoBananaModels";
import { SegmentCard } from "@/components/candidates/SegmentCard";
import type { Database, ShortsVideoStatus } from "@/types/database.types";

type Video = Database["public"]["Tables"]["shorts_videos"]["Row"];
type Segment = Database["public"]["Tables"]["shorts_video_segments"]["Row"];

const STATUS_LABELS: Record<ShortsVideoStatus, string> = {
  script_ready: "스크립트 준비됨",
  images_generating: "이미지 생성 중...",
  images_ready: "이미지 생성 완료",
};

const initialSaveState: SaveScriptEditsState = {};
const initialImagesState: GenerateImagesState = {};

export function ScriptEditor({ video, segments }: { video: Video; segments: Segment[] }) {
  const [saveState, saveAction, isSaving] = useActionState(saveScriptEditsAction, initialSaveState);
  const [imagesState, imagesAction, isGeneratingImages] = useActionState(
    generateSegmentImagesAction,
    initialImagesState,
  );

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <span className="mb-3 inline-block rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-600">
          {STATUS_LABELS[video.status]}
        </span>

        <form action={saveAction} className="space-y-5">
          <input type="hidden" name="videoId" value={video.id} />

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">제목</label>
            <Input name="title" defaultValue={video.title} required />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">전체 스크립트 (참고용)</label>
            <p className="whitespace-pre-wrap rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-600">
              {video.full_script}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" variant="secondary" disabled={isSaving}>
              {isSaving ? "저장 중..." : "제목 저장"}
            </Button>
            {saveState.error && <p className="text-sm text-red-600">{saveState.error}</p>}
            {saveState.success && <p className="text-sm text-green-600">저장되었습니다.</p>}
          </div>
        </form>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-medium text-neutral-700">
          장면별 대사 · 이미지 프롬프트 · 이미지 (5초 × {segments.length}장면)
        </p>
        {segments.map((seg) => (
          <SegmentCard key={seg.id} videoId={video.id} segment={seg} />
        ))}
      </div>

      <form action={imagesAction} className="rounded-lg border border-neutral-200 bg-white p-4">
        <input type="hidden" name="videoId" value={video.id} />
        <p className="mb-3 text-sm text-neutral-600">
          저장된(위에서 수정한) 장면 내용으로 나노바나나 이미지 {segments.length}장을 한번에 생성합니다.
          마음에 안 드는 이미지는 각 장면 카드에서 개별적으로 다시 생성할 수 있습니다.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px]">
            <label className="mb-1 block text-xs font-medium text-neutral-700">이미지 모델 (NanoBanana)</label>
            <select
              name="imageModel"
              defaultValue="nanobanana-2-2k"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
            >
              {NANO_BANANA_MODEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={isGeneratingImages}>
            {isGeneratingImages ? "이미지 생성 중..." : "이미지 전체 생성하기"}
          </Button>
        </div>
        {imagesState.error && <p className="mt-2 text-sm text-red-600">{imagesState.error}</p>}
        {imagesState.success && <p className="mt-2 text-sm text-green-600">이미지 생성이 완료되었습니다.</p>}
      </form>
    </div>
  );
}
