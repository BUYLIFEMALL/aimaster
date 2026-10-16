"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { planMusicAction } from "@/lib/actions/plannings";
import { ApiKeyRequiredModal } from "@/components/settings/ApiKeyRequiredModal";
import { LANG_OPTIONS, VOCAL_GENDER_OPTIONS } from "@/lib/constants";

export function PlanningForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const result = await planMusicAction(new FormData(e.currentTarget));
      if (result.needsApiKey) {
        setShowApiKeyModal(true);
      } else if (result.error) {
        setError(result.error);
      } else if (result.planningId) {
        router.push(`/plannings/${result.planningId}`);
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
        <div>
          <label className="block text-xs font-bold text-zinc-300 mb-1.5">
            곡 컨셉 & 분위기 설명 <span className="text-orange-400">*</span>
          </label>
          <textarea
            name="songDescription"
            required
            rows={4}
            placeholder="예: 늦은 밤 비 내리는 서울 도로를 달리며 듣는 감성적인 R&B 발라드. 그루브한 베이스와 애절한 피아노 선율, 남녀 듀엣 보컬"
            className="input text-sm leading-relaxed"
          />
          <p className="mt-1.5 text-[11px] text-zinc-400">
            주제, 장르, 계절, 감정 상태 등을 편안하게 적어주시면 AI가 최적의 Suno 프롬프트를 설계합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300">
            ⚠️ {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-60 text-white font-black py-4 px-6 shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] text-sm tracking-wide"
        >
          {isPending ? "⚡ AI가 곡 기획 및 프롬프트 설계 중..." : "🎼 곡 기획 시작하기"}
        </button>
      </form>

      {showApiKeyModal && (
        <ApiKeyRequiredModal missingLabels={["OpenAI"]} onClose={() => setShowApiKeyModal(false)} />
      )}
    </>
  );
}
