"use client";

import { useFormStatus } from "react-dom";
import { clsx } from "@/lib/clsx";

export function CandidateScheduleToggleButton({ on }: { on: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      title="새로 수집된 후보는 기본적으로 예약포스팅 대상에 포함됩니다. 이 글만 자동 발행에서 빼고 싶으면 OFF로 꺼주세요."
      className={clsx(
        "rounded-full px-2.5 py-1 text-xs font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        on ? "bg-blue-600 hover:bg-blue-700" : "bg-red-500 hover:bg-red-600",
      )}
    >
      {pending ? "변경 중..." : on ? "예약포스팅 포함" : "예약포스팅 제외됨"}
    </button>
  );
}
