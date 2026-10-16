"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { runKeywordAnalysisAction } from "@/lib/actions/analysis";
import { deleteJobAction } from "@/lib/actions/keywords";
import { ApiKeyRequiredModal } from "@/components/settings/ApiKeyRequiredModal";
import { formatDate, formatTime } from "@/lib/format";

export interface JobListItem {
  id: string;
  executed_at: string;
  engine: "google" | "naver";
}

const ENGINE_LABEL: Record<"google" | "naver", string> = { google: "구글", naver: "네이버" };

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
    if (!window.confirm("이 분석 결과를 삭제할까요?")) return;
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
      <div className="mx-card w-full shrink-0 p-4 lg:w-72 lg:self-start">
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="mx-btn-primary mb-4 w-full"
        >
          {isAnalyzing ? "⏳ 분석 중..." : "⚡ 지금 분석하기"}
        </button>
        {error && <p className="mb-3 rounded-lg border border-mx-danger px-3 py-2 text-xs text-mx-danger">{error}</p>}

        <p className="mb-2 text-xs font-semibold text-mx-muted">🕒 분석 이력 ({jobs.length}회)</p>

        {jobs.length === 0 ? (
          <p className="py-6 text-center text-sm text-mx-muted">아직 분석한 기록이 없습니다.</p>
        ) : (
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {jobs.map((job) => {
              const isActive = pathname?.includes(`/jobs/${job.id}`);
              return (
                <div
                  key={job.id}
                  className={`flex items-center gap-2 rounded-xl border p-3 ${
                    isActive ? "border-mx-primary bg-mx-raised" : "border-mx-border hover:border-mx-muted"
                  }`}
                >
                  <Link href={`/keywords/${keywordId}/jobs/${job.id}`} className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-mx-text">
                      {formatDate(job.executed_at)}
                      <span className={job.engine === "naver" ? "mx-chip-green px-1.5 py-0 text-[10px]" : "mx-chip-blue px-1.5 py-0 text-[10px]"}>
                        {ENGINE_LABEL[job.engine]}
                      </span>
                    </p>
                    <p className="text-xs text-mx-muted">{formatTime(job.executed_at)}</p>
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(job.id)}
                    disabled={deletingId === job.id}
                    className="min-h-[44px] shrink-0 px-2 text-xs font-semibold text-mx-danger hover:underline disabled:opacity-60"
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
