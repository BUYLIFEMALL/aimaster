"use client";

import { useState } from "react";

// 회원이 본인 Meta 앱에 붙여넣을 주소를 보여주고, 옆 버튼으로 한 번에 복사하게 한다(2026-10-17).
export function CopyAddress({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // 클립보드 권한이 막힌 브라우저용 예비 방법
      const el = document.createElement("textarea");
      el.value = value;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex items-center gap-2 rounded bg-ig-raised px-2 py-1.5">
      <code className="min-w-0 flex-1 break-all text-ig-text">{value}</code>
      <button
        type="button"
        onClick={copy}
        className={`shrink-0 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
          copied
            ? "border-ig-success/30 bg-ig-success/10 text-ig-success"
            : "border-ig-border bg-ig-surface text-ig-text hover:bg-ig-hover"
        }`}
      >
        {copied ? "✓ 복사됨" : "복사"}
      </button>
    </div>
  );
}
