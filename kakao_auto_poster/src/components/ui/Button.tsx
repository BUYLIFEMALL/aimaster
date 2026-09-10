import { type ButtonHTMLAttributes } from "react";
import { clsx } from "@/lib/clsx";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "info" | "muted" | "warning" | "success";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-neutral-900 text-white hover:bg-neutral-700 disabled:bg-neutral-300",
  secondary: "bg-white text-neutral-900 border border-neutral-300 hover:bg-neutral-50",
  danger: "bg-red-600 text-white hover:bg-red-500 disabled:bg-red-300",
  ghost: "bg-transparent text-neutral-600 hover:bg-neutral-100",
  info: "bg-blue-600 text-white hover:bg-blue-500 disabled:bg-blue-300",
  muted: "bg-neutral-500 text-white hover:bg-neutral-400 disabled:bg-neutral-300",
  warning: "bg-yellow-400 text-black hover:bg-yellow-300 disabled:bg-yellow-200",
  success: "bg-green-600 text-white hover:bg-green-500 disabled:bg-green-300",
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
