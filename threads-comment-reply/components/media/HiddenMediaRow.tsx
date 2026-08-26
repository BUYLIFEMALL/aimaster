"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { unhideMediaAction } from "@/lib/actions/media";

export function HiddenMediaRow({ media }: { media: { id: string; text: string | null } }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleUnhide() {
    setIsPending(true);
    try {
      await unhideMediaAction(media.id);
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-2.5">
      <p className="min-w-0 flex-1 truncate text-sm text-gray-500">{media.text || "(텍스트 없음)"}</p>
      <button
        type="button"
        onClick={handleUnhide}
        disabled={isPending}
        className="shrink-0 text-xs font-semibold text-blue-600 hover:underline disabled:opacity-60"
      >
        {isPending ? "복원 중..." : "다시 보이기"}
      </button>
    </div>
  );
}
