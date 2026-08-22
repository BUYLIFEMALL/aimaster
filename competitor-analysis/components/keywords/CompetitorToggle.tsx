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
      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap disabled:opacity-60 ${
        isTracked
          ? "bg-blue-600 text-white"
          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
      }`}
    >
      {isTracked ? "✓ 내 경쟁사" : "+ 경쟁사로 표시"}
    </button>
  );
}
