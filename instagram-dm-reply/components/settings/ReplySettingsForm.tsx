"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveReplySettingsAction } from "@/lib/actions/settings";
import { DEFAULT_DISCLOSURE_MESSAGE } from "@/lib/dmDefaults";
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
  disclosureMessage,
}: {
  defaultLink: string | null;
  aiInstructions: string | null;
  tonePreset: string | null;
  replyModel: string | null;
  disclosureMessage: string | null;
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
        <label className="block text-xs font-semibold text-gray-500 mb-1">
          🔔 자동 응답 고지 문구 (대화별 최초 1회 발송)
        </label>
        <textarea
          name="disclosureMessage"
          defaultValue={disclosureMessage ?? DEFAULT_DISCLOSURE_MESSAGE}
          rows={2}
          className="input"
        />
        <p className="mt-1 text-xs text-gray-400">
          Meta 정책상 자동 응답 DM은 대화 시작 시 "자동 응답임을 고지"해야 합니다. 이 문구는 같은
          상대방과의 대화에서 처음 답장을 보낼 때 딱 한 번만 자동으로 함께 나갑니다.
        </p>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">DM 답장에 포함할 기본 링크</label>
        <input
          name="defaultLink"
          type="text"
          defaultValue={defaultLink ?? ""}
          placeholder="example.com 또는 https://example.com"
          className="input"
        />
        <p className="mt-1 text-xs text-gray-400">
          답장 내용에 자연스럽게 녹여서 안내합니다. https:// 는 생략해도 자동으로 붙습니다.
        </p>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">답장 생성 AI 모델</label>
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
        <label className="block text-xs font-semibold text-gray-500 mb-1">답장 톤 설정 (선택)</label>
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
          placeholder="예: 가격 문의에는 확답하지 말고 상담 링크로 안내하기 등"
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
