"use client";

// D33 리셀러 링크 복사 단추
import { useState } from "react";

export default function CopyLink({ url }: { url: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="mt-2 flex items-center gap-2">
      <input readOnly value={url} className="min-w-0 flex-1 rounded border bg-gray-50 px-2 py-2 font-mono text-xs" aria-label="내 리셀러 링크" data-reseller-link />
      <button
        type="button"
        onClick={() => navigator.clipboard?.writeText(url).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }).catch(() => {})}
        className="min-h-11 rounded border px-3 py-2 text-xs"
      >
        {done ? "복사됨" : "링크 복사"}
      </button>
    </div>
  );
}
