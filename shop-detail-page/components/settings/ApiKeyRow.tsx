"use client";

import { useState } from "react";
import { saveApiKeyAction, deleteApiKeyAction } from "@/lib/actions/settings";
import type { ApiKeyProvider } from "@/types/database.types";
import { ExternalLink } from "lucide-react";

interface ApiKeyRowProps {
  provider: ApiKeyProvider;
  label: string;
  maskedValue: string | null;
}

const PLATFORM_LINKS: Record<string, { keyUrl: string; keyLabel: string; signupUrl: string; signupLabel: string }> = {
  gemini: {
    keyUrl: "https://aistudio.google.com/app/apikey",
    keyLabel: "🔑 Gemini 키 발급",
    signupUrl: "https://aistudio.google.com/",
    signupLabel: "🌐 AI Studio",
  },
  openai: {
    keyUrl: "https://platform.openai.com/api-keys",
    keyLabel: "🔑 OpenAI 키 발급",
    signupUrl: "https://platform.openai.com/signup",
    signupLabel: "🌐 가입/콘솔",
  },
  anthropic: {
    keyUrl: "https://console.anthropic.com/settings/keys",
    keyLabel: "🔑 Claude 키 발급",
    signupUrl: "https://console.anthropic.com/",
    signupLabel: "🌐 Anthropic",
  },
  replicate: {
    keyUrl: "https://replicate.com/account/api-tokens",
    keyLabel: "🔑 Replicate 토큰 발급",
    signupUrl: "https://replicate.com/signin",
    signupLabel: "🌐 회원가입",
  },
};

export function ApiKeyRow({ provider, label, maskedValue }: ApiKeyRowProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const links = PLATFORM_LINKS[provider];

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

  const quickActionButtons = links ? (
    <div className="flex items-center gap-1.5 flex-wrap">
      <a
        href={links.keyUrl}
        target="_blank"
        rel="noreferrer"
        className="btn-create-key"
        title={`${label} 키를 발급받는 공식 페이지로 이동합니다`}
      >
        <span>{links.keyLabel}</span>
        <ExternalLink size={11} />
      </a>
      <a
        href={links.signupUrl}
        target="_blank"
        rel="noreferrer"
        className="btn-platform-signup"
        title={`${label} 공식 회원가입/콘솔 페이지로 이동합니다`}
      >
        <span>{links.signupLabel}</span>
        <ExternalLink size={11} />
      </a>
    </div>
  ) : null;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-gray-900">{label}</p>
        <div className="flex items-center gap-2">
          {quickActionButtons}
          {maskedValue && !isEditing && (
            <div className="flex items-center gap-2 text-xs font-semibold ml-1">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-blue-600 hover:text-blue-800"
              >
                수정
              </button>
              <form action={deleteApiKeyAction}>
                <input type="hidden" name="provider" value={provider} />
                <button type="submit" className="text-red-500 hover:text-red-700">
                  삭제
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-center">
          <input type="hidden" name="provider" value={provider} />
          <input
            name="apiKey"
            type="password"
            placeholder={maskedValue ? `새 키 입력 (현재: ${maskedValue})` : "API 키 입력"}
            autoComplete="new-password"
            className="input-sm flex-1 min-w-[200px] font-mono"
          />
          <button
            type="submit"
            disabled={isPending}
            className="btn-3d-primary disabled:opacity-60"
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
        <p className="font-mono text-sm text-gray-600 bg-gray-50 px-2.5 py-1 rounded inline-block">
          {maskedValue} · <span className="text-emerald-600 font-bold">등록됨</span>
        </p>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {success && <p className="mt-1 text-xs text-green-600">저장되었습니다.</p>}
    </div>
  );
}
