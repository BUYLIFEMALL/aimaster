"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveReplySettingsAction } from "@/lib/actions/settings";
import { TONE_PRESETS } from "@/lib/tonePresets";
import {
  REPLY_MODEL_OPTIONS,
  DEFAULT_REPLY_MODEL,
  REPLY_MODEL_PROVIDER_SHORT_LABELS,
  type ReplyModelProvider,
} from "@/lib/ai/models";

const PROVIDER_GROUP_ORDER: ReplyModelProvider[] = ["openai", "anthropic", "gemini"];

export function ReplySettingsForm({
  defaultLink,
  aiInstructions,
  tonePreset,
  replyModel,
}: {
  defaultLink: string | null;
  aiInstructions: string | null;
  tonePreset: string | null;
  replyModel: string | null;
}) {
  const router = useRouter();
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
      else {
        setSuccess(true);
        // 위쪽 "지금 사용되는 모델" 안내 배너가 서버에서 읽은 값을 그대로 보여주므로,
        // 저장 직후 새로고침 없이 바로 최신 모델로 갱신되도록 새로 fetch한다.
        router.refresh();
      }
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
          type="text"
          defaultValue={defaultLink ?? ""}
          placeholder="example.com 또는 https://example.com"
          className="input"
        />
        <p className="mt-1 text-xs text-gray-400">
          영상별로 별도 링크를 지정하지 않으면 기본 댓글 링크로 사용됩니다. https:// 는 생략해도
          자동으로 붙습니다.
        </p>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">답글 생성 AI 모델</label>
        <select name="replyModel" defaultValue={replyModel ?? DEFAULT_REPLY_MODEL} className="input">
          {PROVIDER_GROUP_ORDER.map((provider) => (
            <optgroup key={provider} label={REPLY_MODEL_PROVIDER_SHORT_LABELS[provider]}>
              {REPLY_MODEL_OPTIONS.filter((opt) => opt.provider === provider).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-400">
          더 똑똑한 모델일수록 답변이 자연스럽지만, 호출 비용도 함께 올라갑니다. 고른 모델에 맞는
          provider의 API 키가 설정 상단에 등록되어 있어야 합니다.
        </p>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">답글 톤 설정 (선택)</label>
        <select name="tonePreset" defaultValue={tonePreset ?? ""} className="input">
          <option value="">직접 설정 안 함</option>
          {TONE_PRESETS.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">
          추가하고 싶은 어조/문구/제한사항 (선택)
        </label>
        <textarea
          name="aiInstructions"
          defaultValue={aiInstructions ?? ""}
          rows={3}
          placeholder="예: 이모지는 쓰지 않기, 우리 채널 이름은 항상 '○○'로 불러주세요 등"
          className="input"
        />
        <p className="mt-1 text-xs text-gray-400">
          위 기본 톤에 더해서, 세부적으로 추가하고 싶은 지시사항이 있으면 적어주세요.
        </p>
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
