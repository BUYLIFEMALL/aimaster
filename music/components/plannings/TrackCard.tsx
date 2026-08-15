"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { regenerateTrackAction, syncTrackStatusAction } from "@/lib/actions/tracks";
import { ApiKeyRequiredModal } from "@/components/settings/ApiKeyRequiredModal";
import type { TrackMode, TrackStatus } from "@/types/database.types";

export interface TrackVariant {
  id: string;
  audio_url: string;
  image_url: string | null;
  duration_seconds: number | null;
}

export interface TrackCardData {
  id: string;
  mode: TrackMode;
  title: string;
  prompt_text: string;
  status: TrackStatus;
  error_message: string | null;
  created_at: string;
  music_track_variants: TrackVariant[];
}

const STATUS_LABEL: Record<TrackStatus, { label: string; className: string }> = {
  generating: { label: "생성 중...", className: "bg-amber-100 text-amber-700" },
  completed: { label: "완료", className: "bg-green-100 text-green-700" },
  failed: { label: "실패", className: "bg-red-100 text-red-700" },
};

export function TrackCard({ track }: { track: TrackCardData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [lyrics, setLyrics] = useState(track.prompt_text);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [needsApiKey, setNeedsApiKey] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  /**
   * 웹훅이 도달하지 못했을 때(로컬 개발 환경은 항상 그렇고, 배포 환경에서도 드물게 콜백이
   * 유실될 수 있다) 대비한 수동 동기화 — Suno에 직접 완료 여부를 물어본다.
   */
  async function handleSyncStatus() {
    setSyncError(null);
    setIsSyncing(true);
    try {
      const result = await syncTrackStatusAction(track.id);
      if (result.error) {
        setSyncError(result.error);
      } else if (result.status && result.status !== "generating") {
        router.refresh();
      } else {
        setSyncError("아직 Suno에서 생성이 끝나지 않았습니다. 잠시 후 다시 확인해주세요.");
      }
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleRegenerate() {
    setError(null);
    setIsPending(true);
    try {
      const result = await regenerateTrackAction(track.id, lyrics);
      if (result.needsApiKey) {
        setNeedsApiKey(true);
      } else if (result.error) {
        setError(result.error);
      } else {
        setEditing(false);
        router.refresh();
      }
    } finally {
      setIsPending(false);
    }
  }

  const badge = STATUS_LABEL[track.status];

  return (
    <>
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold text-gray-900">
            {track.mode === "vocal" ? "🎤 보컬버전" : "🎹 인스트루멘탈버전"}
          </p>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badge.className}`}>{badge.label}</span>
        </div>

        {track.status === "failed" && track.error_message && (
          <p className="mb-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{track.error_message}</p>
        )}

        {track.status === "generating" && (
          <div className="mb-3">
            <button
              type="button"
              onClick={handleSyncStatus}
              disabled={isSyncing}
              className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-60"
            >
              {isSyncing ? "확인 중..." : "지금 상태 확인 (Suno에 직접 조회)"}
            </button>
            {syncError && <p className="mt-1 text-xs text-red-600">{syncError}</p>}
          </div>
        )}

        {track.music_track_variants.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 mb-4">
            {track.music_track_variants.map((variant, index) => (
              <div key={variant.id} className="space-y-2">
                {variant.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={variant.image_url} alt={`${track.title} 커버 ${index + 1}`} className="w-full rounded-xl aspect-square object-cover" />
                )}
                <audio controls src={variant.audio_url} className="w-full" />
              </div>
            ))}
          </div>
        )}

        {track.mode === "vocal" && (
          <div className="mt-2">
            {editing ? (
              <div className="space-y-2">
                <textarea
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  rows={10}
                  className="input w-full font-mono text-sm whitespace-pre-wrap"
                />
                {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    disabled={isPending}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-60"
                  >
                    {isPending ? "재생성 요청 중..." : "수정해서 재생성"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setLyrics(track.prompt_text);
                    }}
                    className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-700"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <pre className="whitespace-pre-wrap text-sm text-gray-600 bg-gray-50 rounded-xl p-3 max-h-48 overflow-y-auto font-sans">
                  {track.prompt_text}
                </pre>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="mt-2 text-sm font-semibold text-blue-600 hover:underline"
                >
                  가사 수정 후 재생성
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {needsApiKey && (
        <ApiKeyRequiredModal missingLabels={["Suno"]} onClose={() => setNeedsApiKey(false)} />
      )}
    </>
  );
}
