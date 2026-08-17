"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateDraftAction } from "@/lib/actions/drafts";
import { ApiKeyRequiredModal } from "@/components/settings/ApiKeyRequiredModal";

export function DraftForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const result = await generateDraftAction(new FormData(e.currentTarget));
      if (result.needsApiKey) {
        setShowApiKeyModal(true);
      } else if (result.error) {
        setError(result.error);
      } else if (result.draftId) {
        router.push(`/drafts/${result.draftId}`);
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">이메일 주제 (필수)</label>
          <textarea
            name="topic"
            required
            rows={3}
            placeholder="예: 공동구매 중개 커뮤니티에 새로 가입한 판매자를 초대하는 이메일"
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">키워드 (쉼표로 구분, 선택)</label>
          <input name="keywords" placeholder="예: 공동구매, 커뮤니티, 초대" className="input" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">참고 자료 링크 (선택, 최대 3개)</label>
          <div className="space-y-2">
            <input name="referenceUrl1" type="url" placeholder="https://example.com/reference-1" className="input" />
            <input name="referenceUrl2" type="url" placeholder="https://example.com/reference-2" className="input" />
            <input name="referenceUrl3" type="url" placeholder="https://example.com/reference-3" className="input" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">추천 버튼 문구 (선택)</label>
            <input name="ctaText" placeholder="예: 커뮤니티 바로가기" className="input" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">추천 대상 URL (선택)</label>
            <input name="ctaUrl" type="url" placeholder="https://example.com" className="input" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">추가 지시사항 (선택)</label>
          <textarea name="customPrompt" rows={2} placeholder="꼭 다뤄야 할 내용, 톤앤매너 등" className="input" />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-60 text-white font-bold py-3 px-4 rounded-xl transition-all"
        >
          {isPending ? "작성 중... (이미지도 함께 생성하면 시간이 더 걸릴 수 있어요)" : "AI로 초안 만들기"}
        </button>
        <p className="text-center text-xs text-gray-400">
          <a href="/settings" className="text-blue-600 hover:underline">
            설정
          </a>
          에 Gemini API 키를 등록해두면 이메일 핵심 주제를 반영한 이미지도 자동으로 함께 만들어져요 (선택).
        </p>
      </form>

      {showApiKeyModal && (
        <ApiKeyRequiredModal missingLabels={["OpenAI"]} onClose={() => setShowApiKeyModal(false)} />
      )}
    </>
  );
}
