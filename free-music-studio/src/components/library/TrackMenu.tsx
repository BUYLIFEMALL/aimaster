"use client";

// 곡 「…」 메뉴 — 원본 boks-music `src/App.tsx`(MIT, © 2026 boksajang)의 곡 메뉴 동작을 옮김(2026-11-06):
// 곡 상태에 따라 항목이 바뀌고, 쓸 수 없는 항목은 이유와 함께 흐리게, 화면 아래쪽이면 위로 열고, Esc·바깥 누르기로 닫는다.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

export type MenuItem = { label: string; icon?: ReactNode; onClick: () => void; danger?: boolean; disabled?: string | false; hidden?: boolean };

export function TrackMenu({ items, label }: { items: MenuItem[]; label: string }) {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  const shown = items.filter((i) => !i.hidden);
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label={`${label} 메뉴`}
        aria-expanded={open}
        onClick={() => {
          const r = box.current?.getBoundingClientRect();
          setUp(!!r && window.innerHeight - r.bottom < 320); // 아래 공간이 모자라면 위로
          setOpen((v) => !v);
        }}
        className="inline-flex items-center rounded-lg border border-slate-700 px-2 py-1.5 text-slate-300 hover:bg-slate-900"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <ul role="menu" className={`absolute right-0 z-30 w-56 rounded-xl border border-slate-700 bg-[#0b111f] p-1 shadow-2xl ${up ? "bottom-full mb-1" : "top-full mt-1"}`}>
          {shown.map((i) => (
            <li key={i.label}>
              <button
                type="button"
                role="menuitem"
                disabled={!!i.disabled}
                title={i.disabled || undefined}
                onClick={() => {
                  setOpen(false);
                  i.onClick();
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs disabled:cursor-not-allowed disabled:opacity-40 ${
                  i.danger ? "text-rose-300 hover:bg-rose-950/50" : "text-slate-200 hover:bg-slate-800"
                }`}
              >
                <span className="shrink-0 text-slate-400">{i.icon}</span>
                <span className="min-w-0 flex-1">
                  {i.label}
                  {i.disabled && <span className="block text-[10px] text-slate-500">{i.disabled}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
