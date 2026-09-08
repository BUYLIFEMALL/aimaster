"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteReportAction } from "@/lib/actions/reports";

interface ReportListRowProps {
  id: string;
  title: string;
  summary: string;
  createdAt: string;
  topicName: string | null;
}

/**
 * /reports 목록의 카드 1개. 제목/요약 클릭은 상세 화면으로 이동하고, 그 아래 "수정"(상세
 * 화면을 편집 모드로 바로 열기)/"삭제"(확인 후 즉시 삭제) 버튼을 별도로 둔다.
 */
export function ReportListRow({ id, title, summary, createdAt, topicName }: ReportListRowProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("이 리포트를 삭제할까요? 되돌릴 수 없습니다.")) return;
    setIsDeleting(true);
    const formData = new FormData();
    formData.set("id", id);
    try {
      await deleteReportAction(formData);
    } finally {
      router.refresh();
    }
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-900">
      <Link href={`/reports/${id}`} className="block">
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-neutral-900">{title}</p>
          <span className="shrink-0 text-xs text-neutral-400">{new Date(createdAt).toLocaleString("ko-KR")}</span>
        </div>
        {topicName && <p className="mb-1 text-xs text-yellow-700">📌 {topicName}</p>}
        <p className="whitespace-pre-line text-xs text-neutral-500">{summary}</p>
      </Link>
      <div className="mt-2 flex items-center gap-3 border-t border-neutral-100 pt-2">
        <Link href={`/reports/${id}?edit=1`} className="text-xs font-semibold text-blue-600 hover:underline">
          ✏️ 수정
        </Link>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-xs font-semibold text-red-500 hover:underline disabled:opacity-50"
        >
          {isDeleting ? "삭제 중..." : "삭제"}
        </button>
      </div>
    </div>
  );
}
