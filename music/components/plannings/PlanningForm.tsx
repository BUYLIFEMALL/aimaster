"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { planMusicAction } from "@/lib/actions/plannings";
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
import { LENGTH_OPTIONS, TEXT_LIMIT, type PlanOptions, type SongLength } from "@/lib/planOptions";

type TagKey = "genre" | "mood" | "instruments" | "vocalTone" | "tempo";

const TAG_GROUPS: { key: TagKey; title: string; options: { value: string; label: string }[]; max: number }[] = [
  { key: "genre", title: "장르", options: GENRE_OPTIONS, max: GENRE_MAX_SELECT },
  { key: "mood", title: "무드", options: MOOD_OPTIONS, max: MOOD_MAX_SELECT },
  { key: "instruments", title: "악기 사운드", options: INSTRUMENT_OPTIONS, max: INSTRUMENT_MAX_SELECT },
  { key: "vocalTone", title: "보컬 톤", options: VOCAL_TONE_OPTIONS, max: VOCAL_TONE_MAX_SELECT },
  { key: "tempo", title: "템포·비트", options: TEMPO_OPTIONS, max: TEMPO_MAX_SELECT },
];

export function PlanningForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  // v1.52: 세부 설정 — 비워 두면 예전처럼 AI가 정한다.
  const [tags, setTags] = useState<Record<TagKey, string[]>>({
    genre: [],
    mood: [],
    instruments: [],
    vocalTone: [],
    tempo: [],
  });
  const [hook, setHook] = useState("");
  const [keywords, setKeywords] = useState("");
  const [avoid, setAvoid] = useState("");
  const [length, setLength] = useState<SongLength>("normal");

  const tagCount = Object.values(tags).reduce((n, v) => n + v.length, 0);

  function toggle(key: TagKey, value: string) {
    setTags((prev) => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key].filter((v) => v !== value) : [...prev[key], value],
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const fd = new FormData(e.currentTarget);
      const planOptions: PlanOptions = { ...tags, hook, keywords, avoid, length };
      fd.set("planOptions", JSON.stringify(planOptions));
      const result = await planMusicAction(fd);
      if (result.needsApiKey) {
        setShowApiKeyModal(true);
      } else if (result.error) {
        setError(result.error);
      } else if (result.planningId) {
        router.push(`/plannings/${result.planningId}${result.lyricsFailed ? "?lyrics=failed" : ""}`);
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-[#272732] bg-[#14141b] p-6 sm:p-8 shadow-xl shadow-black/40 backdrop-blur-md"
      >
        <ol className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-zinc-400">
          <li className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-orange-200">
            <strong>1. 기획</strong> — 제목·스타일·가사를 한 번에
          </li>
          <li className="rounded-lg border border-[#272738] bg-[#181824] px-3 py-2">
            <strong className="text-zinc-200">2. 가사 확정</strong> — 상세 화면에서 고쳐 확정
          </li>
          <li className="rounded-lg border border-[#272738] bg-[#181824] px-3 py-2">
            <strong className="text-zinc-200">3. 노래 생성</strong> — 확정한 가사로 Suno 생성
          </li>
        </ol>

        <div>
          <label className="block text-xs font-bold text-zinc-300 mb-1.5">
            곡 컨셉 & 분위기 설명 <span className="text-orange-400">*</span>
          </label>
          <textarea
            name="songDescription"
            required
            rows={4}
            maxLength={1500}
            placeholder="예: 늦은 밤 비 내리는 서울 도로를 달리며 듣는 감성적인 R&B 발라드. 헤어진 연인을 떠올리지만 결국 앞으로 나아가는 이야기"
            className="input text-sm leading-relaxed"
          />
          <p className="mt-1.5 text-[11px] text-zinc-400">
            장면·감정·이야기를 구체적으로 적을수록 원하는 곡에 가까워집니다. 이 글은 가사 AI에도 그대로 전달됩니다.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-[#272738] bg-[#1a1926] p-4">
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">보컬 성별 (선택)</label>
            <select name="vocalGender" className="input text-xs" defaultValue="">
              <option value="">미지정 (AI 추천)</option>
              {VOCAL_GENDER_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g === "혼성" ? "혼성(듀엣)" : g}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-xl border border-[#272738] bg-[#1a1926] p-4">
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">가사 언어</label>
            <select name="lang" className="input text-xs" defaultValue="한국어">
              {LANG_OPTIONS.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-xl border border-[#272738] bg-[#1a1926] p-4">
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">곡 길이·구성</label>
            <select
              value={length}
              onChange={(e) => setLength(e.target.value as SongLength)}
              className="input text-xs"
            >
              {LENGTH_OPTIONS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-[#272738] bg-[#12121a] p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-black text-white">🎯 세부 설정 (선택 — 고른 만큼 결과가 덜 랜덤해집니다)</p>
            {tagCount > 0 && (
              <span className="rounded-full border border-orange-500/30 bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold text-orange-300">
                칩 {tagCount}개 선택
              </span>
            )}
          </div>
          {TAG_GROUPS.map((g) => (
            <div key={g.key}>
              <p className="mb-2 text-xs font-bold text-zinc-300">
                {g.title} <span className="font-normal text-zinc-500">(최대 {g.max}개)</span>
              </p>
              <TagChips options={g.options} selected={tags[g.key]} max={g.max} onToggle={(v) => toggle(g.key, v)} />
            </div>
          ))}
          <div className="grid grid-cols-1 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-zinc-300">후렴에 꼭 넣을 구절</span>
              <input
                value={hook}
                maxLength={TEXT_LIMIT.hook}
                onChange={(e) => setHook(e.target.value)}
                placeholder="예: 다시 너에게 갈게"
                className="input text-xs"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-zinc-300">가사에 녹일 단어·이미지</span>
              <input
                value={keywords}
                maxLength={TEXT_LIMIT.keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="예: 은행잎, 자전거 바퀴, 노을, 따뜻한 커피"
                className="input text-xs"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-zinc-300">쓰지 말 단어·표현</span>
              <input
                value={avoid}
                maxLength={TEXT_LIMIT.avoid}
                onChange={(e) => setAvoid(e.target.value)}
                placeholder="예: 눈물, 이별, 영어 문장"
                className="input text-xs"
              />
            </label>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300">
            ⚠️ {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="btn-3d-primary w-full py-4 px-6 text-sm sm:text-base tracking-wide"
        >
          {isPending ? "⚡ AI가 제목·스타일·가사를 기획하는 중... (20초 안팎)" : "🎼 곡 기획 시작하기 (가사까지)"}
        </button>
        <p className="-mt-3 text-center text-[11px] text-zinc-500">
          본인 OpenAI 키로 3번 호출합니다(스타일·제목·가사). 곡 생성(Suno)은 가사를 확정한 뒤 따로 합니다.
        </p>
      </form>

      {showApiKeyModal && (
        <ApiKeyRequiredModal missingLabels={["OpenAI"]} onClose={() => setShowApiKeyModal(false)} />
      )}
    </>
  );
}
