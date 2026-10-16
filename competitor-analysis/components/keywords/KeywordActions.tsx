"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { runKeywordAnalysisAction } from "@/lib/actions/analysis";
import { deleteKeywordAction } from "@/lib/actions/keywords";
import { ApiKeyRequiredModal } from "@/components/settings/ApiKeyRequiredModal";

// "지금 분석하기" + "삭제" — 표 보기와 카드 보기가 같은 동작을 쓰도록 분리했다.
export function KeywordActions({ keywordId, compact = false }: { keywordId: string; compact?: boolean }) {
  const router = useRouter();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingProvider, setMissingProvider] = useState<string | null>(null);

  async function handleAnalyze() {
    setError(null);
    setIsAnalyzing(true);
    try {
      const result = await runKeywordAnalysisAction(keywordId);
      if (result.needsApiKey) {
        setMissingProvider(result.needsApiKey);
      } else if (result.error) {
        setError(result.error);
      } else if (result.jobId) {
        router.push(`/keywords/${keywordId}/jobs/${result.jobId}`);
      }
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("이 키워드와 분석 결과를 모두 삭제할까요?")) return;
    setIsDeleting(true);
    try {
      await deleteKeywordAction(keywordId);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className={compact ? "flex flex-col items-end gap-1" : "flex flex-col gap-1"}>
      <div className="flex items-center gap-2">
        <button type="button" onClick={handleAnalyze} disabled={isAnalyzing} className="mx-btn-primary">
          {isAnalyzing ? "⏳ 분석 중..." : "⚡ 지금 분석하기"}
        </button>
        <button type="button" onClick={handleDelete} disabled={isDeleting} className="mx-btn-danger" title="키워드 삭제">
          {isDeleting ? "삭제 중..." : "삭제"}
        </button>
      </div>
      {isAnalyzing && <p className="text-xs text-mx-muted">검색결과 수집 → 경쟁사 리서치 → AI 분석 중이에요. 1~2분 걸릴 수 있습니다.</p>}
      {error && <p className="text-xs text-mx-danger">{error}</p>}
      {missingProvider && <ApiKeyRequiredModal provider={missingProvider} onClose={() => setMissingProvider(null)} />}
    </div>
  );
}
