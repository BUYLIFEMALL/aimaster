"use client";

import { useEffect, useRef, useState } from "react";

// 클립보드 복사 + "복사됨" 피드백
export function CopyButton({ text, label = "복사" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  async function handleCopy() {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setCopied(false);
    setFailed(false);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      resetTimer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      setFailed(true);
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button type="button" onClick={handleCopy} className="mx-btn-ghost px-3 text-xs" aria-live="polite">
        {copied ? "✅ 복사됨" : `📋 ${label}`}
      </button>
      {failed && <span role="status" className="max-w-[240px] text-xs text-mx-danger">복사하지 못했습니다. 내용을 직접 선택해 복사해 주세요.</span>}
    </span>
  );
}
