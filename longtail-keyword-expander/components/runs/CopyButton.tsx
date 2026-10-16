"use client";

import { useState } from "react";

// 클립보드 복사 + "복사됨" 피드백
export function CopyButton({ text, label = "복사" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" onClick={handleCopy} className="mx-btn-ghost min-h-[36px] px-3 text-xs">
      {copied ? "✅ 복사됨" : `📋 ${label}`}
    </button>
  );
}
