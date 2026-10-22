"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteReservationAction, updateReservationStatusAction } from "@/lib/actions/reservations";
import type { ReservationStatus } from "@/types/database.types";

export interface ReservationData {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  reservation_at: string;
  memo: string | null;
  status: ReservationStatus;
}

const STATUS_LABELS: Record<ReservationStatus, string> = {
  booked: "예약 대기",
  completed: "방문 완료",
  no_show: "노쇼(불참)",
  cancelled: "예약 취소",
};

const STATUS_STYLES: Record<ReservationStatus, string> = {
  booked: "bg-blue-50 text-blue-700 border border-blue-200",
  completed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  no_show: "bg-red-50 text-red-700 border border-red-200",
  cancelled: "bg-slate-100 text-slate-500 border border-slate-200",
};

export function ReservationRow({ reservation }: { reservation: ReservationData }) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleStatusChange(status: ReservationStatus) {
    setIsUpdating(true);
    try {
      await updateReservationStatusAction(reservation.id, status);
      router.refresh();
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`${reservation.customer_name}님 예약을 삭제하시겠습니까?`)) return;
    setIsDeleting(true);
    try {
      await deleteReservationAction(reservation.id);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  const dateObj = new Date(reservation.reservation_at);
  const formattedDate = dateObj.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Seoul",
  });
  const formattedTime = dateObj.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  });

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm hover:border-blue-200 hover:shadow-md transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-sm">{reservation.customer_name}</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLES[reservation.status]}`}>
              {STATUS_LABELS[reservation.status]}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-blue-600 flex items-center gap-1">
              <span>📅</span>
              <span>{formattedDate} {formattedTime}</span>
            </span>
            <span>·</span>
            <span>📞 {reservation.customer_phone ?? "연락처 미등록"}</span>
            {reservation.customer_email && (
              <>
                <span>·</span>
                <span>✉️ {reservation.customer_email}</span>
              </>
            )}
          </div>

          {reservation.memo && (
            <p className="text-xs text-slate-600 bg-slate-50 rounded-lg px-2.5 py-1 mt-1 inline-block">
              💬 {reservation.memo}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <select
            value={reservation.status}
            onChange={(e) => handleStatusChange(e.target.value as ReservationStatus)}
            disabled={isUpdating}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          >
            {(Object.keys(STATUS_LABELS) as ReservationStatus[]).map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            title="예약 삭제"
          >
            {isDeleting ? "삭제 중" : "삭제"}
          </button>
        </div>
      </div>
    </div>
  );
}
