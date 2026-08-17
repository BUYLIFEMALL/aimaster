"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LeadRow, type LeadRowData } from "@/components/leads/LeadRow";
import { deleteLeadsAction, bulkExcludeLeadsAction } from "@/lib/actions/leads";

export function LeadsTable({ leads }: { leads: LeadRowData[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExcluding, setIsExcluding] = useState(false);

  const allSelected = leads.length > 0 && leads.every((l) => selectedIds.has(l.id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(leads.map((l) => l.id)));
  }

  async function handleBulkExclude() {
    setIsExcluding(true);
    try {
      await bulkExcludeLeadsAction(Array.from(selectedIds));
      setSelectedIds(new Set());
      router.refresh();
    } finally {
      setIsExcluding(false);
    }
  }

  async function handleDeleteSelected() {
    setIsDeleting(true);
    try {
      await deleteLeadsAction(Array.from(selectedIds));
      setSelectedIds(new Set());
      setConfirmingDelete(false);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-2">
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-2">
          <p className="text-xs font-bold text-blue-700">{selectedIds.size.toLocaleString()}건 선택됨</p>
          <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBulkExclude}
            disabled={isExcluding}
            className="text-xs font-bold text-amber-600 hover:underline disabled:opacity-60"
          >
            {isExcluding ? "변경 중..." : "일괄 발송제외"}
          </button>
          {confirmingDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-600">정말 삭제할까요? 되돌릴 수 없습니다.</span>
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {isDeleting ? "삭제 중..." : "삭제"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={isDeleting}
                className="text-xs font-semibold text-gray-500 hover:underline"
              >
                취소
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="text-xs font-bold text-red-600 hover:underline"
            >
              일괄 삭제
            </button>
          )}
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="py-2 px-3 w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  aria-label="전체 선택"
                />
              </th>
              <th className="py-2 px-3 text-xs font-semibold text-gray-500">이메일</th>
              <th className="py-2 px-3 text-xs font-semibold text-gray-500">닉네임</th>
              <th className="py-2 px-3 text-xs font-semibold text-gray-500">채널</th>
              <th className="py-2 px-3 text-xs font-semibold text-gray-500">상태</th>
              <th className="py-2 px-3 text-xs font-semibold text-gray-500">입력일</th>
              <th className="py-2 px-3 text-xs font-semibold text-gray-500">최종수정일</th>
              <th className="py-2 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <LeadRow key={lead.id} lead={lead} selected={selectedIds.has(lead.id)} onToggleSelect={toggleOne} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
