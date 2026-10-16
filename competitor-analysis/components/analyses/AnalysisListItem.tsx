"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteJobAction } from "@/lib/actions/keywords";
import { formatDateTime } from "@/lib/format";

export interface AnalysisListItemProps {
  keywordId: string;
  jobId: string;
  keywordText: string;
  executedAt: string;
  totalResults: number | null;
  summaryPreview: string | null;
}

export function JobDeleteButton({ keywordId, jobId }: { keywordId: string; jobId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm("이 분석 결과를 삭제할까요?")) return;
    setIsDeleting(true);
    try {
      await deleteJobAction(keywordId, jobId);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <button type="button" onClick={handleDelete} disabled={isDeleting} className="mx-btn-danger">
      {isDeleting ? "삭제 중..." : "삭제"}
    </button>
  );
}

// 카드 보기용 분석 결과 카드
export function AnalysisListItem({ keywordId, jobId, keywordText, executedAt, totalResults, summaryPreview }: AnalysisListItemProps) {
  return (
    <div className="mx-card flex flex-col gap-3 p-4">
      <Link href={`/keywords/${keywordId}/jobs/${jobId}`} className="min-w-0 flex-1">
        <p className="font-bold text-mx-text hover:text-[#93c5fd]">{keywordText}</p>
        <p className="mt-0.5 text-xs text-mx-muted">🕒 {formatDateTime(executedAt)}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="mx-chip-blue">🔎 검색결과 {totalResults?.toLocaleString() ?? "-"}건</span>
          {summaryPreview ? <span className="mx-chip-green">🤖 리포트 있음</span> : <span className="mx-chip">리포트 없음</span>}
        </div>
        {summaryPreview && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-mx-muted">{summaryPreview}</p>}
      </Link>
      <div className="flex justify-end">
        <JobDeleteButton keywordId={keywordId} jobId={jobId} />
      </div>
    </div>
  );
}
