import { type TextareaHTMLAttributes } from "react";
import { clsx } from "@/lib/clsx";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsx(
        "w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900",
        className,
      )}
      {...props}
    />
  );
}
