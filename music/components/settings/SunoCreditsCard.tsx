"use client";

import { useState } from "react";
import { checkSunoCreditsAction } from "@/lib/actions/settings";

/** 등록된 Suno API 키에 남은 크레딧을 조회한다. */
export function SunoCreditsCard() {
  const [credits, setCredits] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleCheck() {
    setError(null);
    setIsPending(true);
    try {
      const result = await checkSunoCreditsAction();
      if (result.error) {
        setError(result.error);
      } else if (result.credits != null) {
        setCredits(result.credits);
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-[#272738] bg-[#1a1926] p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs sm:text-sm font-bold text-zinc-100 flex items-center gap-1.5">
          <span>🎫</span>
          <span>Suno API 잔여 크레딧</span>
        </p>
        <button
          type="button"
          onClick={handleCheck}
          disabled={isPending}
          className="text-xs font-bold text-orange-400 hover:text-orange-300 disabled:opacity-50 transition-colors"
        >
          {isPending ? "조회 중..." : "🔄 잔여 크레딧 확인"}
        </button>
      </div>

      {credits != null && (
        <p className="text-xs sm:text-sm text-zinc-300">
          남은 크레딧: <span className="font-mono font-black text-orange-400 text-base">{credits.toLocaleString()}</span> Credits
        </p>
      )}
      {error && <p className="text-xs text-rose-400">⚠️ {error}</p>}
      {credits == null && !error && (
        <p className="text-[11px] text-zinc-400">등록된 본인 Suno API 키의 남은 크레딧 잔여량을 실시간 확인합니다.</p>
      )}
    </div>
  );
}
