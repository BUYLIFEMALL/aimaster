"use client";

import { useFormStatus } from "react-dom";
import { clsx } from "@/lib/clsx";

export function CandidateScheduleToggleButton({ on }: { on: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      title="🗂️ 후보함에서 예약 발행 소스가 이 후보를 재료로 쓸지 정합니다 (켠 순서대로 소비됩니다)"
      className={clsx(
        "rounded-full px-2.5 py-1 text-xs font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        on ? "bg-blue-600 hover:bg-blue-700" : "bg-neutral-300 hover:bg-neutral-400",
      )}
    >
      {pending ? "변경 중..." : on ? "예약포스팅 ON" : "예약포스팅 OFF"}
    </button>
  );
}
