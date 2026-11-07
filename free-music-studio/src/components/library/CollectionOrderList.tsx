"use client";

// 프로젝트·플레이리스트 목록 순서 바꾸기(v1.31, 주인님 「순서 이동 시킬수 있게 해줘」「플레이 리스트도」).
// 좌측 메뉴와 「모든 음악」 왼쪽 목록이 함께 쓴다. ⠿ 손잡이를 끌거나, 손잡이에서 ↑↓/Home/End.
// 저장하면 COLLECTIONS_CHANGED 알림을 보내 다른 목록도 다시 읽는다. 순서 계산은 곡 순서와 같은 moveTo.
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { COLLECTIONS_CHANGED, type Collection, type CollectionKind } from "@/lib/collections";
import { moveTo, sameOrder } from "@/lib/trackOrder";

export async function saveCollectionOrder(kind: CollectionKind, ids: string[]): Promise<boolean> {
  const res = await fetch("/api/collections", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, ids }) }).catch(() => null);
  if (!res?.ok) return false;
  window.dispatchEvent(new Event(COLLECTIONS_CHANGED));
  return true;
}

export function CollectionOrderList({
  kind,
  list,
  onSaved,
  rowClassName = "",
  children,
}: {
  kind: CollectionKind;
  list: Collection[];
  /** 저장이 끝난 새 순서(실패하면 원래 순서로 돌아감) */
  onSaved?: (next: Collection[]) => void;
  rowClassName?: string;
  children: (c: Collection) => ReactNode;
}) {
  const ids = list.map((c) => c.id);
  const key = ids.join("|");
  const [draft, setDraft] = useState<string[] | null>(null);
  const [dragging, setDragging] = useState("");
  const draftRef = useRef<string[] | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const keyTimer = useRef(0);
  draftRef.current = draft;

  useEffect(() => {
    if (!dragging) setDraft(null);
  }, [key]); // 끄는 중에는 버리지 않는다
  useEffect(() => () => window.clearTimeout(keyTimer.current), []);

  const order = draft ?? ids;
  const byId = new Map(list.map((c) => [c.id, c]));
  const shown = order.map((id) => byId.get(id)).filter((c): c is Collection => !!c);

  const commit = async (next: string[]) => {
    if (sameOrder(next, ids)) return setDraft(null);
    setDraft(next);
    if (await saveCollectionOrder(kind, next)) onSaved?.(next.map((id) => byId.get(id)).filter((c): c is Collection => !!c));
    else setDraft(null);
  };

  const startDrag = (e: PointerEvent<HTMLButtonElement>, id: string) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const pointer = e.pointerId;
    draftRef.current = order;
    setDraft(order);
    setDragging(id);
    const move = (n: globalThis.PointerEvent) => {
      if (n.pointerId !== pointer || !host.current) return;
      const rows = [...host.current.querySelectorAll<HTMLElement>("[data-col-id]")].filter((r) => r.dataset.colId !== id);
      let to = rows.length;
      for (let i = 0; i < rows.length; i++) {
        const box = rows[i].getBoundingClientRect();
        if (n.clientY < box.top + box.height / 2) {
          to = i;
          break;
        }
      }
      const cur = draftRef.current ?? ids;
      const next = moveTo(cur, id, to);
      if (!sameOrder(next, cur)) {
        draftRef.current = next;
        setDraft(next);
      }
    };
    const end = (n: globalThis.PointerEvent) => {
      if (n.pointerId !== pointer) return;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      setDragging("");
      void commit(draftRef.current ?? ids);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  };

  const keyMove = (e: KeyboardEvent<HTMLButtonElement>, id: string) => {
    const i = order.indexOf(id);
    const to = ({ ArrowUp: i - 1, ArrowDown: i + 1, Home: 0, End: order.length - 1 } as Record<string, number>)[e.key];
    if (to === undefined) return;
    e.preventDefault();
    if (to < 0 || to >= order.length || to === i) return;
    const next = moveTo(order, id, to);
    setDraft(next);
    window.clearTimeout(keyTimer.current);
    keyTimer.current = window.setTimeout(() => void commit(draftRef.current ?? next), 450);
    requestAnimationFrame(() => host.current?.querySelector<HTMLButtonElement>(`[data-col-id="${CSS.escape(id)}"] [data-grip]`)?.focus());
  };

  return (
    <div ref={host} className={`space-y-0.5 ${dragging ? "select-none" : ""}`}>
      {shown.map((c) => (
        <div key={c.id} data-col-id={c.id} className={`group/col flex items-center rounded-lg ${dragging === c.id ? "bg-emerald-950/50 ring-1 ring-emerald-400/60" : ""} ${rowClassName}`}>
          {shown.length > 1 && (
            <button
              type="button"
              data-grip
              title="끌어서 순서 바꾸기 (↑↓ 키도 됨)"
              aria-label={`${c.name} 순서 옮기기 (↑↓ 키)`}
              onPointerDown={(e) => startDrag(e, c.id)}
              onKeyDown={(e) => keyMove(e, c.id)}
              className="shrink-0 cursor-grab touch-none rounded p-0.5 text-slate-600 opacity-40 hover:bg-slate-800 hover:text-slate-200 focus:opacity-100 group-hover/col:opacity-100 active:cursor-grabbing"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
          )}
          <div className="min-w-0 flex-1">{children(c)}</div>
        </div>
      ))}
    </div>
  );
}
