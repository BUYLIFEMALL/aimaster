"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateReportAction } from "@/lib/actions/analysis";
import { ApiKeyRequiredModal } from "@/components/settings/ApiKeyRequiredModal";

export function ReportButton({ analysisId, hasReport }: { analysisId: string; hasReport: boolean }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingProvider, setMissingProvider] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setIsPending(true);
    try {
      const result = await generateReportAction(analysisId);
      if (result.needsApiKey) {
        setMissingProvider(result.needsApiKey);
      } else if (result.error) {
        setError(result.error);
      } else {
        router.refresh(); // 부모 서버 컴포넌트가 새로 생성된 html_report를 다시 가져오도록
      }
    } finally {
      setIsPending(false);
    }
  }

  if (hasReport) return null; // 이미 생성된 리포트는 아래에서 바로 보여주므로 버튼 숨김

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-60"
      >
        {isPending ? "리포트 만드는 중..." : "🎨 보기 좋은 HTML 리포트로 만들기"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {missingProvider && (
        <ApiKeyRequiredModal provider={missingProvider} onClose={() => setMissingProvider(null)} />
      )}
    </>
  );
}
