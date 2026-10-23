"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import {
  saveBgmPromptAction,
  requestBgmGenerationAction,
  checkBgmStatusAction,
  selectBgmTrackAction,
  deleteBgmTrackAction,
  type SaveBgmPromptState,
  type RequestBgmState,
  type CheckBgmState,
  type SelectBgmTrackState,
  type DeleteBgmTrackState,
} from "@/lib/actions/music";
import type { Database } from "@/types/database.types";

type Video = Database["public"]["Tables"]["shorts_videos"]["Row"];
type BgmTrack = Database["public"]["Tables"]["shorts_bgm_tracks"]["Row"];

const initialSaveState: SaveBgmPromptState = {};
const initialRequestState: RequestBgmState = {};
const initialSelectState: SelectBgmTrackState = {};
const initialDeleteState: DeleteBgmTrackState = {};

const POLL_INTERVAL_MS = 10000;

export function BgmSection({ video, tracks }: { video: Video; tracks: BgmTrack[] }) {
  const router = useRouter();
  const [saveState, saveAction, isSaving] = useActionState(saveBgmPromptAction, initialSaveState);
  const [requestState, requestAction, isRequesting] = useActionState(
    requestBgmGenerationAction,
    initialRequestState,
  );
  const [selectState, selectAction] = useActionState(selectBgmTrackAction, initialSelectState);
  const [deleteState, deleteAction] = useActionState(deleteBgmTrackAction, initialDeleteState);
  const [isPending, startTransition] = useTransition();
  const [checkError, setCheckError] = useState<string | null>(null);

  // 저장 버튼을 누르지 않고 바로 생성 버튼을 눌러도 최신 입력값이 쓰이도록
  // 저장/생성 두 폼이 같은 값을 공유하게 컨트롤드 state로 관리한다 (장면 편집과 동일한 패턴).
  const [bgmPrompt, setBgmPrompt] = useState(video.bgm_prompt ?? "");
  const [bgmStyle, setBgmStyle] = useState(video.bgm_style ?? "");
  const [bgmExclude, setBgmExclude] = useState(video.bgm_exclude ?? "");

  // 생성 중이면 자동으로 주기적으로 상태를 확인한다.
  // (useActionState 디스패처는 완료 시점을 await할 수 없어서, 여기서는 서버 액션을
  // 직접 호출해 결과를 기다린 다음에 router.refresh()로 화면을 갱신한다.)
  useEffect(() => {
    if (video.bgm_status !== "processing") return;

    const interval = setInterval(() => {
      const fd = new FormData();
      fd.set("videoId", video.id);
      startTransition(async () => {
        const result: CheckBgmState = await checkBgmStatusAction({}, fd);
        setCheckError(result.error ?? null);
        router.refresh();
      });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [video.bgm_status, video.id, router]);

  const canGenerate = !!bgmPrompt && !!bgmStyle;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="mb-1 text-lg font-medium text-neutral-900">배경음악 생성 (Suno)</h2>
      <p className="mb-4 text-sm text-neutral-600">
        아래 BGM 프롬프트로 Suno가 배경음악 2곡을 만듭니다. 마음에 안 들면 프롬프트를 수정하고 다시
        생성해보세요. 마음에 드는 곡을 골라두면 최종 영상 렌더링에 그 곡이 사용됩니다.
      </p>

      <form action={saveAction} className="mb-4 space-y-3">
        <input type="hidden" name="videoId" value={video.id} />
        <div>
          <label className="mb-1 block text-xs text-neutral-500">BGM 프롬프트</label>
          <Textarea
            name="bgmPrompt"
            value={bgmPrompt}
            onChange={(e) => setBgmPrompt(e.target.value)}
            rows={2}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Style Description</label>
          <Textarea
            name="bgmStyle"
            value={bgmStyle}
            onChange={(e) => setBgmStyle(e.target.value)}
            rows={2}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Exclude styles</label>
          <Textarea
            name="bgmExclude"
            value={bgmExclude}
            onChange={(e) => setBgmExclude(e.target.value)}
            rows={2}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" variant="secondary" disabled={isSaving}>
            {isSaving ? "저장 중..." : "BGM 프롬프트 저장"}
          </Button>
          {saveState.error && <p className="text-xs text-red-600">{saveState.error}</p>}
          {saveState.success && <p className="text-xs text-green-600">저장됨</p>}
        </div>
      </form>

      {!video.bgm_status && (
        <form action={requestAction}>
          <input type="hidden" name="videoId" value={video.id} />
          <input type="hidden" name="bgmPrompt" value={bgmPrompt} />
          <input type="hidden" name="bgmStyle" value={bgmStyle} />
          <input type="hidden" name="bgmExclude" value={bgmExclude} />
          <Button type="submit" disabled={isRequesting || !canGenerate}>
            {isRequesting ? "요청 중..." : "배경음악 생성하기"}
          </Button>
          {requestState.error && <p className="mt-2 text-sm text-red-600">{requestState.error}</p>}
        </form>
      )}

      {video.bgm_status === "processing" && (
        <div>
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            음악 생성 중입니다... (보통 1~3분 정도 걸리며, 10초마다 자동으로 확인합니다{isPending ? " · 확인 중" : ""})
          </div>
          {checkError && <p className="mt-2 text-sm text-red-600">상태 확인 중 오류: {checkError}</p>}
        </div>
      )}

      {video.bgm_status === "failed" && tracks.length === 0 && (
        <div>
          <p className="mb-2 text-sm text-red-600">음악 생성에 실패했습니다.</p>
          <form action={requestAction}>
            <input type="hidden" name="videoId" value={video.id} />
            <input type="hidden" name="bgmPrompt" value={bgmPrompt} />
            <input type="hidden" name="bgmStyle" value={bgmStyle} />
            <input type="hidden" name="bgmExclude" value={bgmExclude} />
            <Button type="submit" disabled={isRequesting}>
              {isRequesting ? "요청 중..." : "다시 시도"}
            </Button>
          </form>
        </div>
      )}

      {tracks.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {tracks.map((track) => {
              const isSelected = track.id === video.bgm_selected_track_id;
              return (
                <div
                  key={track.id}
                  className={`rounded-lg border p-3 ${isSelected ? "border-blue-500 bg-blue-50/40" : "border-neutral-200"}`}
                >
                  <div className="mb-2 flex items-center gap-3">
                    {track.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={track.image_url}
                        alt={track.title ?? "앨범 이미지"}
                        className="h-16 w-16 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <div className="h-16 w-16 shrink-0 rounded-md bg-neutral-100" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-900">
                        {track.title || "제목 없음"}
                      </p>
                      {track.duration_seconds && (
                        <p className="text-xs text-neutral-500">{Math.round(track.duration_seconds)}초</p>
                      )}
                    </div>
                  </div>
                  <audio controls src={track.audio_url} className="mb-2 w-full" />
                  <div className="flex items-center gap-2">
                    <form action={selectAction}>
                      <input type="hidden" name="videoId" value={video.id} />
                      <input type="hidden" name="trackId" value={track.id} />
                      <Button type="submit" variant={isSelected ? "secondary" : "primary"} disabled={isSelected}>
                        {isSelected ? "선택됨" : "이 곡 선택"}
                      </Button>
                    </form>
                    <form action={deleteAction}>
                      <input type="hidden" name="videoId" value={video.id} />
                      <input type="hidden" name="trackId" value={track.id} />
                      <button
                        type="submit"
                        className="rounded-md bg-red-50 px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                      >
                        삭제
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
          {selectState.error && <p className="text-sm text-red-600">{selectState.error}</p>}
          {deleteState.error && <p className="text-sm text-red-600">{deleteState.error}</p>}
          <form action={requestAction}>
            <input type="hidden" name="videoId" value={video.id} />
            <input type="hidden" name="bgmPrompt" value={bgmPrompt} />
            <input type="hidden" name="bgmStyle" value={bgmStyle} />
            <input type="hidden" name="bgmExclude" value={bgmExclude} />
            <Button type="submit" variant="secondary" disabled={isRequesting}>
              {isRequesting ? "요청 중..." : "다른 곡 더 생성하기"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
