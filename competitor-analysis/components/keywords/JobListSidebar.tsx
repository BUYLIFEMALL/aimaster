"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { runKeywordAnalysisAction } from "@/lib/actions/analysis";
import { deleteJobAction } from "@/lib/actions/keywords";
import { ApiKeyRequiredModal } from "@/components/settings/ApiKeyRequiredModal";

export interface JobListItem {
  id: string;
  executed_at: string;
}

export function JobListSidebar({ keywordId, jobs }: { keywordId: string; jobs: JobListItem[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  async function handleDelete(jobId: string) {
    setDeletingId(jobId);
    try {
      await deleteJobAction(keywordId, jobId);
      // 지금 보고 있던 회차를 지웠으면 목록 첫 항목(또는 빈 상태)으로 돌아간다.
      if (pathname?.includes(`/jobs/${jobId}`)) {
        router.push(`/keywords/${keywordId}`);
      } else {
        router.refresh();
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <div className="w-full md:w-72 shrink-0 md:border-r border-gray-100 md:pr-4">
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="w-full mb-4 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-60"
        >
          {isAnalyzing ? "분석 중..." : "🔄 지금 다시 분석하기"}
        </button>
        {error && <p className="mb-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <p className="text-xs font-semibold text-gray-400 mb-2">분석 이력 ({jobs.length}회)</p>

        {jobs.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">아직 분석한 기록이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => {
              const isActive = pathname?.includes(`/jobs/${job.id}`);
              const dt = new Date(job.executed_at);
              return (
                <div
                  key={job.id}
                  className={`flex items-center gap-2 rounded-xl border p-3 ${
                    isActive ? "border-blue-300 bg-blue-50/60" : "border-gray-100 bg-white hover:border-gray-200"
                  }`}
                >
                  <Link href={`/keywords/${keywordId}/jobs/${job.id}`} className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">{dt.toLocaleDateString("ko-KR")}</p>
                    <p className="text-xs text-gray-400">
                      {dt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(job.id)}
                    disabled={deletingId === job.id}
                    className="shrink-0 text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-60 px-2 py-1"
                    title="이 분석 결과 삭제"
                  >
                    {deletingId === job.id ? "삭제 중..." : "삭제"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {missingProvider && (
        <ApiKeyRequiredModal provider={missingProvider} onClose={() => setMissingProvider(null)} />
      )}
    </>
  );
}
