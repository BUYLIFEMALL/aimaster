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
  booked: "예약됨",
  completed: "방문완료",
  no_show: "노쇼",
  cancelled: "취소됨",
};

const STATUS_STYLES: Record<ReservationStatus, string> = {
  booked: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  no_show: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
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
    if (!confirm(`${reservation.customer_name}님 예약을 삭제할까요?`)) return;
    setIsDeleting(true);
    try {
      await deleteReservationAction(reservation.id);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  const time = new Date(reservation.reservation_at).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-gray-900">{reservation.customer_name}</p>
          <p className="text-xs text-gray-500">{time}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[reservation.status]}`}>
          {STATUS_LABELS[reservation.status]}
        </span>
      </div>
      <p className="mt-1 text-xs text-gray-400">
        {reservation.customer_phone ?? "연락처 없음"} · {reservation.customer_email ?? "이메일 없음"}
      </p>
      {reservation.memo && <p className="mt-1 text-xs text-gray-500">{reservation.memo}</p>}

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <select
          value={reservation.status}
          onChange={(e) => handleStatusChange(e.target.value as ReservationStatus)}
          disabled={isUpdating}
          className="rounded-lg border border-gray-200 px-2 py-1 text-xs disabled:opacity-60"
        >
          {(Object.keys(STATUS_LABELS) as ReservationStatus[]).map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <button type="button" onClick={handleDelete} disabled={isDeleting} className="font-semibold text-red-500 hover:underline disabled:opacity-60">
          {isDeleting ? "삭제 중..." : "삭제"}
        </button>
      </div>
    </div>
  );
}
