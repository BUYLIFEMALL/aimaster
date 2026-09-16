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
  helpHighlight?: string;
  helpDescription?: string;
}

export function ApiKeyRow({
  provider,
  label,
  maskedValue,
  helpUrl,
  helpLabel,
  helpHighlight,
  helpDescription,
}: ApiKeyRowProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);
  // 이미 등록돼 있어도 "수정"을 누르면 값을 바로 바꿀 수 있게 한다(2026-09-16 사용자 피드백:
  // 그전엔 값을 바꾸려면 삭제 후 재등록해야만 했다).
  const [isEditing, setIsEditing] = useState(false);

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
        setIsEditing(false);
      }
    } finally {
      setIsPending(false);
    }
  }

  const showForm = !maskedValue || isEditing;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        {maskedValue && !isEditing && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-xs text-green-600 hover:text-green-800"
            >
              수정
            </button>
            <form action={deleteApiKeyAction}>
              <input type="hidden" name="provider" value={provider} />
              <button type="submit" className="text-xs text-red-500 hover:text-red-700">
                삭제
              </button>
            </form>
          </div>
        )}
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
          <input type="hidden" name="provider" value={provider} />
          <input
            name="apiKey"
            type="password"
            placeholder={maskedValue ? `새 키 입력 (현재: ${maskedValue})` : "API 키 입력"}
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
          {maskedValue && (
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setError(null);
                setSuccess(false);
              }}
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
          )}
        </form>
      ) : (
        <p className="font-mono text-sm text-gray-500">{maskedValue} · 등록됨</p>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {success && <p className="mt-1 text-xs text-green-600">저장되었습니다.</p>}
      {helpUrl && (
        <div className="mt-2">
          <a href={helpUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
            {helpLabel ?? "API 키 발급받기"}
          </a>
          {helpHighlight && (
            <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-700">
              🎁 {helpHighlight}
            </p>
          )}
          {helpDescription && <p className="mt-1 text-xs text-gray-400">{helpDescription}</p>}
        </div>
      )}
    </div>
  );
}
