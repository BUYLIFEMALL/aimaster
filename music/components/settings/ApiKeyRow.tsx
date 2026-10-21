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
}

export function ApiKeyRow({ provider, label, maskedValue, helpUrl, helpLabel, helpDescription }: ApiKeyRowProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);
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
    <div className="rounded-xl border border-[#272738] bg-[#1a1926] p-4 shadow-sm">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <p className="text-xs sm:text-sm font-bold text-zinc-100 min-w-0">{label}</p>
        {maskedValue && !isEditing && (
          <div className="flex items-center gap-3 shrink-0 whitespace-nowrap">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors"
            >
              수정
            </button>
            <form action={deleteApiKeyAction}>
              <input type="hidden" name="provider" value={provider} />
              <button
                type="submit"
                className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors"
              >
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
            className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-60 shadow-sm transition-all"
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
              className="px-3 py-2 rounded-lg text-xs font-semibold border border-[#2e2e42] text-zinc-400 hover:bg-[#222130] hover:text-zinc-200 transition-colors"
            >
              취소
            </button>
          )}
        </form>
      ) : (
        <p className="font-mono text-xs text-zinc-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{maskedValue}</span>
          <span className="text-[11px] text-zinc-400">· 연동 완료</span>
        </p>
      )}
      {error && <p className="mt-2 text-xs text-rose-400">⚠️ {error}</p>}
      {success && <p className="mt-2 text-xs text-emerald-400">✨ 성공적으로 저장되었습니다.</p>}

      {helpUrl && (
        <div className="mt-3 rounded-xl bg-orange-500/10 border border-orange-500/20 px-3.5 py-3">
          <a
            href={helpUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold text-orange-400 hover:text-orange-300 inline-flex items-center gap-1.5 transition-colors"
          >
            <span>🔑</span>
            <span>{helpLabel ?? "API 키 발급받기"}</span>
            <span className="text-[10px]">↗</span>
          </a>
          {helpDescription && (
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-medium text-zinc-400">
              {helpDescription.split("|").map((part, i, arr) => (
                <span key={i} className="inline-flex items-center gap-2">
                  {part.trim()}
                  {i < arr.length - 1 && <span className="text-zinc-600">|</span>}
                </span>
              ))}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
