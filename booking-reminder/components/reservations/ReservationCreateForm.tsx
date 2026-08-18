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
    <form onSubmit={handleSubmit} className="space-y-3 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <h3 className="text-sm font-bold text-gray-800">+ 예약 등록</h3>
      <div className="grid grid-cols-2 gap-3">
        <input name="customerName" required placeholder="고객명" className="input" />
        <input name="reservationAt" type="datetime-local" required className="input" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input name="customerPhone" placeholder="연락처 (문자/카카오 발송용)" className="input" />
        <input name="customerEmail" type="email" placeholder="이메일 (선택)" className="input" />
      </div>
      <input name="memo" placeholder="메모 (선택, 예: 초진/재진, 시술 종류 등)" className="input" />
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-2.5 text-sm font-bold text-white hover:from-blue-700 hover:to-purple-700 disabled:opacity-60 transition-all"
      >
        {isPending ? "등록 중..." : "예약 등록"}
      </button>
    </form>
  );
}
