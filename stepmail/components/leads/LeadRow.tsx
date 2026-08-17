"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateLeadStatusAction, deleteLeadAction } from "@/lib/actions/leads";
import { getLeadDisplayStatus } from "@/lib/leadStatus";
import { formatDateTime } from "@/lib/formatDate";
import type { LeadStatus } from "@/types/database.types";

export interface LeadRowData {
  id: string;
  input_date: string | null;
  channel: string | null;
  nickname: string | null; // 선택 항목 — 없으면 null
  email: string;
  status: LeadStatus;
  send_count: number;
  last_sent_at: string | null;
  updated_at: string; // 발송 차수 증가, 발송제외/수신거부 처리 등 상태가 바뀔 때마다 자동 갱신됨
}

export function LeadRow({
  lead,
  selected,
  onToggleSelect,
}: {
  lead: LeadRowData;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const badge = getLeadDisplayStatus(lead);

  async function handleExclude() {
    setIsPending(true);
    try {
      await updateLeadStatusAction(lead.id, "customer_completed");
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  async function handleDelete() {
    setIsPending(true);
    try {
      await deleteLeadAction(lead.id);
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <tr className="border-b border-gray-50 last:border-0">
      <td className="py-2 px-3 w-8">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(lead.id)}
          aria-label={`${lead.email} 선택`}
        />
      </td>
      <td className="py-2 px-3 text-sm text-gray-900">{lead.email}</td>
      <td className="py-2 px-3 text-sm text-gray-500">{lead.nickname ?? "-"}</td>
      <td className="py-2 px-3 text-sm text-gray-500">{lead.channel ?? "-"}</td>
      <td className="py-2 px-3">
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${badge.className}`}>
          {badge.label}
        </span>
      </td>
      <td className="py-2 px-3 text-xs text-gray-400 whitespace-nowrap">{lead.input_date ? formatDateTime(lead.input_date) : "-"}</td>
      <td className="py-2 px-3 text-xs text-gray-400 whitespace-nowrap">{formatDateTime(lead.updated_at)}</td>
      <td className="py-2 px-3">
        <div className="flex gap-2 justify-end">
          {lead.status !== "customer_completed" && (
            <button
              type="button"
              onClick={handleExclude}
              disabled={isPending}
              className="text-xs font-semibold text-red-500 hover:underline disabled:opacity-60 whitespace-nowrap"
            >
              발송제외 처리
            </button>
          )}
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="text-xs font-semibold text-gray-400 hover:underline disabled:opacity-60"
          >
            삭제
          </button>
        </div>
      </td>
    </tr>
  );
}
