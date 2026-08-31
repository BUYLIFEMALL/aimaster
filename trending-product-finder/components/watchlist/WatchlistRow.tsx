"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteWatchlistAction, toggleWatchlistActiveAction } from "@/lib/actions/watchlist";
import { generateReportAction } from "@/lib/actions/reports";

interface WatchlistRowProps {
  id: string;
  categoryName: string;
  keywords: string[];
  isActive: boolean;
}

export function WatchlistRow({ id, categoryName, keywords, isActive }: WatchlistRowProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [genSuccess, setGenSuccess] = useState(false);

  async function handleGenerate() {
    setGenError(null);
    setGenSuccess(false);
    setIsGenerating(true);
    try {
      const formData = new FormData();
      formData.set("watchlistId", id);
      const result = await generateReportAction(formData);
      if (result?.error) {
        setGenError(result.error);
      } else {
        setGenSuccess(true);
        router.refresh();
      }
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-gray-900">{categoryName}</p>
          <p className="text-xs text-gray-500">{keywords.join(", ")}</p>
        </div>
        <div className="flex items-center gap-2">
          <form action={toggleWatchlistActiveAction}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="nextActive" value={(!isActive).toString()} />
            <button type="submit" className="text-xs text-gray-500 hover:text-gray-900">
              {isActive ? "활성" : "비활성"}
            </button>
          </form>
          <form action={deleteWatchlistAction}>
            <input type="hidden" name="id" value={id} />
            <button type="submit" className="text-xs text-red-500 hover:text-red-700">
              삭제
            </button>
          </form>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
        >
          {isGenerating ? "리포트 생성 중..." : "지금 리포트 생성"}
        </button>
        {genSuccess && <span className="text-xs text-emerald-600">완료! 리포트 페이지에서 확인하세요.</span>}
      </div>
      {genError && <p className="text-xs text-red-600">{genError}</p>}
    </div>
  );
}
