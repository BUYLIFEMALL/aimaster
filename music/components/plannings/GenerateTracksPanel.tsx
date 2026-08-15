"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateTracksAction } from "@/lib/actions/tracks";
import { ApiKeyRequiredModal } from "@/components/settings/ApiKeyRequiredModal";
import { LANG_OPTIONS, VOCAL_GENDER_OPTIONS } from "@/lib/constants";
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
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [missingProvider, setMissingProvider] = useState<string | null>(null);

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
  const willUseAi = vocalGender !== (planningVocalGender ?? "") || lang !== planningLang;
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

        <p className="mb-4 text-xs text-gray-400">
          {showVocalOptions &&
            (willUseAi
              ? "성별/언어를 기획과 다르게 선택했습니다 — 기획 내용은 그대로 두고, 이번 생성만 선택한 성별/언어로 만듭니다. "
              : "기획에서 정한 성별/언어 그대로 생성합니다. ")}
          {instrumental && "인스트루멘탈버전은 가사/보컬 없이 반주만 생성됩니다(성별·언어와 무관). "}
          2곡 이상 선택하면 첫 곡은 기획된 스타일 그대로(성별을 바꿨거나 인스트루멘탈이면 새
          스타일부터), 나머지는 AI가 겹치지 않는 새 스타일 변주를 만들어 각각 다른 느낌으로
          생성합니다. 선택한 버전별로 매번 OpenAI/Suno API가 호출되니 개수만큼 비용이 늘어납니다
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
