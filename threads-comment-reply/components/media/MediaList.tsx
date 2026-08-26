"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MediaRow, type MediaRowData } from "@/components/media/MediaRow";
import { bulkSetMonitorAction, bulkHideAction } from "@/lib/actions/media";

export function MediaList({ media }: { media: MediaRowData[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, setIsPending] = useState(false);

  const allSelected = media.length > 0 && media.every((m) => selectedIds.has(m.id));
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
    setSelectedIds(allSelected ? new Set() : new Set(media.map((m) => m.id)));
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
        {media.map((m) => (
          <MediaRow key={m.id} media={m} selected={selectedIds.has(m.id)} onToggleSelect={toggleOne} />
        ))}
      </div>
    </div>
  );
}
