"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { runKeywordExpansionAction } from "@/lib/actions/expansion";
import { deleteRunAction } from "@/lib/actions/expandSeeds";
import { ApiKeyRequiredModal } from "@/components/settings/ApiKeyRequiredModal";
import { formatDate, formatTime } from "@/lib/format";

export interface RunListItem {
  id: string;
  executed_at: string;
  related_count: number;
  expansion_count: number;
}

export function RunListSidebar({ seedId, runs }: { seedId: string; runs: RunListItem[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isExpanding, setIsExpanding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [missingProvider, setMissingProvider] = useState<string | null>(null);

  async function handleExpand() {
    setError(null);
    setIsExpanding(true);
    try {
      const result = await runKeywordExpansionAction(seedId);
      if (result.needsApiKey) {
        setMissingProvider(result.needsApiKey);
      } else if (result.error) {
        setError(result.error);
      } else if (result.runId) {
        router.push(`/expand/${seedId}/runs/${result.runId}`);
      }
    } finally {
      setIsExpanding(false);
    }
  }

  async function handleDelete(runId: string) {
    if (!window.confirm("이 실행 결과를 삭제할까요?")) return;
    setDeletingId(runId);
    try {
      await deleteRunAction(seedId, runId);
      if (pathname?.includes(`/runs/${runId}`)) {
        router.push(`/expand/${seedId}`);
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
          onClick={handleExpand}
          disabled={isExpanding}
          className="mx-btn-primary mb-4 w-full"
        >
          {isExpanding ? "⏳ 확장 중..." : "⚡ 지금 확장하기"}
        </button>
        {error && <p className="mb-3 rounded-lg border border-mx-danger px-3 py-2 text-xs text-mx-danger">{error}</p>}

        <p className="mb-2 text-xs font-semibold text-mx-muted">🕒 실행 이력 ({runs.length}회)</p>

        {runs.length === 0 ? (
          <p className="py-6 text-center text-sm text-mx-muted">아직 실행한 기록이 없습니다.</p>
        ) : (
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {runs.map((run) => {
              const isActive = pathname?.includes(`/runs/${run.id}`);
              return (
                <div
                  key={run.id}
                  className={`flex items-center gap-2 rounded-xl border p-3 ${
                    isActive ? "border-mx-primary bg-mx-raised" : "border-mx-border hover:border-mx-muted"
                  }`}
                >
                  <Link href={`/expand/${seedId}/runs/${run.id}`} className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-mx-text">{formatDate(run.executed_at)}</p>
                    <p className="text-xs text-mx-muted">
                      {formatTime(run.executed_at)} · 연관{" "}
                      {run.related_count} · 롱테일 {run.expansion_count}
                    </p>
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(run.id)}
                    disabled={deletingId === run.id}
                    className="min-h-[44px] shrink-0 px-2 text-xs font-semibold text-mx-danger hover:underline disabled:opacity-60"
                    title="이 실행 결과 삭제"
                  >
                    {deletingId === run.id ? "삭제 중..." : "삭제"}
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
