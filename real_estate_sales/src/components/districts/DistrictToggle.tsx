"use client";

import { useTransition } from "react";
import { toggleDistrictAction } from "@/lib/actions/districts";
import { clsx } from "@/lib/clsx";

export function DistrictToggle({
  sggCd,
  sggNm,
  isActive,
}: {
  sggCd: string;
  sggNm: string;
  isActive: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        const fd = new FormData();
        fd.set("sggCd", sggCd);
        fd.set("nextActive", String(!isActive));
        startTransition(() => {
          toggleDistrictAction(fd);
        });
      }}
      className={clsx(
        "rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50",
        isActive
          ? "border-gold bg-gold-gradient text-dark"
          : "border-white/10 bg-dark-100 text-neutral-300 hover:border-gold/40",
      )}
    >
      {sggNm}
    </button>
  );
}
