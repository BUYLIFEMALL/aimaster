import { type ButtonHTMLAttributes } from "react";
import { clsx } from "@/lib/clsx";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-mx-primary text-white hover:bg-mx-primary-strong disabled:opacity-50",
  secondary: "bg-mx-surface text-mx-text border border-mx-border hover:bg-mx-raised",
  danger: "bg-mx-danger text-white hover:bg-mx-danger/80 disabled:opacity-50",
  ghost: "bg-transparent text-mx-muted hover:bg-mx-raised",
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
