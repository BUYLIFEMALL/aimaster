"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { runKeywordExpansionAction } from "@/lib/actions/expansion";
import { deleteSeedAction } from "@/lib/actions/seeds";
import { ApiKeyRequiredModal } from "@/components/settings/ApiKeyRequiredModal";

export interface SeedRowData {
  id: string;
  keyword: string;
  engine: "google" | "naver";
  is_active: boolean;
  runCount: number;
}

const ENGINE_LABEL: Record<"google" | "naver", string> = { google: "구글", naver: "네이버" };

export function SeedRow({ seed }: { seed: SeedRowData }) {
  const router = useRouter();
  const [isExpanding, setIsExpanding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingProvider, setMissingProvider] = useState<string | null>(null);

  async function handleExpand() {
    setError(null);
    setIsExpanding(true);
    try {
      const result = await runKeywordExpansionAction(seed.id);
      if (result.needsApiKey) {
        setMissingProvider(result.needsApiKey);
      } else if (result.error) {
        setError(result.error);
      } else if (result.runId) {
        router.push(`/seeds/${seed.id}/runs/${result.runId}`);
      }
    } finally {
      setIsExpanding(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteSeedAction(seed.id);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
        <Link href={`/seeds/${seed.id}`} className="min-w-0 flex-1">
          <p className="font-bold text-gray-900 truncate flex items-center gap-1.5">
            {seed.keyword}
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
              {ENGINE_LABEL[seed.engine]}
            </span>
          </p>
          <p className="text-xs text-gray-400 mt-0.5">실행 {seed.runCount}회</p>
        </Link>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExpand}
            disabled={isExpanding}
            className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-60"
          >
            {isExpanding ? "확장 중..." : "지금 확장하기"}
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
