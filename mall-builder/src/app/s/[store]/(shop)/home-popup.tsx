"use client";

import { useEffect, useState } from "react";
import type { PopupDesign } from "@/lib/builder/frame";

// 디자인 빌더 D3 — 첫 화면 팝업(그림 3장까지). 「n일 보지 않기」는 이 브라우저에만 기억(서버 저장 없음)
// preview: 디자인 편집기 미리보기 — 보지 않기 기록을 무시하고 늘 보인다

const KEY = (slug: string) => `mb-popup-hide-${slug}`;

export default function HomePopup({ slug, popup, preview = false }: { slug: string; popup: PopupDesign; preview?: boolean }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!popup.items.length) return;
    if (preview) return setOpen(true);
    try {
      const until = Number(localStorage.getItem(KEY(slug)) || 0);
      setOpen(Date.now() >= until);
    } catch {
      setOpen(true);
    }
  }, [slug, popup.items.length, preview]);
  if (!open || !popup.items.length) return null;

  function hide() {
    if (!preview) {
      try {
        localStorage.setItem(KEY(slug), String(Date.now() + popup.hide_days * 86400_000));
      } catch {}
    }
    setOpen(false);
  }

  return (
    <div className={`${preview ? "absolute" : "fixed"} inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4`} role="dialog" aria-modal="true" aria-label="알림" data-home-popup>
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {popup.items.map((it, i) => {
            // eslint-disable-next-line @next/next/no-img-element
            const img = <img src={it.image} alt="" className="block w-full" />;
            return it.link ? (
              <a key={i} href={it.link} {...(it.link.startsWith("https://") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                {img}
              </a>
            ) : (
              <div key={i}>{img}</div>
            );
          })}
        </div>
        <div className="flex shrink-0 border-t border-slate-200 text-sm">
          <button type="button" onClick={hide} className="flex-1 px-4 py-3 text-slate-600 hover:bg-slate-50">
            {popup.hide_days === 1 ? "오늘 하루 보지 않기" : `${popup.hide_days}일 동안 보지 않기`}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="flex-1 border-l border-slate-200 px-4 py-3 font-semibold text-slate-900 hover:bg-slate-50">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
