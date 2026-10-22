"use client";

import { useState } from "react";

/** v1.65: 등록한 Pixabay·Pexels 키가 실제로 되는지 검색 1회(무료)로 확인한다. 키 값은 서버에서만 읽는다. */
export function PhotoKeyCheckButton({ provider }: { provider: "pixabay" | "pexels" }) {
  const [state, setState] = useState<{ busy: boolean; ok?: boolean; message?: string }>({ busy: false });

  const check = async () => {
    setState({ busy: true });
    try {
      const res = await fetch("/api/cardnews/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "search", provider, query: "nature", ratio: "1:1" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setState({ busy: false, ok: false, message: data.error || "확인하지 못했습니다." });
      else setState({ busy: false, ok: true, message: `연결됨 — 사진 ${(data.photos ?? []).length}장 검색 성공` });
    } catch {
      setState({ busy: false, ok: false, message: "네트워크 오류로 확인하지 못했습니다." });
    }
  };

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2 pl-1" data-photo-key-check={provider}>
      <button type="button" onClick={() => void check()} disabled={state.busy} className="whitespace-nowrap rounded-lg border border-[#2f3650] px-2.5 py-1 text-xs font-semibold text-slate-300 hover:border-slate-500 disabled:opacity-50">
        {state.busy ? "확인 중…" : "연결 확인"}
      </button>
      {state.message && <span className={`text-xs ${state.ok ? "text-emerald-400" : "text-rose-400"}`}>{state.ok ? "✅ " : "⚠ "}{state.message}</span>}
    </div>
  );
}
