"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createReservationAction } from "@/lib/actions/reservations";

export function ReservationCreateForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const result = await createReservationAction(new FormData(e.currentTarget));
      if (result.error) {
        setError(result.error);
      } else {
        (e.target as HTMLFormElement).reset();
        router.refresh();
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-5 md:p-6 shadow-sm"
    >
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <span>📝</span>
          <span>신규 예약 정보 입력</span>
        </h3>
        <span className="text-[11px] text-slate-400">필수 항목(*)을 모두 입력해 주세요</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">고객 성함 *</label>
          <input
            name="customerName"
            required
            placeholder="예: 홍길동"
            className="input text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">예약 일시 *</label>
          <input
            name="reservationAt"
            type="datetime-local"
            required
            className="input text-sm font-medium"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">연락처 (알림톡/문자 발송용)</label>
          <input
            name="customerPhone"
            placeholder="예: 010-1234-5678"
            className="input text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">이메일 (이메일 리마인드용)</label>
          <input
            name="customerEmail"
            type="email"
            placeholder="예: user@example.com (선택)"
            className="input text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">예약 메모 / 시술 및 상담 항목</label>
        <input
          name="memo"
          placeholder="예: 퍼스널 컬러 진단 1인 코스 (초진, 주차 지원 요청 등)"
          className="input text-sm"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-600 font-medium">
          ⚠️ {error}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all"
        >
          {isPending ? (
            <>
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>등록 처리 중...</span>
            </>
          ) : (
            <>
              <span>+</span>
              <span>신규 예약 등록하기</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
