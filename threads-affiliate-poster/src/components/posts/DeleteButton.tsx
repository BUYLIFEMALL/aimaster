"use client";

import { useFormStatus } from "react-dom";
import { clsx } from "@/lib/clsx";

interface DeleteButtonProps {
  className?: string;
  label?: string;
  pendingLabel?: string;
  variant?: "pill" | "solid";
}

const VARIANT_CLASSES: Record<NonNullable<DeleteButtonProps["variant"]>, string> = {
  pill: "rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100",
  solid: "inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500",
};

export function DeleteButton({ className, label = "삭제", pendingLabel = "삭제 중...", variant = "pill" }: DeleteButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={clsx(
        "transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
