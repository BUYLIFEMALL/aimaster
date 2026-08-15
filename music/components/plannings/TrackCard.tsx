"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { regenerateMusicAction, syncTrackStatusAction } from "@/lib/actions/tracks";
import { ApiKeyRequiredModal } from "@/components/settings/ApiKeyRequiredModal";
import { ImageLightbox } from "@/components/plannings/ImageLightbox";
import { LANG_OPTIONS, VOCAL_GENDER_OPTIONS } from "@/lib/constants";
import type { TrackMode, TrackStatus, VocalGender } from "@/types/database.types";

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
  vocal_gender: VocalGender | null;
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

const VOCAL_GENDER_LABEL: Record<VocalGender, string> = {
  남성: "남성",
  여성: "여성",
  혼성: "듀엣",
};

const COUNT_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1); // 1~10
const PROVIDER_LABELS: Record<string, string> = { openai: "OpenAI", suno: "Suno" };

/** 트랙 카드 제목("🎤 보컬버전(남성)" 등) — 실제 생성 당시 성별을 트랙 자신에 스냅샷해뒀으므로
 * 기획을 나중에 수정해도 이미 생성된 카드의 라벨은 바뀌지 않는다. */
function trackTitleLabel(track: Pick<TrackCardData, "mode" | "vocal_gender">): string {
  if (track.mode === "instrumental") return "🎹 인스트루멘탈버전";
  const genderLabel = track.vocal_gender ? `(${VOCAL_GENDER_LABEL[track.vocal_gender]})` : "";
  return `🎤 보컬버전${genderLabel}`;
}

/** planningLang: 기획의 언어 — 트랙 자신은 언어를 따로 저장하지 않아서 기본값으로 쓴다. */
export function TrackCard({ track, planningLang }: { track: TrackCardData; planningLang: string }) {
  const router = useRouter();
  const [lyrics, setLyrics] = useState(track.prompt_text);
  const [vocalGender, setVocalGender] = useState<VocalGender | "">(track.vocal_gender ?? "");
  const [lang, setLang] = useState(planningLang);
  const [count, setCount] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [missingProvider, setMissingProvider] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

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

  const willUseAi = vocalGender !== (track.vocal_gender ?? "") || lang !== planningLang || count > 1;

  async function handleRegenerate() {
    setError(null);
    setIsPending(true);
    try {
      const result = await regenerateMusicAction(track.id, {
        lyrics,
        vocalGender: vocalGender || null,
        lang,
        count,
      });
      if (result.needsApiKey) {
        setMissingProvider(result.needsApiKey);
      } else if (result.error) {
        setError(result.error);
      } else {
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
          <p className="font-bold text-gray-900">{trackTitleLabel(track)}</p>
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
                  <img
                    src={variant.image_url}
                    alt={`${track.title} 커버 ${index + 1}`}
                    className="w-full rounded-xl aspect-square object-cover cursor-zoom-in"
                    onClick={() => setLightboxUrl(variant.image_url)}
                  />
                )}
                <audio controls src={variant.audio_url} className="w-full" />
              </div>
            ))}
          </div>
        )}

        {track.mode === "vocal" && (
          <div className="mt-2 space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">가사</label>
              <textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                rows={10}
                className="input w-full font-mono text-sm whitespace-pre-wrap"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">성별</label>
                <select
                  value={vocalGender}
                  onChange={(e) => setVocalGender(e.target.value as VocalGender | "")}
                  className="input w-32"
                >
                  <option value="">미지정</option>
                  {VOCAL_GENDER_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g === "혼성" ? "혼성(듀엣)" : g}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">언어</label>
                <select value={lang} onChange={(e) => setLang(e.target.value)} className="input w-28">
                  {LANG_OPTIONS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">곡수</label>
                <select
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="input w-24"
                >
                  {COUNT_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}곡
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-xs text-gray-400">
              {willUseAi
                ? "성별/언어를 원래와 다르게 고르거나 곡수를 2 이상으로 하면, 위 가사 대신 AI가 새로 작사해서 생성합니다."
                : "성별/언어/곡수를 그대로 두면 위에서 수정한 가사를 그대로 살려서 재생성합니다."}
            </p>

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <button
              type="button"
              onClick={handleRegenerate}
              disabled={isPending}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 transition-colors"
            >
              {isPending ? "재생성 요청 중..." : "음악 재생성"}
            </button>
          </div>
        )}
      </div>

      {missingProvider && (
        <ApiKeyRequiredModal
          missingLabels={[PROVIDER_LABELS[missingProvider] ?? missingProvider]}
          onClose={() => setMissingProvider(null)}
        />
      )}
      {lightboxUrl && (
        <ImageLightbox src={lightboxUrl} alt={track.title} onClose={() => setLightboxUrl(null)} />
      )}
    </>
  );
}
