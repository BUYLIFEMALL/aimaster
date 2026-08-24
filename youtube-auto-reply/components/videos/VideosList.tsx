"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { VideoRow, type VideoRowData } from "@/components/videos/VideoRow";
import { bulkSetMonitorAction, bulkHideAction } from "@/lib/actions/videos";

export function VideosList({ videos }: { videos: VideoRowData[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, setIsPending] = useState(false);

  const allSelected = videos.length > 0 && videos.every((v) => selectedIds.has(v.id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(videos.map((v) => v.id)));
  }

  async function handleBulk(action: (ids: string[]) => Promise<void>) {
    setIsPending(true);
    try {
      await action(Array.from(selectedIds));
      setSelectedIds(new Set());
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-xs font-semibold text-gray-500">
        <input
          type="checkbox"
          checked={allSelected}
          ref={(el) => {
            if (el) el.indeterminate = someSelected;
          }}
          onChange={toggleAll}
          aria-label="전체 선택"
        />
        전체 선택
      </label>

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2">
          <p className="text-xs font-bold text-blue-700">{selectedIds.size}개 선택됨</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleBulk((ids) => bulkSetMonitorAction(ids, true))}
              disabled={isPending}
              className="text-xs font-bold text-green-700 hover:underline disabled:opacity-60"
            >
              일괄 모니터링 시작
            </button>
            <button
              type="button"
              onClick={() => handleBulk((ids) => bulkSetMonitorAction(ids, false))}
              disabled={isPending}
              className="text-xs font-bold text-gray-600 hover:underline disabled:opacity-60"
            >
              일괄 모니터링 중지
            </button>
            <button
              type="button"
              onClick={() => handleBulk(bulkHideAction)}
              disabled={isPending}
              className="text-xs font-bold text-red-600 hover:underline disabled:opacity-60"
            >
              일괄 숨기기
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {videos.map((v) => (
          <VideoRow key={v.id} video={v} selected={selectedIds.has(v.id)} onToggleSelect={toggleOne} />
        ))}
      </div>
    </div>
  );
}
