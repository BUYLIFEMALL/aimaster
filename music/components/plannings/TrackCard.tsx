"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { regenerateMusicAction, syncTrackStatusAction, extendTrackAction, deleteTrackAction } from "@/lib/actions/tracks";
import { createMrAction } from "@/lib/actions/mr";
import { createWavAction, syncWavStatusAction } from "@/lib/actions/wav";
import { ApiKeyRequiredModal } from "@/components/settings/ApiKeyRequiredModal";
import { ImageLightbox } from "@/components/plannings/ImageLightbox";
import { TagChips } from "@/components/plannings/TagChips";
import {
  LANG_OPTIONS,
  VOCAL_GENDER_OPTIONS,
  GENRE_OPTIONS,
  GENRE_MAX_SELECT,
  MOOD_OPTIONS,
  MOOD_MAX_SELECT,
  INSTRUMENT_OPTIONS,
  INSTRUMENT_MAX_SELECT,
  VOCAL_TONE_OPTIONS,
  VOCAL_TONE_MAX_SELECT,
  TEMPO_OPTIONS,
  TEMPO_MAX_SELECT,
} from "@/lib/constants";
import type { TrackMode, TrackStatus, VocalGender, MrStatus, WavStatus } from "@/types/database.types";

export interface MrResult {
  id: string;
  status: MrStatus;
  instrumental_url: string | null;
  vocal_url: string | null;
  error_message: string | null;
}

export interface WavResult {
  id: string;
  status: WavStatus;
  wav_url: string | null;
  error_message: string | null;
}

