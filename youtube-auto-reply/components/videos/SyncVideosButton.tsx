"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { syncVideosAction } from "@/lib/actions/videos";

export function SyncVideosButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function handleClick() {
    setIsPending(true);
    setError(null);
    setResult(null);
    try {
      const res = await syncVideosAction();
      if (res.error) setError(res.error);
      else {
        setResult(`${res.syncedCount ?? 0}개 영상을 동기화했어요.`);
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
        className="yt-btn-red"
      >
        {isPending ? "동기화 중..." : "🔄 채널 영상 동기화"}
      </button>
      {result && <p className="mt-2 text-xs text-yt-success">{result}</p>}
      {error && <p className="mt-2 text-xs text-yt-danger">{error}</p>}
    </div>
  );
}
