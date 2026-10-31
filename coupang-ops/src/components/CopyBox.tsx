"use client";

import { useState } from "react";

/** 매뉴얼의 「1초 복사」 상자 — 주소·명령을 눌러 바로 복사 */
export function CopyBox({ text, label }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* 복사 막힌 브라우저 — 글자는 그대로 보임 */ }
      }}
      className="mt-1 flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left font-mono text-xs text-slate-800 hover:bg-slate-100"
    >
      <span className="break-all">{label ? <span className="mr-1 font-sans text-[11px] text-slate-500">{label}</span> : null}{text}</span>
      <span className="shrink-0 font-sans text-[11px] font-bold text-blue-700">{done ? "✅ 복사됨" : "📋 복사"}</span>
    </button>
  );
}
