"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { runKeywordExpansionAction } from "@/lib/actions/expansion";
import { deleteRunAction } from "@/lib/actions/seeds";
import { ApiKeyRequiredModal } from "@/components/settings/ApiKeyRequiredModal";

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
        router.push(`/seeds/${seedId}/runs/${result.runId}`);
      }
    } finally {
      setIsExpanding(false);
    }
  }

  async function handleDelete(runId: string) {
    setDeletingId(runId);
    try {
      await deleteRunAction(seedId, runId);
      if (pathname?.includes(`/runs/${runId}`)) {
        router.push(`/seeds/${seedId}`);
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
          onClick={handleExpand}
          disabled={isExpanding}
          className="w-full mb-4 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-60"
        >
          {isExpanding ? "확장 중..." : "🔄 지금 다시 확장하기"}
        </button>
        {error && <p className="mb-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <p className="text-xs font-semibold text-gray-400 mb-2">실행 이력 ({runs.length}회)</p>

        {runs.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">아직 실행한 기록이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {runs.map((run) => {
              const isActive = pathname?.includes(`/runs/${run.id}`);
              const dt = new Date(run.executed_at);
              return (
                <div
                  key={run.id}
                  className={`flex items-center gap-2 rounded-xl border p-3 ${
                    isActive ? "border-blue-300 bg-blue-50/60" : "border-gray-100 bg-white hover:border-gray-200"
                  }`}
                >
                  <Link href={`/seeds/${seedId}/runs/${run.id}`} className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">{dt.toLocaleDateString("ko-KR")}</p>
                    <p className="text-xs text-gray-400">
                      {dt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} · 연관{" "}
                      {run.related_count} · 롱테일 {run.expansion_count}
                    </p>
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(run.id)}
                    disabled={deletingId === run.id}
                    className="shrink-0 text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-60 px-2 py-1"
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
