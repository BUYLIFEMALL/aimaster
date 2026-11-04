import { forwardRef, useEffect, useRef, type TextareaHTMLAttributes } from "react";
import { clsx } from "@/lib/clsx";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** 내용 길이에 맞춰 높이가 자동으로 늘어나게 한다 — AI가 생성한 긴 본문/프롬프트처럼
   * 내부 스크롤 없이 전체 내용을 한눈에 다 보여줘야 하는 필드에 쓴다(2026-09-12). */
  autoGrow?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoGrow = false, value, ...props }, forwardedRef) => {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);

    useEffect(() => {
      if (!autoGrow) return;
      const el = innerRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }, [autoGrow, value]);

    return (
      <textarea
        ref={(node) => {
          innerRef.current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) forwardedRef.current = node;
        }}
        value={value}
        className={clsx(
          "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900",
          autoGrow ? "resize-none overflow-hidden" : "resize-none",
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";
