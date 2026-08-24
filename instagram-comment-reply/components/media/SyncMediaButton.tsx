"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { syncMediaAction } from "@/lib/actions/media";

export function SyncMediaButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function handleClick() {
    setIsPending(true);
    setError(null);
    setResult(null);
    try {
      const res = await syncMediaAction();
      if (res.error) setError(res.error);
      else {
        setResult(`${res.syncedCount ?? 0}개 게시물을 동기화했어요.`);
        router.refresh();
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 hover:opacity-90 disabled:opacity-60"
      >
        {isPending ? "동기화 중..." : "🔄 계정 게시물 동기화"}
      </button>
      {result && <p className="mt-2 text-xs text-green-600">{result}</p>}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
