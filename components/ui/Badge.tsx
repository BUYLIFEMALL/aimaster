import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type BadgeVariant = "new" | "best" | "sale" | "coming" | "free" | "custom";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  label?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  new: "badge-new",
  best: "badge-best",
  sale: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  coming: "bg-neutral-500/20 text-neutral-400 border border-neutral-500/30",
  free: "bg-red-500/20 text-red-400 border border-red-500/30",
  custom: "",
};

const defaultLabels: Record<BadgeVariant, string> = {
  new: "NEW",
  best: "BEST",
  sale: "SALE",
  coming: "COMING SOON",
  free: "FREE",
  custom: "",
};

export default function Badge({
  variant = "new",
  label,
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {label ?? defaultLabels[variant]}
    </span>
  );
}
