import { type InputHTMLAttributes } from "react";
import { clsx } from "@/lib/clsx";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        "w-full rounded-lg border border-zinc-200 bg-dark-100 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-gold",
        className,
      )}
      {...props}
    />
  );
}
