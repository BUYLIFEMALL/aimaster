"use client";

import { useFormStatus } from "react-dom";

// docs/PLATFORM_PATTERNS.md §5 "서버 액션 삭제 버튼 — 처리중 표시 패턴" 표준 구현.
export function DeleteReadingButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => e.stopPropagation()}
      className="text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? "삭제 중..." : "🗑️ 삭제"}
    </button>
  );
}
