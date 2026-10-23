"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { syncCommentsAction } from "@/lib/actions/comments";
import { ApiKeyRequiredModal } from "@/components/settings/ApiKeyRequiredModal";

export function SyncCommentsButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [missingProvider, setMissingProvider] = useState<string | null>(null);

  async function handleClick() {
    setIsPending(true);
    setError(null);
    setResult(null);
    try {
      const res = await syncCommentsAction();
      if (res.needsApiKey) setMissingProvider(res.needsApiKey);
      else if (res.error) setError(res.error);
      else {
        setResult(`새 댓글 ${res.newCount ?? 0}건을 가져와 답글 초안을 만들었어요.`);
        router.refresh();
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <div>
        <button
          type="button"
          onClick={handleClick}
          disabled={isPending}
          className="th-btn-primary"
        >
          {isPending ? "확인 중..." : "🔄 지금 새 댓글 확인하기"}
        </button>
        {result && <p className="mt-2 text-xs text-th-success">{result}</p>}
        {error && <p className="mt-2 text-xs text-th-danger">{error}</p>}
      </div>
      {missingProvider && <ApiKeyRequiredModal provider={missingProvider} onClose={() => setMissingProvider(null)} />}
    </>
  );
}
