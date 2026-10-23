import { type InputHTMLAttributes } from "react";
import { clsx } from "@/lib/clsx";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        "w-full rounded-lg border border-mx-border px-3 py-2 text-sm text-mx-text outline-none focus:border-mx-primary",
        className,
      )}
      {...props}
    />
  );
}
