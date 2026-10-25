"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { saveApiKeyAction, deleteApiKeyAction, type SaveApiKeyState } from "@/lib/actions/settings";
import type { ApiKeyProvider } from "@/types/database.types";

interface ApiKeyRowProps {
  provider: ApiKeyProvider;
  label: string;
  maskedValue: string | null;
  helpUrl?: string;
  helpLabel?: string;
  signupUrl?: string;
  signupLabel?: string;
}

const PLATFORM_LINKS: Record<string, { keyUrl: string; keyLabel: string; signupUrl: string; signupLabel: string }> = {
  openai: {
    keyUrl: "https://platform.openai.com/api-keys",
    keyLabel: "키 발급 바로가기",
    signupUrl: "https://platform.openai.com/signup",
    signupLabel: "플랫폼 가입",
  },
  anthropic: {
    keyUrl: "https://console.anthropic.com/settings/keys",
    keyLabel: "키 발급 바로가기",
    signupUrl: "https://console.anthropic.com/",
    signupLabel: "플랫폼 가입",
  },
  gemini: {
    keyUrl: "https://aistudio.google.com/app/apikey",
    keyLabel: "키 발급 바로가기",
    signupUrl: "https://ai.google.dev/",
    signupLabel: "플랫폼 가입",
  },
  perplexity: {
    keyUrl: "https://www.perplexity.ai/settings/api",
    keyLabel: "키 발급 바로가기",
    signupUrl: "https://www.perplexity.ai/",
    signupLabel: "플랫폼 가입",
  },
  apify: {
    keyUrl: "https://console.apify.com/account/integrations",
    keyLabel: "토큰 발급 바로가기",
    signupUrl: "https://apify.com/",
    signupLabel: "플랫폼 가입",
  },
  pixabay: {
    keyUrl: "https://pixabay.com/api/docs/",
    keyLabel: "무료 키 발급 바로가기",
    signupUrl: "https://pixabay.com/",
    signupLabel: "플랫폼 가입",
  },
  pexels: {
    keyUrl: "https://www.pexels.com/api/",
    keyLabel: "무료 키 발급 바로가기",
    signupUrl: "https://www.pexels.com/",
    signupLabel: "플랫폼 가입",
  },
  meta_app_id: {
    keyUrl: "https://developers.facebook.com/apps/",
    keyLabel: "Meta 앱 콘솔",
    signupUrl: "https://developers.facebook.com/",
    signupLabel: "개발자 가입",
  },
  meta_app_secret: {
    keyUrl: "https://developers.facebook.com/apps/",
    keyLabel: "Meta 앱 시크릿",
    signupUrl: "https://developers.facebook.com/",
    signupLabel: "개발자 가입",
  },
  facebook_app_id: {
    keyUrl: "https://developers.facebook.com/apps/",
    keyLabel: "Facebook 앱 콘솔",
    signupUrl: "https://developers.facebook.com/",
    signupLabel: "개발자 가입",
  },
  facebook_app_secret: {
    keyUrl: "https://developers.facebook.com/apps/",
    keyLabel: "Facebook 앱 시크릿",
    signupUrl: "https://developers.facebook.com/",
    signupLabel: "개발자 가입",
  },
};

const initialState: SaveApiKeyState = {};

export function ApiKeyRow({
  provider,
  label,
  maskedValue,
  helpUrl,
  helpLabel,
  signupUrl,
  signupLabel,
}: ApiKeyRowProps) {
  const [state, formAction, isPending] = useActionState(saveApiKeyAction, initialState);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (state.success) setIsEditing(false);
  }, [state.success]);

  const showForm = !maskedValue || isEditing;
  const platform = PLATFORM_LINKS[provider];
  const finalKeyUrl = helpUrl || platform?.keyUrl;
  const finalKeyLabel = helpLabel || platform?.keyLabel || "키 발급 바로가기";
  const finalSignupUrl = signupUrl || platform?.signupUrl;
  const finalSignupLabel = signupLabel || platform?.signupLabel || "플랫폼 가입";

  return (
    <div className="rounded-xl border border-[#262c3d] bg-[#0d0f17] p-4 transition-all hover:border-[#333b52]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <span>{label}</span>
          </p>
        </div>

        {/* 2단 퀵액션 버튼 세트 (키 발급 바로가기 + 플랫폼 가입) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {finalKeyUrl && (
            <a
              href={finalKeyUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-create-key"
              title={`${label} 공식 콘솔 키 생성 바로가기`}
            >
              <span>🔑 {finalKeyLabel}</span>
            </a>
          )}
          {finalSignupUrl && (
            <a
              href={finalSignupUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-platform-signup"
              title={`${label} 플랫폼 공식 가입 바로가기`}
            >
              <span>{finalSignupLabel}</span>
            </a>
          )}
          {maskedValue && !isEditing && (
            <div className="flex items-center gap-2 ml-1">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-2 py-1 text-xs font-semibold text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-md transition-colors"
              >
                수정
              </button>
              <form action={deleteApiKeyAction}>
                <input type="hidden" name="provider" value={provider} />
                <button
                  type="submit"
                  className="px-2 py-1 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-md transition-colors"
                >
                  삭제
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {showForm ? (
        <form action={formAction} className="flex flex-wrap gap-2 pt-1">
          <input type="hidden" name="provider" value={provider} />
          <Input
            name="apiKey"
            type="password"
            placeholder={maskedValue ? `새 키 입력 (현재: ${maskedValue})` : "API 키 입력"}
            className="min-w-[220px] flex-1 bg-[#161922] border-[#262c3d] text-slate-100 placeholder-slate-500 rounded-xl"
          />
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 btn-3d-primary text-xs font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer"
          >
            {isPending ? "저장 중..." : "💾 저장"}
          </button>
          {maskedValue && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsEditing(false)}
              className="text-slate-400 hover:text-slate-200"
            >
              취소
            </Button>
          )}
        </form>
      ) : (
        <p className="font-mono text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg inline-block">
          ● {maskedValue} · 안전하게 등록됨
        </p>
      )}
      {state.error && <p className="mt-1.5 text-xs text-rose-400">{state.error}</p>}
      {state.success && <p className="mt-1.5 text-xs text-emerald-400">성공적으로 저장되었습니다.</p>}
    </div>
  );
}
