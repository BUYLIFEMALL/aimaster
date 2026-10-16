"use client";

import { useState } from "react";
import Link from "next/link";
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
  generating: { label: "생성 중...", className: "bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse" },
  completed: { label: "완료", className: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" },
  failed: { label: "실패", className: "bg-rose-500/15 text-rose-400 border border-rose-500/30" },
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
  if (track.mode === "instrumental") return `${prefix}🎹 BGM(배경음악)`;
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
      <div className="rounded-2xl border border-[#272732] bg-[#14141b] p-5 sm:p-6 shadow-xl shadow-black/40 hover:border-[#383848] transition-colors">
        <div className="flex items-center justify-between mb-4 gap-2">
          <p className="font-bold text-base text-white flex items-center gap-2">
            <span>🎵</span>
            <span>{trackTitleLabel(track)}</span>
          </p>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${badge.className}`}>{badge.label}</span>
        </div>

        {track.status === "failed" && track.error_message && (
          <p className="mb-4 text-xs text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded-xl px-4 py-2.5">
            ⚠️ {track.error_message}
          </p>
        )}

        {track.status === "generating" && (
          <div className="mb-4">
            <button
              type="button"
              onClick={handleSyncStatus}
              disabled={isSyncing}
              className="text-xs font-bold text-orange-400 hover:text-orange-300 disabled:opacity-60 transition-colors flex items-center gap-1.5"
            >
              <span>{isSyncing ? "⚡ Suno 상태 조회 중..." : "🔄 지금 상태 새로고침 (Suno 직접 조회)"}</span>
            </button>
            {syncError && <p className="mt-1.5 text-xs text-rose-400">{syncError}</p>}
          </div>
        )}

        {track.music_track_variants.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 mb-5">
            {track.music_track_variants.map((variant, index) => {
              const latestMr =
                variant.music_track_mr.length > 0 ? variant.music_track_mr[variant.music_track_mr.length - 1] : null;
              const latestWav =
                variant.music_track_wav.length > 0 ? variant.music_track_wav[variant.music_track_wav.length - 1] : null;
              return (
                <div key={variant.id} className="rounded-xl border border-[#272738] bg-[#1a1926] p-3.5 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-orange-400">변주곡 #{index + 1}</span>
                    {variant.duration_seconds && (
                      <span className="text-[11px] text-zinc-400 font-mono">{variant.duration_seconds}초</span>
                    )}
                  </div>
                  {variant.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={variant.image_url}
                      alt={`${track.title} 커버 ${index + 1}`}
                      className="w-full rounded-xl aspect-square object-cover cursor-zoom-in ring-1 ring-[#343448] hover:ring-orange-500/40 transition-all"
                      onClick={() => setLightboxUrl(variant.image_url)}
                    />
                  )}
                  <audio controls src={variant.audio_url} className="w-full opacity-90 hover:opacity-100" />
                  {variant.suno_audio_id && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleExtend(variant.id)}
                        disabled={extendingVariantId !== null}
                        className="px-3 py-1.5 rounded-full text-xs font-bold border border-[#2d2d3e] bg-[#20202e] text-zinc-300 hover:text-white hover:border-orange-500/40 hover:bg-[#28283a] disabled:opacity-50 transition-all flex items-center gap-1"
                      >
                        <span>🔁</span>
                        <span>{extendingVariantId === variant.id ? "연장 중..." : "곡 연장하기"}</span>
                      </button>
                      <Link
                        href={`/remix/new?fromVariantId=${variant.id}`}
                        className="px-3 py-1.5 rounded-full text-xs font-bold border border-[#2d2d3e] bg-[#20202e] text-zinc-300 hover:text-white hover:border-orange-500/40 hover:bg-[#28283a] transition-all flex items-center gap-1"
                      >
                        <span>🎛️</span>
                        <span>리믹스하기</span>
                      </Link>
                      {!latestMr && (
                        <button
                          type="button"
                          onClick={() => handleCreateMr(variant.id)}
                          disabled={mrPendingVariantId !== null}
                          className="px-3 py-1.5 rounded-full text-xs font-bold border border-[#2d2d3e] bg-[#20202e] text-zinc-300 hover:text-white hover:border-orange-500/40 hover:bg-[#28283a] disabled:opacity-50 transition-all flex items-center gap-1"
                        >
                          <span>🎧</span>
                          <span>{mrPendingVariantId === variant.id ? "MR 분리 중..." : "MR(보컬제거)"}</span>
                        </button>
                      )}
                      {latestMr?.status === "failed" && (
                        <button
                          type="button"
                          onClick={() => handleCreateMr(variant.id)}
                          disabled={mrPendingVariantId !== null}
                          className="px-3 py-1.5 rounded-full text-xs font-bold border border-rose-500/30 bg-rose-950/40 text-rose-300 hover:bg-rose-900/40 disabled:opacity-50 transition-all flex items-center gap-1"
                        >
                          <span>🎧</span>
                          <span>MR 다시 시도</span>
                        </button>
                      )}
                      {!latestWav && (
                        <button
                          type="button"
                          onClick={() => handleCreateWav(variant.id)}
                          disabled={wavPendingVariantId !== null}
                          className="px-3 py-1.5 rounded-full text-xs font-bold border border-[#2d2d3e] bg-[#20202e] text-zinc-300 hover:text-white hover:border-orange-500/40 hover:bg-[#28283a] disabled:opacity-50 transition-all flex items-center gap-1"
                        >
                          <span>🎼</span>
                          <span>{wavPendingVariantId === variant.id ? "변환 요청 중..." : "WAV 고음질"}</span>
                        </button>
                      )}
                      {latestWav?.status === "failed" && (
                        <button
                          type="button"
                          onClick={() => handleCreateWav(variant.id)}
                          disabled={wavPendingVariantId !== null}
                          className="px-3 py-1.5 rounded-full text-xs font-bold border border-rose-500/30 bg-rose-950/40 text-rose-300 hover:bg-rose-900/40 disabled:opacity-50 transition-all flex items-center gap-1"
                        >
                          <span>🎼</span>
                          <span>WAV 다시 시도</span>
                        </button>
                      )}
                    </div>
                  )}
                  {latestMr?.status === "generating" && (
                    <p className="text-[11px] text-amber-400 bg-amber-950/30 border border-amber-500/20 rounded-lg p-2">
                      🎧 MR 추출 진행 중... (완료 시 자동 반영됩니다)
                    </p>
                  )}
                  {latestMr?.status === "failed" && (
                    <p className="text-[11px] text-rose-400 bg-rose-950/30 border border-rose-500/20 rounded-lg p-2">
                      ⚠️ {latestMr.error_message ?? "MR 생성에 실패했습니다."}
                    </p>
                  )}
                  {latestMr?.status === "completed" && latestMr.instrumental_url && (
                    <div className="space-y-1.5 pt-1 border-t border-[#2a2a3c]">
                      <p className="text-[11px] font-bold text-zinc-300">🎧 분리된 MR (보컬 제거 반주)</p>
                      <audio controls src={latestMr.instrumental_url} className="w-full" />
                    </div>
                  )}
                  {latestWav?.status === "generating" && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => handleSyncWav(latestWav.id)}
                        disabled={wavSyncingId !== null}
                        className="text-xs font-bold text-orange-400 hover:text-orange-300 disabled:opacity-60 flex items-center gap-1"
                      >
                        <span>{wavSyncingId === latestWav.id ? "확인 중..." : "🎼 WAV 변환 상태 조회"}</span>
                      </button>
                    </div>
                  )}
                  {latestWav?.status === "failed" && (
                    <p className="text-[11px] text-rose-400 bg-rose-950/30 border border-rose-500/20 rounded-lg p-2">
                      ⚠️ {latestWav.error_message ?? "WAV 변환에 실패했습니다."}
                    </p>
                  )}
                  {latestWav?.status === "completed" && latestWav.wav_url && (
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#2a2a3c]">
                      <p className="text-[11px] font-bold text-zinc-300">🎼 24bit 무손실 WAV</p>
                      <a
                        href={latestWav.wav_url}
                        download
                        className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm transition-colors"
                      >
                        ⬇ WAV 다운로드
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {extendError && (
          <p className="mb-3 text-xs text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded-xl px-3 py-2">
            {extendError}
          </p>
        )}
        {mrError && (
          <p className="mb-3 text-xs text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded-xl px-3 py-2">
            {mrError}
          </p>
        )}
        {wavError && (
          <p className="mb-3 text-xs text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded-xl px-3 py-2">
            {wavError}
          </p>
        )}

        {/* 인스트루멘탈판 삭제 버튼 */}
        {track.mode === "instrumental" && track.status !== "generating" && (
          <div className="mt-2 space-y-2 border-t border-[#252535] pt-3">
            {deleteError && (
              <p className="text-xs text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded-xl px-3 py-2">
                {deleteError}
              </p>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-1.5 rounded-full text-xs font-semibold text-rose-400 border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-60 transition-colors"
              >
                {isDeleting ? "삭제 중..." : "이 트랙 삭제"}
              </button>
            </div>
          </div>
        )}

        {track.mode === "vocal" && (
          <div className="mt-4 space-y-4 border-t border-[#252535] pt-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-zinc-300">트랙 가사 편집</label>
                <span className="text-[11px] text-zinc-400">가사를 수정한 후 재생성할 수 있습니다</span>
              </div>
              <textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                rows={8}
                className="input text-xs font-mono whitespace-pre-wrap leading-relaxed"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">성별</label>
                <select
                  value={vocalGender}
                  onChange={(e) => setVocalGender(e.target.value as VocalGender | "")}
                  className="input text-xs w-28 py-1.5"
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
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">언어</label>
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  className="input text-xs w-28 py-1.5"
                >
                  {LANG_OPTIONS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">곡수</label>
                <select
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="input text-xs w-24 py-1.5 text-center font-bold"
                >
                  {COUNT_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}곡
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowTagOptions((v) => !v)}
                className="text-xs font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1.5 transition-colors"
              >
                <span>{showTagOptions ? "▲ 세부 스타일 칩 닫기" : "▼ 세부 스타일 칩 변경 (선택 사항)"}</span>
                {hasTagOverride && !showTagOptions && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-orange-500/20 text-orange-300">
                    {selectedTagCount}개 선택됨
                  </span>
                )}
              </button>
            </div>

            {showTagOptions && (
              <div className="space-y-3.5 rounded-xl border border-[#272738] bg-[#12121a] p-4 animate-in fade-in duration-200">
                <div>
                  <p className="mb-1.5 text-xs font-bold text-zinc-300">장르 (최대 {GENRE_MAX_SELECT}개)</p>
                  <TagChips options={GENRE_OPTIONS} selected={genreTags} max={GENRE_MAX_SELECT} onToggle={toggleGenre} />
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-bold text-zinc-300">무드 (최대 {MOOD_MAX_SELECT}개)</p>
                  <TagChips options={MOOD_OPTIONS} selected={moodTags} max={MOOD_MAX_SELECT} onToggle={toggleMood} />
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-bold text-zinc-300">악기 (최대 {INSTRUMENT_MAX_SELECT}개)</p>
                  <TagChips
                    options={INSTRUMENT_OPTIONS}
                    selected={instrumentTags}
                    max={INSTRUMENT_MAX_SELECT}
                    onToggle={toggleInstrument}
                  />
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-bold text-zinc-300">보컬톤 (최대 {VOCAL_TONE_MAX_SELECT}개)</p>
                  <TagChips
                    options={VOCAL_TONE_OPTIONS}
                    selected={vocalToneTags}
                    max={VOCAL_TONE_MAX_SELECT}
                    onToggle={toggleVocalTone}
                  />
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-bold text-zinc-300">템포 (최대 {TEMPO_MAX_SELECT}개)</p>
                  <TagChips options={TEMPO_OPTIONS} selected={tempoTags} max={TEMPO_MAX_SELECT} onToggle={toggleTempo} />
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded-xl px-3 py-2">
                {error}
              </p>
            )}
            {deleteError && (
              <p className="text-xs text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded-xl px-3 py-2">
                {deleteError}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={isPending}
                className="px-5 py-2.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-md shadow-orange-500/20 disabled:opacity-60 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {isPending ? "⚡ Suno 재생성 요청 중..." : "🎼 이 가사로 음악 재생성"}
              </button>
              {track.status !== "generating" && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-rose-400 border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-60 transition-colors"
                >
                  {isDeleting ? "삭제 중..." : "이 트랙 삭제"}
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
