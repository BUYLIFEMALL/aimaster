"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateTracksAction } from "@/lib/actions/tracks";
import { ApiKeyRequiredModal } from "@/components/settings/ApiKeyRequiredModal";
import type { TrackMode } from "@/types/database.types";

const PROVIDER_LABELS: Record<string, string> = { openai: "OpenAI", suno: "Suno" };
const COUNT_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1); // 1~10

export function GenerateTracksPanel({ planningId }: { planningId: string }) {
  const router = useRouter();
  // 기본값으로 미리 체크해두지 않는다 — 사용자가 매번 원하는 버전을 직접 선택하게 한다.
  const [vocal, setVocal] = useState(false);
  const [instrumental, setInstrumental] = useState(false);
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
      const result = await generateTracksAction(planningId, modes, count);
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

        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-1">생성 개수</label>
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
          <p className="mt-1 text-xs text-gray-400">
            2곡 이상 선택하면 첫 곡은 기획된 스타일 그대로, 나머지는 AI가 겹치지 않는 새 스타일
            변주를 만들어 각각 다른 느낌으로 생성합니다. 선택한 버전별로 매번 OpenAI/Suno API가
            호출되니 개수만큼 비용이 늘어납니다{totalTracks > 0 && ` (이번에 총 ${totalTracks}곡 생성)`}.
          </p>
        </div>

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
