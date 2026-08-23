"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteRunAction } from "@/lib/actions/seeds";

interface RunListItemProps {
  seedId: string;
  runId: string;
  keyword: string;
  executedAt: string;
  relatedCount: number;
  expansionCount: number;
  summaryPreview: string | null;
}

export function RunListItem({
  seedId,
  runId,
  keyword,
  executedAt,
  relatedCount,
  expansionCount,
  summaryPreview,
}: RunListItemProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const dt = new Date(executedAt);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteRunAction(seedId, runId);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-start justify-between gap-3">
      <Link href={`/seeds/${seedId}/runs/${runId}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-bold text-gray-900">{keyword}</p>
          <span className="text-xs text-gray-400">
            🕒 {dt.toLocaleDateString("ko-KR")} {dt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          연관 키워드 {relatedCount}개 · 롱테일 키워드 {expansionCount}개
        </p>
        {summaryPreview && <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{summaryPreview}</p>}
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-500 border border-red-100 bg-red-50 hover:bg-red-100 disabled:opacity-60"
      >
        {isDeleting ? "삭제 중..." : "삭제"}
      </button>
    </div>
  );
}
