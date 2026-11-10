"use client";

import { useState } from "react";

export function CopyButton({ text, label = "복사" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* 직접 선택해 복사 */ }
      }}
      className="shrink-0 rounded-lg bg-[color:var(--navy)] px-2.5 py-1 text-xs font-bold text-white"
    >
      {done ? "✓ 복사됨" : label}
    </button>
  );
}

export function CodeLine({ code }: { code: string }) {
  return (
    <div className="mt-2 flex items-center gap-2 rounded-xl bg-[#0f2a4a] px-3 py-2">
      <code className="min-w-0 flex-1 break-all text-xs text-sky-100">{code}</code>
      <CopyButton text={code} />
    </div>
  );
}
