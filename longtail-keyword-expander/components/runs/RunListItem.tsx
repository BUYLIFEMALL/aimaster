"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteRunAction } from "@/lib/actions/seeds";
import { formatDateTime } from "@/lib/format";

export interface RunListItemProps {
  seedId: string;
  runId: string;
  keyword: string;
  executedAt: string;
  relatedCount: number;
  expansionCount: number;
  summaryPreview: string | null;
}

export function RunDeleteButton({ seedId, runId }: { seedId: string; runId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm("이 실행 결과를 삭제할까요?")) return;
    setIsDeleting(true);
    try {
      await deleteRunAction(seedId, runId);
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

// 카드 보기용 실행 결과 카드
export function RunListItem({
  seedId,
  runId,
  keyword,
  executedAt,
  relatedCount,
  expansionCount,
  summaryPreview,
}: RunListItemProps) {
  return (
    <div className="mx-card flex flex-col gap-3 p-4">
      <Link href={`/seeds/${seedId}/runs/${runId}`} className="min-w-0 flex-1">
        <p className="font-bold text-mx-text hover:text-[#93c5fd]">{keyword}</p>
        <p className="mt-0.5 text-xs text-mx-muted">🕒 {formatDateTime(executedAt)}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="mx-chip-green">🔗 연관 {relatedCount}</span>
          <span className="mx-chip-amber">🎯 롱테일 {expansionCount}</span>
        </div>
        {summaryPreview && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-mx-muted">{summaryPreview}</p>}
      </Link>
      <div className="flex justify-end">
        <RunDeleteButton seedId={seedId} runId={runId} />
      </div>
    </div>
  );
}
