"use client";

import { useEffect, useRef, useState } from "react";
import { DIALOG_EVENT, setDialogHostReady, type DialogRequest } from "@/lib/uiDialog";

type Confirm = Extract<DialogRequest, { kind: "confirm" }>;

/** 화면 안 알림(아래 쪽 알림 줄)과 확인 창(가운데). 대시보드 셸에 한 번만 붙인다. */
export default function DialogHost() {
  const [notices, setNotices] = useState<{ id: number; message: string }[]>([]);
  const [queue, setQueue] = useState<Confirm[]>([]);
  const okRef = useRef<HTMLButtonElement>(null);
  const current = queue[0];

  useEffect(() => {
    setDialogHostReady(true);
    const onRequest = (event: Event) => {
      const detail = (event as CustomEvent<DialogRequest>).detail;
      if (!detail) return;
      if (detail.kind === "notify") {
        setNotices((list) => [...list.slice(-2), { id: detail.id, message: detail.message }]);
        window.setTimeout(() => setNotices((list) => list.filter((item) => item.id !== detail.id)), 6000);
      } else {
        setQueue((list) => [...list, detail]);
      }
    };
    window.addEventListener(DIALOG_EVENT, onRequest);
    return () => { setDialogHostReady(false); window.removeEventListener(DIALOG_EVENT, onRequest); };
  }, []);

  useEffect(() => { if (current) okRef.current?.focus(); }, [current]);

  const answer = (ok: boolean) => {
    if (!current) return;
    current.resolve(ok);
    setQueue((list) => list.slice(1));
  };

  return (
    <>
      {current && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4" role="presentation"
          onClick={() => answer(false)} onKeyDown={(e) => { if (e.key === "Escape") answer(false); }}>
          <div role="alertdialog" aria-modal="true" aria-label="확인" onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-800">{current.message}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => answer(false)} className="rounded-lg border border-neutral-300 px-4 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50">취소</button>
              <button type="button" ref={okRef} onClick={() => answer(true)} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700">확인</button>
            </div>
          </div>
        </div>
      )}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[110] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {notices.map((item) => (
          <div key={item.id} role="status" className="pointer-events-auto flex max-w-lg items-start gap-3 rounded-xl bg-neutral-900 px-4 py-3 text-sm text-white shadow-lg">
            <span className="whitespace-pre-line leading-relaxed">{item.message}</span>
            <button type="button" aria-label="알림 닫기" onClick={() => setNotices((list) => list.filter((n) => n.id !== item.id))} className="shrink-0 text-neutral-400 hover:text-white">✕</button>
          </div>
        ))}
      </div>
    </>
  );
}
