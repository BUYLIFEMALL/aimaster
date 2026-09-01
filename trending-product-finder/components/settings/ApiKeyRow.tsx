"use client";

import { useState } from "react";
import { saveApiKeyAction, deleteApiKeyAction } from "@/lib/actions/settings";
import type { ApiKeyProvider } from "@/types/database.types";

interface ApiKeyRowProps {
  provider: ApiKeyProvider;
  label: string;
  maskedValue: string | null;
  helpUrl?: string;
  helpLabel?: string;
  helpDescription?: string;
  helpWarning?: React.ReactNode;
}

export function ApiKeyRow({ provider, label, maskedValue, helpUrl, helpLabel, helpDescription, helpWarning }: ApiKeyRowProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsPending(true);
    try {
      const result = await saveApiKeyAction(new FormData(e.currentTarget));
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        {maskedValue && (
          <form action={deleteApiKeyAction}>
            <input type="hidden" name="provider" value={provider} />
            <button type="submit" className="text-xs text-red-500 hover:text-red-700">
              삭제
            </button>
          </form>
        )}
      </div>

      {maskedValue ? (
        <p className="font-mono text-sm text-gray-500">{maskedValue} · 등록됨</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
          <input type="hidden" name="provider" value={provider} />
          <input
            name="apiKey"
            type="password"
            placeholder="API 키 입력"
            autoComplete="new-password"
            className="input-sm flex-1 min-w-[200px]"
          />
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 hover:bg-gray-200 disabled:opacity-60 transition-colors"
          >
            {isPending ? "저장 중..." : "저장"}
          </button>
        </form>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {success && <p className="mt-1 text-xs text-green-600">저장되었습니다.</p>}
      {helpWarning && (
        <div className="mt-2 space-y-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-800">
          <p className="font-bold">⚠️ 주의</p>
          {helpWarning}
        </div>
      )}
      {helpUrl && (
        <div className="mt-2">
          <a href={helpUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
            {helpLabel ?? "API 키 발급받기"}
          </a>
          {helpDescription && <p className="mt-1 text-xs text-gray-400">{helpDescription}</p>}
        </div>
      )}
    </div>
  );
}