export interface TrackVariant {
  id: string;
  audio_url: string;
  image_url: string | null;
  duration_seconds: number | null;
  suno_audio_id: string | null;
  music_track_mr: MrResult[];
  music_track_wav: WavResult[];
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
  extended_from_variant_id: string | null;
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
function trackTitleLabel(track: Pick<TrackCardData, "mode" | "vocal_gender" | "extended_from_variant_id">): string {
  const prefix = track.extended_from_variant_id ? "🔁 연장본 · " : "";
  if (track.mode === "instrumental") return `${prefix}🎹 인스트루멘탈버전(반주만)`;
  const label = track.vocal_gender ? `${VOCAL_GENDER_LABEL[track.vocal_gender]}곡` : "가사 포함";
  return `${prefix}🎤 보컬버전(${label})`;
}

/** planningLang: 기획의 언어 — 트랙 자신은 언어를 따로 저장하지 않아서 기본값으로 쓴다. */
export function TrackCard({ track, planningLang }: { track: TrackCardData; planningLang: string }) {
  const router = useRouter();
  const [lyrics, setLyrics] = useState(track.prompt_text);
  const [vocalGender, setVocalGender] = useState<VocalGender | "">(track.vocal_gender ?? "");
  const [lang, setLang] = useState(planningLang);
  const [count, setCount] = useState(1);
  const [genreTags, setGenreTags] = useState<string[]>([]);
  const [moodTags, setMoodTags] = useState<string[]>([]);
  const [instrumentTags, setInstrumentTags] = useState<string[]>([]);
  const [vocalToneTags, setVocalToneTags] = useState<string[]>([]);
  const [tempoTags, setTempoTags] = useState<string[]>([]);
  const [showTagOptions, setShowTagOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [missingProvider, setMissingProvider] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [extendingVariantId, setExtendingVariantId] = useState<string | null>(null);
  const [extendError, setExtendError] = useState<string | null>(null);
  const [mrPendingVariantId, setMrPendingVariantId] = useState<string | null>(null);
  const [mrError, setMrError] = useState<string | null>(null);
  const [wavPendingVariantId, setWavPendingVariantId] = useState<string | null>(null);
  const [wavSyncingId, setWavSyncingId] = useState<string | null>(null);
  const [wavError, setWavError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  /** 실패한 트랙 카드 삭제 — 자체 재시도 방법이 없는 죽은 카드를 치운다. */
  async function handleDelete() {
    setDeleteError(null);
    setIsDeleting(true);
    try {
      const result = await deleteTrackAction(track.id);
      if (result.error) {
        setDeleteError(result.error);
        setIsDeleting(false);
      } else {
        router.refresh();
      }
    } catch {
      setIsDeleting(false);
    }
  }

  /** "곡 연장" — 선택한 variant(오디오)를 Suno가 이어서 늘린다. 결과는 새 트랙 카드로 추가된다. */
  async function handleExtend(variantId: string) {
    setExtendError(null);
    setExtendingVariantId(variantId);
    try {
      const result = await extendTrackAction(variantId);
      if (result.needsApiKey) {
        setMissingProvider(result.needsApiKey);
      } else if (result.error) {
        setExtendError(result.error);
      } else {
        router.refresh();
      }
    } finally {
      setExtendingVariantId(null);
    }
  }

  /**
   * "MR(보컬제거) 만들기" — 선택한 variant(오디오)에서 보컬을 제거한 반주만 만든다.
   * 이 기능은 Suno에 상태 조회 API가 없어서(웹훅 전용) 로컬 개발 환경에서는 결과를 확인할
   * 수 없다 — 배포 환경에서 웹훅이 도착하면 AutoRefresh가 자동으로 화면을 갱신한다.
   */
  async function handleCreateMr(variantId: string) {
    setMrError(null);
    setMrPendingVariantId(variantId);
    try {
      const result = await createMrAction(variantId);
      if (result.needsApiKey) {
        setMissingProvider(result.needsApiKey);
      } else if (result.error) {
        setMrError(result.error);
      } else {
        router.refresh();
      }
    } finally {
      setMrPendingVariantId(null);
    }
  }

  /** "WAV로 변환" — 선택한 variant(오디오)를 고음질 WAV로 변환한다. */
  async function handleCreateWav(variantId: string) {
    setWavError(null);
    setWavPendingVariantId(variantId);
    try {
      const result = await createWavAction(variantId);
      if (result.needsApiKey) {
        setMissingProvider(result.needsApiKey);
      } else if (result.error) {
        setWavError(result.error);
      } else {
        router.refresh();
      }
    } finally {
      setWavPendingVariantId(null);
    }
  }

  /** WAV 변환은 상태 조회가 되는 API라 곡 생성과 동일하게 수동 동기화 버튼을 제공한다. */
  async function handleSyncWav(wavId: string) {
    setWavError(null);
    setWavSyncingId(wavId);
    try {
      const result = await syncWavStatusAction(wavId);
      if (result.error) {
        setWavError(result.error);
      } else if (result.status && result.status !== "generating") {
        router.refresh();
      } else {
        setWavError("아직 변환이 끝나지 않았습니다. 잠시 후 다시 확인해주세요.");
      }
    } finally {
      setWavSyncingId(null);
    }
  }

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

  function toggleGenre(value: string) {
    setGenreTags((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }
  function toggleMood(value: string) {
    setMoodTags((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }
  function toggleInstrument(value: string) {
    setInstrumentTags((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }
  function toggleVocalTone(value: string) {
    setVocalToneTags((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }
  function toggleTempo(value: string) {
    setTempoTags((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  const selectedTagCount =
    genreTags.length + moodTags.length + instrumentTags.length + vocalToneTags.length + tempoTags.length;
  const hasTagOverride = selectedTagCount > 0;
  const willUseAi =
    vocalGender !== (track.vocal_gender ?? "") || lang !== planningLang || count > 1 || hasTagOverride;

  async function handleRegenerate() {
    setError(null);
    setIsPending(true);
    try {
      const result = await regenerateMusicAction(track.id, {
        lyrics,
        vocalGender: vocalGender || null,
        lang,
        count,
        genre: genreTags,
        mood: moodTags,
        instruments: instrumentTags,
        vocalTone: vocalToneTags,
        tempo: tempoTags,
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
        <div className="flex items-center justify-between mb-3 gap-2">
          <p className="font-bold text-gray-900">{trackTitleLabel(track)}</p>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${badge.className}`}>{badge.label}</span>
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
            {track.music_track_variants.map((variant, index) => {
              const latestMr =
                variant.music_track_mr.length > 0 ? variant.music_track_mr[variant.music_track_mr.length - 1] : null;
              const latestWav =
                variant.music_track_wav.length > 0 ? variant.music_track_wav[variant.music_track_wav.length - 1] : null;
              return (
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
                  {variant.suno_audio_id && (
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      <button
                        type="button"
                        onClick={() => handleExtend(variant.id)}
                        disabled={extendingVariantId !== null}
                        className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-60"
                      >
                        {extendingVariantId === variant.id ? "연장 요청 중..." : "🔁 이 곡 이어서 연장하기"}
                      </button>
                      {!latestMr && (
                        <button
                          type="button"
                          onClick={() => handleCreateMr(variant.id)}
                          disabled={mrPendingVariantId !== null}
                          className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-60"
                        >
                          {mrPendingVariantId === variant.id ? "MR 요청 중..." : "🎧 MR(보컬제거) 만들기"}
                        </button>
                      )}
                      {latestMr?.status === "failed" && (
                        <button
                          type="button"
                          onClick={() => handleCreateMr(variant.id)}
                          disabled={mrPendingVariantId !== null}
                          className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-60"
                        >
                          {mrPendingVariantId === variant.id ? "MR 요청 중..." : "🎧 MR 다시 시도"}
                        </button>
                      )}
                      {!latestWav && (
                        <button
                          type="button"
                          onClick={() => handleCreateWav(variant.id)}
                          disabled={wavPendingVariantId !== null}
                          className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-60"
                        >
                          {wavPendingVariantId === variant.id ? "WAV 요청 중..." : "🎼 WAV로 변환"}
                        </button>
                      )}
                      {latestWav?.status === "failed" && (
                        <button
                          type="button"
                          onClick={() => handleCreateWav(variant.id)}
                          disabled={wavPendingVariantId !== null}
                          className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-60"
                        >
                          {wavPendingVariantId === variant.id ? "WAV 요청 중..." : "🎼 WAV 다시 시도"}
                        </button>
                      )}
                    </div>
                  )}
                  {latestMr?.status === "generating" && (
                    <p className="text-xs text-amber-600">
                      MR 생성 중... (완료되면 웹훅으로 자동 반영됩니다, 잠시 후 새로고침해주세요)
                    </p>
                  )}
                  {latestMr?.status === "failed" && (
                    <p className="text-xs text-red-600">{latestMr.error_message ?? "MR 생성에 실패했습니다."}</p>
                  )}
                  {latestMr?.status === "completed" && latestMr.instrumental_url && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-500">🎧 MR(보컬 제거)</p>
                      <audio controls src={latestMr.instrumental_url} className="w-full" />
                    </div>
                  )}
                  {latestWav?.status === "generating" && (
                    <div>
                      <button
                        type="button"
                        onClick={() => handleSyncWav(latestWav.id)}
                        disabled={wavSyncingId !== null}
                        className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-60"
                      >
                        {wavSyncingId === latestWav.id ? "확인 중..." : "🎼 WAV 변환 상태 확인"}
                      </button>
                    </div>
                  )}
                  {latestWav?.status === "failed" && (
                    <p className="text-xs text-red-600">{latestWav.error_message ?? "WAV 변환에 실패했습니다."}</p>
                  )}
                  {latestWav?.status === "completed" && latestWav.wav_url && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-500">🎼 WAV(고음질)</p>
                      <a
                        href={latestWav.wav_url}
                        download
                        className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors"
                      >
                        ⬇ WAV 파일받기
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {extendError && <p className="mb-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{extendError}</p>}
        {mrError && <p className="mb-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{mrError}</p>}
        {wavError && <p className="mb-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{wavError}</p>}

        {/* 인스트루멘탈판은 "음악 재생성" 섹션이 없어서 삭제 버튼을 여기 단독으로 둔다.
            보컬판은 아래 "음악 재생성" 버튼 옆에 나란히 둔다. */}
        {track.mode === "instrumental" && track.status !== "generating" && (
          <div className="mt-2 space-y-2">
            {deleteError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{deleteError}</p>}
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 disabled:opacity-60 transition-colors"
            >
              {isDeleting ? "삭제 중..." : "삭제"}
            </button>
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

            <button
              type="button"
              onClick={() => setShowTagOptions((v) => !v)}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              {showTagOptions
                ? "▲ 장르/무드/악기/보컬톤/템포 추가 옵션 닫기"
                : "▼ 장르/무드/악기/보컬톤/템포 추가 옵션 (선택)"}
              {hasTagOverride && !showTagOptions && ` — ${selectedTagCount}개 선택됨`}
            </button>

            {showTagOptions && (
              <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3">
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-gray-500">
                    장르 (최대 {GENRE_MAX_SELECT}개)
                  </p>
                  <TagChips options={GENRE_OPTIONS} selected={genreTags} max={GENRE_MAX_SELECT} onToggle={toggleGenre} />
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-gray-500">무드 (최대 {MOOD_MAX_SELECT}개)</p>
                  <TagChips options={MOOD_OPTIONS} selected={moodTags} max={MOOD_MAX_SELECT} onToggle={toggleMood} />
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-gray-500">
                    악기 (최대 {INSTRUMENT_MAX_SELECT}개)
                  </p>
                  <TagChips
                    options={INSTRUMENT_OPTIONS}
                    selected={instrumentTags}
                    max={INSTRUMENT_MAX_SELECT}
                    onToggle={toggleInstrument}
                  />
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-gray-500">
                    보컬톤 (최대 {VOCAL_TONE_MAX_SELECT}개)
                  </p>
                  <TagChips
                    options={VOCAL_TONE_OPTIONS}
                    selected={vocalToneTags}
                    max={VOCAL_TONE_MAX_SELECT}
                    onToggle={toggleVocalTone}
                  />
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-gray-500">템포 (최대 {TEMPO_MAX_SELECT}개)</p>
                  <TagChips options={TEMPO_OPTIONS} selected={tempoTags} max={TEMPO_MAX_SELECT} onToggle={toggleTempo} />
                </div>
              </div>
            )}

            <p className="text-xs text-gray-400">
              {willUseAi
                ? "성별/언어/곡수를 원래와 다르게 고르거나 태그를 추가하면, 위 가사 대신 AI가 새로 작사·작곡해서 생성합니다."
                : "성별/언어/곡수를 그대로 두고 태그도 추가하지 않으면 위에서 수정한 가사를 그대로 살려서 재생성합니다."}
            </p>

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            {deleteError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{deleteError}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={isPending}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 transition-colors"
              >
                {isPending ? "재생성 요청 중..." : "음악 재생성"}
              </button>
              {track.status !== "generating" && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 disabled:opacity-60 transition-colors"
                >
                  {isDeleting ? "삭제 중..." : "삭제"}
                </button>
              )}
            </div>
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
