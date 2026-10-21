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
      if (e.ctrlKey || e.metaKey || e.altKey || items.length === 0) return;
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
  }, [items, focus]);

  return (
    <div className="space-y-3">
      <p className="hidden text-[11px] text-ig-muted md:block">
        ⌨️ 단축키 — J/K 이동 · Enter 펼치기 · A 승인(펼친 항목) · S 건너뛰기 · 입력칸에서 Ctrl+Enter 승인, Esc 빠져나오기
      </p>
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
