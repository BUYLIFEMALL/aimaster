"use client";

import { useState } from "react";
import { checkSunoCreditsAction } from "@/lib/actions/settings";

/** 등록된 Suno API 키에 남은 크레딧을 조회한다. 곡 생성과 무관한 단순 조회 버튼. */
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
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800">🎫 Suno API 크레딧</p>
        <button
          type="button"
          onClick={handleCheck}
          disabled={isPending}
          className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-60"
        >
          {isPending ? "조회 중..." : "크레딧 조회"}
        </button>
      </div>

      {credits != null && (
        <p className="text-sm text-gray-700">
          남은 크레딧: <span className="font-bold text-gray-900">{credits.toLocaleString()}</span>
        </p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {credits == null && !error && (
        <p className="text-xs text-gray-400">등록된 본인 Suno API 키의 남은 크레딧을 확인합니다.</p>
      )}
    </div>
  );
}
