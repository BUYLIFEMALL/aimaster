"use client";

import { useState } from "react";
import { searchFreePhotos } from "./web-actions";

/** v2.17: 등록한 Pixabay·Pexels 키가 실제로 되는지 검색 1회(무료)로 확인. 키 값은 서버에서만 읽는다. */
export function PhotoKeyCheck({ provider }: { provider: "pixabay" | "pexels" }) {
  const [state, setState] = useState<{ busy: boolean; ok?: boolean; text?: string }>({ busy: false });
  const name = provider === "pixabay" ? "Pixabay" : "Pexels";
  const check = async () => {
    setState({ busy: true });
    const result = await searchFreePhotos({ provider, query: "nature" }).catch(() => ({ ok: false as const, error: "확인하지 못했습니다." }));
    setState(result.ok ? { busy: false, ok: true, text: `연결됨 — 사진 ${result.photos.length}장 검색 성공` } : { busy: false, ok: false, text: result.error });
  };
  return (
    <div className="flex flex-wrap items-center gap-2" data-photo-key-check={provider}>
      <button type="button" onClick={() => void check()} disabled={state.busy} className="whitespace-nowrap rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50">
        {state.busy ? "확인 중…" : `${name} 연결 확인`}
      </button>
      {state.text && <span className={`text-xs ${state.ok ? "text-emerald-700" : "text-rose-700"}`}>{state.ok ? "✅ " : "⚠ "}{state.text}</span>}
    </div>
  );
}
