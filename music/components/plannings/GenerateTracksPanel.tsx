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
  // 기본값으로 미리 체크해두지 않는다 — 사용자가 매번 원하는 버전을 직접 선택하게 한다.
  const [vocal, setVocal] = useState(false);
  const [instrumental, setInstrumental] = useState(false);
  const [vocalGender, setVocalGender] = useState<VocalGender | "">(planningVocalGender ?? "");
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
  const willUseAi = vocalGender !== (planningVocalGender ?? "") || lang !== planningLang || hasTagOverride;
  // 성별/언어는 가사가 있는 보컬버전에만 의미가 있다 — 인스트루멘탈만 선택했을 때는 숨긴다.
  const showVocalOptions = vocal;

  return (
    <>
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <p className="text-sm font-semibold text-gray-800 mb-3">생성하기</p>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={vocal} onChange={(e) => setVocal(e.target.checked)} />
            보컬버전 (가사 포함)
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={instrumental}
              onChange={(e) => setInstrumental(e.target.checked)}
            />
            인스트루멘탈버전 (반주만)
          </label>
        </div>

        <div className="flex flex-wrap gap-3 mb-2">
          {showVocalOptions && (
            <>
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
            </>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">생성 개수(대량생성)</label>
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
          className="mb-2 text-xs font-semibold text-blue-600 hover:underline"
        >
          {showTagOptions ? "▲ 장르/무드/악기/보컬톤/템포 추가 옵션 닫기" : "▼ 장르/무드/악기/보컬톤/템포 추가 옵션 (선택)"}
          {hasTagOverride && !showTagOptions && ` — ${selectedTagCount}개 선택됨`}
        </button>

        {showTagOptions && (
          <div className="mb-3 space-y-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3">
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
            {showVocalOptions && (
              <div>
                <p className="mb-1.5 text-xs font-semibold text-gray-500">
                  보컬톤 (최대 {VOCAL_TONE_MAX_SELECT}개, 보컬버전에만 적용)
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
              <p className="mb-1.5 text-xs font-semibold text-gray-500">템포 (최대 {TEMPO_MAX_SELECT}개)</p>
              <TagChips options={TEMPO_OPTIONS} selected={tempoTags} max={TEMPO_MAX_SELECT} onToggle={toggleTempo} />
            </div>
            <p className="text-xs text-gray-400">
              기획된 스타일 위에 이 태그들을 반드시 반영해서 새 스타일을 만듭니다(보컬톤 제외 나머지는
              보컬/인스트루멘탈 둘 다 적용). 기획 자체는 바뀌지 않고, 이번 생성에만 적용됩니다.
            </p>
          </div>
        )}

        <p className="mb-4 text-xs text-gray-400">
          {showVocalOptions &&
            (willUseAi
              ? "성별/언어/태그를 기획과 다르게 선택했습니다 — 기획 내용은 그대로 두고, 이번 생성만 선택한 값으로 만듭니다. "
              : "기획에서 정한 성별/언어 그대로 생성합니다. ")}
          {instrumental && "인스트루멘탈버전은 가사/보컬 없이 반주만 생성됩니다(성별·언어와 무관). "}
          2곡 이상 선택하면 첫 곡은 기획된 스타일 그대로(성별을 바꿨거나 인스트루멘탈이거나 태그를
          추가했으면 새 스타일부터), 나머지는 AI가 겹치지 않는 새 스타일 변주를 만들어 각각 다른
          느낌으로 생성합니다. 선택한 버전별로 매번 OpenAI/Suno API가 호출되니 개수만큼 비용이
          늘어납니다
          {totalTracks > 0 && ` (이번에 총 ${totalTracks}곡 생성)`}.
        </p>

        {error && <p className="mb-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isPending}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-60 text-white font-bold py-2.5 px-4 rounded-xl transition-all"
        >
          {isPending ? "생성 요청 중... (개수가 많으면 시간이 걸릴 수 있어요)" : "생성하기"}
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
