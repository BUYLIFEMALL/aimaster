"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  requestRenderAction,
  checkRenderStatusAction,
  type RequestRenderState,
  type CheckRenderState,
} from "@/lib/actions/render";
import type { Database } from "@/types/database.types";

type Video = Database["public"]["Tables"]["shorts_videos"]["Row"];

const initialRequestState: RequestRenderState = {};
const POLL_INTERVAL_MS = 10000;

export function RenderSection({ video, defaultVoiceId }: { video: Video; defaultVoiceId: string | null }) {
  const router = useRouter();
  const [requestState, requestAction, isRequesting] = useActionState(
    requestRenderAction,
    initialRequestState,
  );
  const [isPending, startTransition] = useTransition();
  const [checkError, setCheckError] = useState<string | null>(null);
  const [voiceId, setVoiceId] = useState(defaultVoiceId ?? "");

  useEffect(() => {
    if (video.render_status !== "rendering") return;

    const interval = setInterval(() => {
      const fd = new FormData();
      fd.set("videoId", video.id);
      startTransition(async () => {
        const result: CheckRenderState = await checkRenderStatusAction({}, fd);
        setCheckError(result.error ?? null);
        router.refresh();
      });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [video.render_status, video.id, router]);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="mb-1 text-lg font-medium text-neutral-900">최종 영상 렌더링 (JSON2Video)</h2>
      <p className="mb-4 text-sm text-neutral-600">
        위에서 만든 6장면(이미지+대사)과 선택한 배경음악을 하나의 쇼츠 영상으로 합칩니다. 대사는
        ElevenLabs 음성으로 자동 더빙되고, 자막도 자동으로 생성됩니다.
      </p>

      {(!video.render_status || video.render_status === "failed") && (
        <form action={requestAction} className="space-y-3">
          <input type="hidden" name="videoId" value={video.id} />
          <div>
            <label className="mb-1 block text-xs text-neutral-500">
              사용할 ElevenLabs Voice ID
            </label>
            <Input
              name="voiceId"
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              placeholder="예: v1jVu1Ky28piIPEJqRrm"
            />
          </div>
          {video.render_status === "failed" && (
            <p className="text-sm text-red-600">영상 렌더링에 실패했습니다. 다시 시도해주세요.</p>
          )}
          <Button type="submit" disabled={isRequesting || !voiceId}>
            {isRequesting ? "요청 중..." : "쇼츠생성하기"}
          </Button>
          {requestState.error && <p className="text-sm text-red-600">{requestState.error}</p>}
        </form>
      )}

      {video.render_status === "rendering" && (
        <div>
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            영상 렌더링 중입니다... (몇 분 정도 걸릴 수 있으며, 10초마다 자동으로 확인합니다{isPending ? " · 확인 중" : ""})
          </div>
          {checkError && <p className="mt-2 text-sm text-red-600">상태 확인 중 오류: {checkError}</p>}
        </div>
      )}

      {video.render_status === "ready" && video.rendered_video_url && (
        <div className="space-y-3">
          <video controls src={video.rendered_video_url} className="max-h-[70vh] w-full rounded-lg bg-black" />
          <div className="flex items-center gap-2">
            <a
              href={video.rendered_video_url}
              download
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
            >
              영상 다운로드
            </a>
            <form action={requestAction}>
              <input type="hidden" name="videoId" value={video.id} />
              <input type="hidden" name="voiceId" value={voiceId || defaultVoiceId || ""} />
              <Button type="submit" variant="secondary" disabled={isRequesting}>
                {isRequesting ? "요청 중..." : "다시 생성하기"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
