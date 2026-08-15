"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateTracksAction } from "@/lib/actions/tracks";
import { ApiKeyRequiredModal } from "@/components/settings/ApiKeyRequiredModal";
import type { TrackMode } from "@/types/database.types";

const PROVIDER_LABELS: Record<string, string> = { openai: "OpenAI", suno: "Suno" };

export function GenerateTracksPanel({
  planningId,
  hasVocalTrack,
  hasInstrumentalTrack,
}: {
  planningId: string;
  hasVocalTrack: boolean;
  hasInstrumentalTrack: boolean;
}) {
  const router = useRouter();
  const [vocal, setVocal] = useState(!hasVocalTrack);
  const [instrumental, setInstrumental] = useState(!hasInstrumentalTrack);
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
      const result = await generateTracksAction(planningId, modes);
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

  return (
    <>
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <p className="text-sm font-semibold text-gray-800 mb-3">생성하기</p>
        <div className="flex flex-wrap gap-4 mb-4">
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
        {error && <p className="mb-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isPending}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-60 text-white font-bold py-2.5 px-4 rounded-xl transition-all"
        >
          {isPending ? "생성 요청 중..." : "생성하기"}
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
