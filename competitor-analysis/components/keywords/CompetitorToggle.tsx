"use client";

import { useState, useTransition } from "react";
import { trackCompetitorAction, untrackCompetitorAction } from "@/lib/actions/competitors";

export function CompetitorToggle({ domain, tracked }: { domain: string; tracked: boolean }) {
  const [isTracked, setIsTracked] = useState(tracked);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      if (isTracked) {
        await untrackCompetitorAction(domain);
        setIsTracked(false);
      } else {
        await trackCompetitorAction(domain);
        setIsTracked(true);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`min-h-[36px] whitespace-nowrap rounded-full px-3 text-xs font-semibold disabled:opacity-60 ${
        isTracked
          ? "bg-mx-primary text-white"
          : "border border-mx-border bg-mx-raised text-mx-muted hover:text-mx-text"
      }`}
    >
      {isTracked ? "✓ 내 경쟁사" : "+ 경쟁사로 표시"}
    </button>
  );
}
