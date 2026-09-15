"use client";

import { useFormStatus } from "react-dom";
import { clsx } from "@/lib/clsx";

export function CandidateScheduleToggleButton({ on }: { on: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      title="🎲 후보함에서 랜덤 선택 예약 소스가 이 후보를 재료로 쓸지 정합니다"
      className={clsx(
        "rounded-full px-2.5 py-1 text-xs font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        on ? "bg-blue-600 hover:bg-blue-700" : "bg-neutral-300 hover:bg-neutral-400",
      )}
    >
      {pending ? "변경 중..." : on ? "🎲 예약용 ON" : "예약용 OFF"}
    </button>
  );
}
