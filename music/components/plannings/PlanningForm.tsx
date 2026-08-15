"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { planMusicAction } from "@/lib/actions/plannings";
import { ApiKeyRequiredModal } from "@/components/settings/ApiKeyRequiredModal";

const LANG_OPTIONS = ["한국어", "English", "Japanese", "Chinese"];

export function PlanningForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const result = await planMusicAction(new FormData(e.currentTarget));
      if (result.needsApiKey) {
        setShowApiKeyModal(true);
      } else if (result.error) {
        setError(result.error);
      } else if (result.planningId) {
        router.push(`/plannings/${result.planningId}`);
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">곡 설명</label>
          <textarea
            name="songDescription"
            required
            rows={4}
            placeholder="예: 주말 화창한날에 드라이브하며 듣기 좋은 80년대 레트로 일본 시티팝"
            className="input w-full"
          />
          <p className="mt-1 text-xs text-gray-400">
            분위기, 상황, 장르 힌트 등을 자유롭게 적어주세요. AI가 스타일/제목/설명을 기획해드립니다.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">보컬 성별 (선택)</label>
            <select name="vocalGender" className="input w-full" defaultValue="">
              <option value="">미지정</option>
              <option value="여성">여성</option>
              <option value="남성">남성</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">언어</label>
            <select name="lang" className="input w-full" defaultValue="한국어">
              {LANG_OPTIONS.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-60 text-white font-bold py-3 px-4 rounded-xl transition-all"
        >
          {isPending ? "기획 중... (스타일/제목/설명 생성)" : "곡 기획하기"}
        </button>
      </form>

      {showApiKeyModal && (
        <ApiKeyRequiredModal missingLabels={["OpenAI"]} onClose={() => setShowApiKeyModal(false)} />
      )}
    </>
  );
}
