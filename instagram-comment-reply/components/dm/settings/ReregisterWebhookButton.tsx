"use client";

import { useState } from "react";
import { reregisterTelegramWebhookAction } from "@/lib/dmApp/actions/telegram";

/** 승인 버튼이 응답하지 않을 때 쓰는 자가 복구 버튼(텔레그램 웹훅 재등록). */
export function ReregisterWebhookButton() {
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setIsPending(true);
    setMessage(null);
    try {
      const result = await reregisterTelegramWebhookAction();
      setMessage(result.error ? `⚠️ ${result.error}` : `✅ ${result.success}`);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-lg border border-ig-border bg-ig-raised px-4 py-2 text-xs font-semibold text-ig-muted hover:bg-ig-hover disabled:opacity-60"
      >
        {isPending ? "재등록 중..." : "🔄 승인 버튼이 안 눌러지면: 텔레그램 웹훅 재등록"}
      </button>
      {message && <p className="text-xs text-ig-muted">{message}</p>}
    </div>
  );
}
