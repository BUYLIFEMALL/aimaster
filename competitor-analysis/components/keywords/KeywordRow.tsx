"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { runKeywordAnalysisAction } from "@/lib/actions/analysis";
import { deleteKeywordAction } from "@/lib/actions/keywords";
import { ApiKeyRequiredModal } from "@/components/settings/ApiKeyRequiredModal";

export interface KeywordRowData {
  id: string;
  keyword: string;
  location: string;
  is_active: boolean;
  analysisCount: number;
}

export function KeywordRow({ keyword }: { keyword: KeywordRowData }) {
  const router = useRouter();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingProvider, setMissingProvider] = useState<string | null>(null);

  async function handleAnalyze() {
    setError(null);
    setIsAnalyzing(true);
    try {
      const result = await runKeywordAnalysisAction(keyword.id);
      if (result.needsApiKey) {
        setMissingProvider(result.needsApiKey);
      } else if (result.error) {
        setError(result.error);
      } else if (result.jobId) {
        router.push(`/keywords/${keyword.id}/jobs/${result.jobId}`);
      }
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteKeywordAction(keyword.id);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
        <Link href={`/keywords/${keyword.id}`} className="min-w-0 flex-1">
          <p className="font-bold text-gray-900 truncate">{keyword.keyword}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {keyword.location} · 분석 {keyword.analysisCount}회
          </p>
        </Link>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-60"
          >
            {isAnalyzing ? "분석 중..." : "지금 분석하기"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-3 py-2 rounded-lg text-sm font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 disabled:opacity-60"
          >
            삭제
          </button>
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {missingProvider && (
        <ApiKeyRequiredModal provider={missingProvider} onClose={() => setMissingProvider(null)} />
      )}
    </>
  );
}
