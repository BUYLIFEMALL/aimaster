"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { unhideMediaAction } from "@/lib/actions/media";

export function HiddenMediaRow({ media }: { media: { id: string; caption: string | null } }) {
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
    <div className="flex items-center justify-between gap-3 rounded-xl border border-ig-border bg-ig-raised px-4 py-2.5">
      <p className="min-w-0 flex-1 truncate text-sm text-ig-muted">{media.caption || "(캡션 없음)"}</p>
      <button
        type="button"
        onClick={handleUnhide}
        disabled={isPending}
        className="shrink-0 text-xs font-semibold text-ig-primary hover:underline disabled:opacity-60"
      >
        {isPending ? "복원 중..." : "다시 보이기"}
      </button>
    </div>
  );
}
