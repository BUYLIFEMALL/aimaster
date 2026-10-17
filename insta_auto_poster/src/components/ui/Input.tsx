import { type InputHTMLAttributes } from "react";
import { clsx } from "@/lib/clsx";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        "w-full rounded-xl border border-[#262c3d] bg-[#0d0f17] px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/20 transition-all",
        className,
      )}
      {...props}
    />
  );
}
