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
        className="th-btn-primary"
      >
        {isPending ? "동기화 중..." : "🔄 계정 게시물 동기화"}
      </button>
      {result && <p className="mt-2 text-xs text-th-success">{result}</p>}
      {error && <p className="mt-2 text-xs text-th-danger">{error}</p>}
    </div>
  );
}
