import { type ButtonHTMLAttributes } from "react";
import { clsx } from "@/lib/clsx";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-gold-gradient text-dark hover:shadow-gold disabled:opacity-40",
  secondary: "bg-dark-100 text-neutral-100 border border-white/10 hover:bg-dark-200",
  danger: "bg-red-600 text-white hover:bg-red-500 disabled:bg-red-900",
  ghost: "bg-transparent text-neutral-300 hover:bg-dark-100",
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
