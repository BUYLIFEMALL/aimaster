"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateTracksAction } from "@/lib/actions/tracks";
import { ApiKeyRequiredModal } from "@/components/settings/ApiKeyRequiredModal";
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
import type { TrackMode, VocalGender } from "@/types/database.types";

const PROVIDER_LABELS: Record<string, string> = { openai: "OpenAI", suno: "Suno" };
const COUNT_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1); // 1~10

export function GenerateTracksPanel({
  planningId,
  planningVocalGender,
  planningLang,
}: {
  planningId: string;
  planningVocalGender: VocalGender | null;
  planningLang: string;
}) {
  const router = useRouter();
  const [vocal, setVocal] = useState(false);
  const [instrumental, setInstrumental] = useState(false);
  const [vocalGender, setVocalGender] = useState<VocalGender | "">(planningVocalGender ?? "");
  const [lang, setLang] = useState(planningLang);
  const [count, setCount] = useState(1);
  // 2026-10-21 sunoapi.org V6(docs/SUNOAPI_REFERENCE.md): 모델과 결과 다양성 선택.
  const [sunoModel, setSunoModel] = useState("V6");
  const [variety, setVariety] = useState("");
  const [genreTags, setGenreTags] = useState<string[]>([]);
  const [moodTags, setMoodTags] = useState<string[]>([]);
  const [instrumentTags, setInstrumentTags] = useState<string[]>([]);
  const [vocalToneTags, setVocalToneTags] = useState<string[]>([]);
  const [tempoTags, setTempoTags] = useState<string[]>([]);
  const [showTagOptions, setShowTagOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [missingProvider, setMissingProvider] = useState<string | null>(null);

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

  async function handleGenerate() {
    setError(null);
    const modes: TrackMode[] = [];
    if (vocal) modes.push("vocal");
    if (instrumental) modes.push("instrumental");
    if (modes.length === 0) {
      setError("생성할 버전을 하나 이상 선택해주세요.");
      return;
    }

    setIsPending(true);
    try {
      const result = await generateTracksAction(planningId, modes, {
        count,
        vocalGender: vocalGender || null,
        lang,
        genre: genreTags,
        mood: moodTags,
        instruments: instrumentTags,
        vocalTone: vocalToneTags,
        tempo: tempoTags,
        model: sunoModel,
        variety: variety === "" ? undefined : Number(variety),
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

  const totalTracks = (vocal ? count : 0) + (instrumental ? count : 0);
  const selectedTagCount =
    genreTags.length + moodTags.length + instrumentTags.length + vocalToneTags.length + tempoTags.length;
  const hasTagOverride = selectedTagCount > 0;
  const showVocalOptions = vocal;

  return (
    <>
      <div className="rounded-2xl border border-[#272732] bg-[#14141b] p-5 sm:p-6 shadow-xl shadow-black/40">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <p className="text-base font-black text-white">Suno AI 음악 생성 콘솔</p>
          </div>
          <span className="text-[11px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
            ENGINE READY
          </span>
        </div>

        {/* 생성 모드 선택 (보컬 / BGM) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <label
            className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
              vocal
                ? "bg-orange-500/15 border-orange-500/50 text-white shadow-sm"
                : "bg-[#181824] border-[#272738] text-zinc-300 hover:border-[#383848]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-lg">🎤</span>
              <div>
                <p className="text-xs font-bold">보컬 버전</p>
                <p className="text-[10px] text-zinc-400">가사와 AI 보컬이 포함된 완곡</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={vocal}
              onChange={(e) => setVocal(e.target.checked)}
              className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500/50 border-[#383848] bg-[#121218]"
            />
          </label>

          <label
            className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
              instrumental
                ? "bg-amber-500/15 border-amber-500/50 text-white shadow-sm"
                : "bg-[#181824] border-[#272738] text-zinc-300 hover:border-[#383848]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-lg">🎹</span>
              <div>
                <p className="text-xs font-bold">인스트루멘탈 (BGM)</p>
                <p className="text-[10px] text-zinc-400">보컬 없는 고품질 악기 연주 음원</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={instrumental}
              onChange={(e) => setInstrumental(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500/50 border-[#383848] bg-[#121218]"
            />
          </label>
        </div>

        {/* 보컬 및 수량 옵션 */}
        <div className="flex flex-wrap items-center gap-4 mb-4 rounded-xl border border-[#272738] bg-[#181824] p-3.5">
          {showVocalOptions && (
            <>
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">보컬 성별</label>
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
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">가사 언어</label>
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
            </>
          )}
          <div>
            <label className="block text-[11px] font-bold text-zinc-400 mb-1">생성 수량 (대량생성)</label>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="input text-xs w-24 py-1.5 text-center font-bold"
            >
              {COUNT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}곡 세트
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-zinc-400 mb-1">Suno 엔진</label>
            <select
              value={sunoModel}
              onChange={(e) => setSunoModel(e.target.value)}
              className="input text-xs py-1.5 font-bold"
            >
              <option value="V6">V6 (기본·권장)</option>
              <option value="V6_WILD">V6 Wild — 더 실험적</option>
              <option value="V6_MINI">V6 Mini — 가볍고 빠름</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-zinc-400 mb-1">결과 다양성</label>
            <select
              value={variety}
              onChange={(e) => setVariety(e.target.value)}
              className="input text-xs py-1.5 font-bold"
            >
              <option value="">기본(보통)</option>
              <option value="0">끔 — 기획에 가장 충실</option>
              <option value="2">높음</option>
              <option value="3">대담</option>
              <option value="4">최대</option>
            </select>
          </div>
        </div>

        {/* 세부 스타일 칩 토글 버튼 */}
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setShowTagOptions((v) => !v)}
            className="text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1.5"
          >
            <span>{showTagOptions ? "▲ 세부 장르/무드/악기 칩 닫기" : "▼ 세부 장르/무드/악기 칩 선택 (선택 사항)"}</span>
            {hasTagOverride && !showTagOptions && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-orange-500/20 text-orange-300 border border-orange-500/30">
                {selectedTagCount}개 활성
              </span>
            )}
          </button>
        </div>

        {showTagOptions && (
          <div className="mb-4 space-y-4 rounded-xl border border-[#272738] bg-[#12121a] p-4 animate-in fade-in duration-200">
            <div>
              <p className="mb-2 text-xs font-bold text-zinc-300">
                장르 (최대 {GENRE_MAX_SELECT}개)
              </p>
              <TagChips options={GENRE_OPTIONS} selected={genreTags} max={GENRE_MAX_SELECT} onToggle={toggleGenre} />
            </div>
            <div>
              <p className="mb-2 text-xs font-bold text-zinc-300">무드 (최대 {MOOD_MAX_SELECT}개)</p>
              <TagChips options={MOOD_OPTIONS} selected={moodTags} max={MOOD_MAX_SELECT} onToggle={toggleMood} />
            </div>
            <div>
              <p className="mb-2 text-xs font-bold text-zinc-300">
                악기 사운드 (최대 {INSTRUMENT_MAX_SELECT}개)
              </p>
              <TagChips
                options={INSTRUMENT_OPTIONS}
                selected={instrumentTags}
                max={INSTRUMENT_MAX_SELECT}
                onToggle={toggleInstrument}
              />
            </div>
            {showVocalOptions && (
              <div>
                <p className="mb-2 text-xs font-bold text-zinc-300">
                  보컬 톤 (최대 {VOCAL_TONE_MAX_SELECT}개)
                </p>
                <TagChips
                  options={VOCAL_TONE_OPTIONS}
                  selected={vocalToneTags}
                  max={VOCAL_TONE_MAX_SELECT}
                  onToggle={toggleVocalTone}
                />
              </div>
            )}
            <div>
              <p className="mb-2 text-xs font-bold text-zinc-300">템포/비트 (최대 {TEMPO_MAX_SELECT}개)</p>
              <TagChips options={TEMPO_OPTIONS} selected={tempoTags} max={TEMPO_MAX_SELECT} onToggle={toggleTempo} />
            </div>
          </div>
        )}

        <div className="mb-4 rounded-xl border border-[#242434] bg-[#111118] p-3 text-[11px] text-zinc-400 leading-relaxed">
          💡 한 번 생성 시 Suno 공식 엔진에서 <strong>2개의 변주곡(Variant)</strong>이 세트로 만들어집니다.
          {totalTracks > 0 && ` 이번 요청 시 총 ${totalTracks}개의 음악 세트가 생성됩니다.`}
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300">
            ⚠️ {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={isPending}
          className="w-full rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-60 text-white font-black py-3.5 px-6 shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] text-sm tracking-wide"
        >
          {isPending ? "⚡ Suno AI 음악 생성 요청 중..." : "🚀 지금 음악 생성하기"}
        </button>
      </div>

      {missingProvider && (
        <ApiKeyRequiredModal
          missingLabels={[PROVIDER_LABELS[missingProvider] ?? missingProvider]}
          onClose={() => setMissingProvider(null)}
        />
      )}
    </>
  );
}
