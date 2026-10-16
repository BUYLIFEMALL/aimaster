"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { runKeywordExpansionAction } from "@/lib/actions/expansion";
import { deleteSeedAction } from "@/lib/actions/seeds";
import { ApiKeyRequiredModal } from "@/components/settings/ApiKeyRequiredModal";

// "지금 확장하기" + "삭제" 버튼 — 표 보기와 카드 보기가 같은 동작을 쓰도록 분리했다.
export function SeedActions({ seedId, compact = false }: { seedId: string; compact?: boolean }) {
  const router = useRouter();
  const [isExpanding, setIsExpanding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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

  async function handleDelete() {
    if (!window.confirm("이 씨드 키워드와 확장 결과를 모두 삭제할까요?")) return;
    setIsDeleting(true);
    try {
      await deleteSeedAction(seedId);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className={compact ? "flex flex-col items-end gap-1" : "flex flex-col gap-1"}>
      <div className="flex items-center gap-2">
        <button type="button" onClick={handleExpand} disabled={isExpanding} className="mx-btn-primary">
          {isExpanding ? "⏳ 확장 중..." : "⚡ 지금 확장하기"}
        </button>
        <button type="button" onClick={handleDelete} disabled={isDeleting} className="mx-btn-danger" title="씨드 키워드 삭제">
          {isDeleting ? "삭제 중..." : "삭제"}
        </button>
      </div>
      {isExpanding && <p className="text-xs text-mx-muted">검색결과 분석 중이에요. 30초~1분 정도 걸립니다.</p>}
      {error && <p className="text-xs text-mx-danger">{error}</p>}
      {missingProvider && (
        <ApiKeyRequiredModal provider={missingProvider} onClose={() => setMissingProvider(null)} />
      )}
    </div>
  );
}
