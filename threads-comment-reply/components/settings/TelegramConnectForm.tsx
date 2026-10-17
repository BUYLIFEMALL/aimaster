"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { connectTelegramAction } from "@/lib/actions/telegram";

export function TelegramConnectForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsPending(true);
    try {
      const result = await connectTelegramAction({}, new FormData(e.currentTarget));
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(result.success ?? "연동이 완료됐어요.");
        router.refresh();
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        name="botToken"
        placeholder="봇 토큰 (예: 123456:AAF...)"
        required
        autoComplete="off"
        className="input"
      />
      {error && <p className="text-sm text-th-danger bg-th-danger/10 rounded-lg px-3 py-2">{error}</p>}
      {success && <p className="text-sm text-th-success">{success}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="w-full disabled:opacity-60 text-black font-bold py-3 px-4 rounded-full transition-all bg-th-primary hover:bg-white"
      >
        {isPending ? "확인 중..." : "연동 확인하기"}
      </button>
    </form>
  );
}
