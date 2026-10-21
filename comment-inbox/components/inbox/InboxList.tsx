"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { InboxItemCard, type InboxItemHandle } from "@/components/inbox/InboxItemCard";
import type { InboxItem } from "@/lib/inbox/load";

const keyOf = (i: InboxItem) => `${i.platform}-${i.id}`;

/**
 * 받은편지함 목록 — 처리 후 다음 항목 자동 펼침 + 키보드 단축키(v1.02).
 * J/K 또는 ↓/↑ 이동 · Enter 펼치기/접기 · A 승인(펼친 항목만, 아니면 먼저 펼침) · S 건너뛰기 · 글 입력 중에는 Ctrl+Enter로 승인.
 */
export function InboxList({ items }: { items: InboxItem[] }) {
  const router = useRouter();
  const [focus, setFocus] = useState(0);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  // 방금 처리한 항목의 자리 — 새로고침으로 목록이 바뀌면 그 자리(다음 항목)를 펼친다
  const reopenAt = useRef<number | null>(null);
  const handles = useRef(new Map<string, InboxItemHandle>());
  const cardEls = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    if (reopenAt.current === null) return;
    const i = Math.min(reopenAt.current, items.length - 1);
    reopenAt.current = null;
    if (i >= 0) {
      setFocus(i);
      setOpenKey(keyOf(items[i]));
      cardEls.current[i]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    } else {
      setOpenKey(null);
    }
  }, [items]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT" || el.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // v1.03: ? 단축키 도움말 창, Esc로 닫기
      if (e.key === "?") { e.preventDefault(); setHelpOpen((v) => !v); return; }
      if (e.key === "Escape") { setHelpOpen(false); return; }
      if (helpOpen || items.length === 0) return;
      const cur = items[Math.min(focus, items.length - 1)];
      const move = (d: number) => {
        const n = Math.max(0, Math.min(items.length - 1, focus + d));
        setFocus(n);
        cardEls.current[n]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      };
      const k = e.key.toLowerCase();
      if (k === "j" || e.key === "ArrowDown") { e.preventDefault(); move(1); }
      else if (k === "k" || e.key === "ArrowUp") { e.preventDefault(); move(-1); }
      else if (e.key === "Enter") { e.preventDefault(); setOpenKey((o) => (o === keyOf(cur) ? null : keyOf(cur))); }
      else if (k === "a") { e.preventDefault(); handles.current.get(keyOf(cur))?.approve(); }
      else if (k === "s") { e.preventDefault(); handles.current.get(keyOf(cur))?.skip(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items, focus, helpOpen]);

  return (
    <div className="space-y-3">
      <p className="hidden items-center gap-2 text-[11px] text-ig-muted md:flex">
        ⌨️ J/K 이동 · Enter 펼치기 · A 승인 · S 건너뛰기
        <button type="button" onClick={() => setHelpOpen(true)} className="rounded-md border border-ig-border px-1.5 py-0.5 font-bold text-slate-300 hover:bg-ig-raised">
          ? 단축키 전체
        </button>
      </p>
      <p className="text-[11px] text-ig-muted md:hidden">👈 접힌 카드를 왼쪽으로 밀면 건너뛰기</p>
      {helpOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="단축키 도움말"
          onClick={() => setHelpOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl border border-ig-border bg-ig-surface p-5 shadow-xl">
            <h2 className="text-base font-bold text-ig-text">⌨️ 단축키</h2>
            <table className="mt-3 w-full text-sm">
              <tbody className="divide-y divide-ig-border">
                {[
                  ["J / ↓", "다음 항목"],
                  ["K / ↑", "이전 항목"],
                  ["Enter", "펼치기 · 접기"],
                  ["A", "승인(펼친 항목만, 아니면 먼저 펼침)"],
                  ["S", "건너뛰기"],
                  ["Ctrl+Enter", "입력칸에서 승인"],
                  ["Esc", "입력칸 빠져나오기 · 이 창 닫기"],
                  ["?", "이 창 열기·닫기"],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td className="py-1.5 pr-3 font-mono text-xs font-bold text-pink-300">{k}</td>
                    <td className="py-1.5 text-ig-text">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-[11px] text-ig-muted">휴대폰에서는 접힌 카드를 왼쪽으로 밀면 건너뛰기예요.</p>
            <button type="button" onClick={() => setHelpOpen(false)} className="mt-4 w-full rounded-xl bg-ig-primary py-2 text-sm font-bold text-white hover:bg-ig-primary-hover">
              닫기
            </button>
          </div>
        </div>
      )}
      {items.map((item, i) => {
        const k = keyOf(item);
        return (
          <div key={k} ref={(el) => { cardEls.current[i] = el; }}>
            <InboxItemCard
              ref={(h) => {
                if (h) handles.current.set(k, h);
                else handles.current.delete(k);
              }}
              item={item}
              open={openKey === k}
              focused={focus === i}
              onFocus={() => setFocus(i)}
              onOpenChange={(o) => {
                setFocus(i);
                setOpenKey(o ? k : null);
              }}
              onDone={() => {
                reopenAt.current = i;
                router.refresh();
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
