import { type ButtonHTMLAttributes } from "react";
import { clsx } from "@/lib/clsx";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "amber";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-white text-neutral-950 font-semibold hover:bg-neutral-200 disabled:bg-neutral-800 disabled:text-neutral-600 shadow-sm",
  secondary: "bg-neutral-800 text-neutral-200 border border-neutral-700 hover:bg-neutral-700 hover:text-white disabled:opacity-50",
  danger: "bg-red-600 text-white hover:bg-red-500 disabled:opacity-50",
  ghost: "bg-transparent text-neutral-400 hover:bg-neutral-800 hover:text-white",
  amber: "bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 shadow-xs",
};

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
