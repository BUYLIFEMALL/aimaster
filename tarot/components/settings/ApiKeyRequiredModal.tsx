"use client";

import Link from "next/link";

interface ApiKeyRequiredModalProps {
  onClose: () => void;
  /** 어떤 기능에 필요한 키인지(예: "Google Gemini", "OpenAI") — mbti-character의 동일
   *  컴포넌트를 그대로 가져오되, 이 프로젝트는 provider가 두 개(gemini/openai)라 어떤
   *  기능에서 막혔는지 명시할 수 있도록 props화했다. */
  providerLabel?: string;
}

// 운영자 공용 키로 폴백하지 않으므로, 본인 키 없이 생성을 시도하면 조용히 막지 않고
// 이 팝업으로 분명하게 안내한다(insta_auto_poster/mbti-character의 ApiKeyRequiredModal과 동일 패턴).
export function ApiKeyRequiredModal({ onClose, providerLabel = "AI" }: ApiKeyRequiredModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 text-lg font-bold text-neutral-900">API 키 등록이 필요합니다</h2>
        <p className="mb-4 text-sm text-neutral-600 leading-relaxed">
          이 기능을 이용하려면 본인의 <span className="font-medium text-neutral-900">{providerLabel}</span>{" "}
          API 키를 먼저 등록해야 합니다. 다른 사용자의 API 키는 공유되지 않으며, 각자 본인 키로만
          이용할 수 있습니다.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-neutral-500 hover:bg-neutral-100"
          >
            닫기
          </button>
          <Link
            href="/settings"
            className="px-4 py-2 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800"
          >
            설정하러 가기
          </Link>
        </div>
      </div>
    </div>
  );
}
