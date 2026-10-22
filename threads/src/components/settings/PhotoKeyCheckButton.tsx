"use client";

import { useState } from "react";

/** v1.30: 등록한 Pixabay·Pexels 키가 실제로 되는지 검색 1회(무료)로 확인한다. 키 값은 서버에서만 읽는다(INSTA v1.65와 같은 방식). */
export function PhotoKeyCheckButton({ provider }: { provider: "pixabay" | "pexels" }) {
  const [state, setState] = useState<{ busy: boolean; ok?: boolean; message?: string }>({ busy: false });
  const name = provider === "pixabay" ? "Pixabay" : "Pexels";

  const check = async () => {
    setState({ busy: true });
    try {
      const res = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "search", provider, query: "nature" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setState({ busy: false, ok: false, message: data.error || "확인하지 못했습니다." });
      else setState({ busy: false, ok: true, message: `연결됨 — 사진 ${(data.photos ?? []).length}장 검색 성공` });
    } catch {
      setState({ busy: false, ok: false, message: "네트워크 오류로 확인하지 못했습니다." });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2" data-photo-key-check={provider}>
      <button type="button" onClick={() => void check()} disabled={state.busy} className="whitespace-nowrap rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50">
        {state.busy ? "확인 중…" : `${name} 연결 확인`}
      </button>
      {state.message && <span className={`text-xs ${state.ok ? "text-emerald-700" : "text-red-600"}`}>{state.ok ? "✅ " : "⚠ "}{state.message}</span>}
    </div>
  );
}
