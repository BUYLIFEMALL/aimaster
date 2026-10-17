import { type TextareaHTMLAttributes } from "react";
import { clsx } from "@/lib/clsx";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsx(
        "w-full resize-none rounded-lg border border-mx-border px-3 py-2 text-sm text-mx-text outline-none focus:border-mx-primary",
        className,
      )}
      {...props}
    />
  );
}
