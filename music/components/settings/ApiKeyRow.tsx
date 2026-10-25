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

// 4대 핵심 플랫폼 공식 키 발급 및 가입 2단 버튼 메타데이터
const PROVIDER_ACTION_MAP: Record<
  string,
  {
    createKeyUrl: string;
    createKeyLabel: string;
    signupUrl: string;
    signupLabel: string;
    description: string;
  }
> = {
  openai: {
    createKeyUrl: "https://platform.openai.com/api-keys",
    createKeyLabel: "OpenAI 키 발급 바로가기",
    signupUrl: "https://platform.openai.com/signup",
    signupLabel: "OpenAI 가입",
    description: "곡 기획 · 작사 · 가사 자동생성에 필요한 핵심 엔진 키입니다.",
  },
  gemini: {
    createKeyUrl: "https://aistudio.google.com/app/apikey",
    createKeyLabel: "Google Gemini 키 발급 바로가기",
    signupUrl: "https://aistudio.google.com/",
    signupLabel: "Google AI Studio 가입",
    description: "정밀 기획 및 앨범 커버 이미지 생성에 사용되는 고성능 AI 키입니다.",
  },
  anthropic: {
    createKeyUrl: "https://console.anthropic.com/settings/keys",
    createKeyLabel: "Claude 키 발급 바로가기",
    signupUrl: "https://console.anthropic.com/",
    signupLabel: "Anthropic 가입",
    description: "정밀 음악 기획 및 서정적인 고난도 작사에 특화된 Claude 키입니다.",
  },
  suno: {
    createKeyUrl: "https://suno.com",
    createKeyLabel: "Suno AI 공식 사이트 바로가기",
    signupUrl: "https://suno.com",
    signupLabel: "Suno 계정 가입",
    description: "실제 고음질 음원 생성, 트랙 연장, MR 분리, WAV 변환에 필요한 Suno 엔진 키입니다.",
  },
};

export function ApiKeyRow({
  provider,
  label,
  maskedValue,
  helpUrl,
  helpLabel,
  helpDescription,
}: ApiKeyRowProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const actionMeta = PROVIDER_ACTION_MAP[provider];
  const finalCreateKeyUrl = helpUrl || actionMeta?.createKeyUrl;
  const finalCreateKeyLabel = helpLabel || actionMeta?.createKeyLabel || "API 키 발급받기";
  const finalSignupUrl = actionMeta?.signupUrl;
  const finalSignupLabel = actionMeta?.signupLabel || "공식 회원가입";
  const finalDescription = helpDescription || actionMeta?.description;

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
    <div className="rounded-xl border border-[#272738] bg-[#1a1926] p-4 shadow-sm hover:border-[#383852] transition-colors">
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
            className="btn-3d-primary px-4 py-2 text-xs"
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

      {/* 2단 퀵액션 버튼 세트 (키 발급 바로가기 + 플랫폼 회원가입 바로가기) */}
      {(finalCreateKeyUrl || finalSignupUrl) && (
        <div className="mt-3 rounded-xl bg-orange-500/10 border border-orange-500/20 px-3.5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {finalCreateKeyUrl && (
              <a
                href={finalCreateKeyUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-create-key"
              >
                <span>🔑</span>
                <span>{finalCreateKeyLabel}</span>
                <span className="text-[10px]">↗</span>
              </a>
            )}
            {finalSignupUrl && (
              <a
                href={finalSignupUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-platform-signup"
              >
                <span>🌐</span>
                <span>{finalSignupLabel}</span>
                <span className="text-[10px]">↗</span>
              </a>
            )}
          </div>
          {finalDescription && (
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-medium text-zinc-400">
              {finalDescription.split("|").map((part, i, arr) => (
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
