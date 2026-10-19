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
    <div className="flex items-center gap-2 rounded-lg border border-blue-200/80 bg-white px-3 py-2 shadow-xs">
      <code className="min-w-0 flex-1 break-all text-neutral-900 font-mono text-xs">{value}</code>
      <button
        type="button"
        onClick={copy}
        className={`shrink-0 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
          copied
            ? "border-green-300 bg-green-50 text-green-700"
            : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
        }`}
      >
        {copied ? "✓ 복사됨" : "복사"}
      </button>
    </div>
  );
}
