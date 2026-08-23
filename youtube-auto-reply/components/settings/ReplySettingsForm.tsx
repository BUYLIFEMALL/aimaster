"use client";

import { useState } from "react";
import { saveReplySettingsAction } from "@/lib/actions/settings";

export function ReplySettingsForm({
  defaultLink,
  aiInstructions,
}: {
  defaultLink: string | null;
  aiInstructions: string | null;
}) {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSuccess(false);
    setError(null);
    setIsPending(true);
    try {
      const result = await saveReplySettingsAction(new FormData(e.currentTarget));
      if (result.error) setError(result.error);
      else setSuccess(true);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">채널 기본 링크</label>
        <input
          name="defaultLink"
          type="url"
          defaultValue={defaultLink ?? ""}
          placeholder="https://..."
          className="input"
        />
        <p className="mt-1 text-xs text-gray-400">
          영상별로 별도 링크를 지정하지 않으면 이 링크가 답글에 사용됩니다.
        </p>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">답글 톤/지시사항 (선택)</label>
        <textarea
          name="aiInstructions"
          defaultValue={aiInstructions ?? ""}
          rows={3}
          placeholder="예: 반말 대신 존댓말 사용, 이모지는 쓰지 않기 등"
          className="input"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-60"
      >
        {isPending ? "저장 중..." : "저장"}
      </button>
      {success && <p className="text-sm text-green-600">저장됐습니다.</p>}
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
    </form>
  );
}
