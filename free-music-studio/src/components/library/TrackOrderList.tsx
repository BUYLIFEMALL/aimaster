"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { ArrowDownAZ, ArrowUpAZ, GripVertical, Undo2 } from "lucide-react";
import { moveTo, sameOrder, sortByTitle } from "@/lib/trackOrder";

// 플레이리스트 곡 목록 — 원본 boks-music `src/TrackOrderList.tsx`(MIT, © 2026 boksajang) 동작을 옮김(2026-11-06).
// 순서 바꾸기: 손잡이 끌기(목록 끝에서 자동 스크롤) · 번호를 눌러 자리 입력 · 손잡이에서 ↑↓/Home/End · 제목순 정렬, 마지막 변경 되돌리기.
type Row = { id: string; title: string };

export function TrackOrderList<T extends Row>({
  items,
  editable,
  onOrder,
  rowClassName,
  renderRow,
}: {
  items: T[];
  editable: boolean;
  /** 새 순서 저장 — 실패하면 false */
  onOrder: (ids: string[]) => Promise<boolean>;
  rowClassName: string;
  renderRow: (item: T, index: number, tools: { badge: ReactNode; grip: ReactNode }) => ReactNode;
}) {
  const ids = items.map((t) => t.id);
  const key = ids.join("|");
  const [draft, setDraft] = useState<string[] | null>(null);
  const [dragging, setDragging] = useState("");
  const [sort, setSort] = useState<"asc" | "desc" | "">("");
  const [typing, setTyping] = useState<{ id: string; value: string } | null>(null);
  const [undo, setUndo] = useState<string[] | null>(null);
  const list = useRef<HTMLUListElement>(null);
  const pointerY = useRef(0);
  const frame = useRef(0);
  const keyTimer = useRef(0);
  const draftRef = useRef<string[] | null>(null);
  const cancelTyping = useRef(false);
  const stopDrag = useRef<() => void>(() => {});
  draftRef.current = draft;

  // 저장된 새 순서가 오면 임시 순서를 버린다(끄는 중이 아닐 때).
  useEffect(() => {
    if (!dragging) setDraft(null);
  }, [key]); // 끄는 중(dragging)이 바뀔 때는 버리지 않는다
  useEffect(
    () => () => {
      stopDrag.current();
      cancelAnimationFrame(frame.current);
      window.clearTimeout(keyTimer.current);
    },
    []
  );

  const order = draft ?? ids;
  const byId = new Map(items.map((t) => [t.id, t]));
  const shown = order.map((id) => byId.get(id)).filter((t): t is T => !!t);
  const width = Math.max(2, String(shown.length).length);
  const label = (n: number) => String(n).padStart(width, "0");

  const commit = async (next: string[], remember = true) => {
    if (sameOrder(next, ids)) return setDraft(null);
    const before = ids;
    setDraft(next);
    if (await onOrder(next)) setUndo(remember ? before : null);
    else setDraft(null);
  };
  // 같은 곡들이 그대로 있을 때만 되돌리기(그사이 곡을 넣거나 뺐으면 지난 순서는 맞지 않음)
  const canUndo = !!undo && undo.length === ids.length && undo.every((id) => ids.includes(id));

  const place = (id: string) => {
    const host = list.current;
    if (!host) return;
    const rows = [...host.querySelectorAll<HTMLElement>("[data-track-id]")].filter((r) => r.dataset.trackId !== id);
    let to = rows.length;
    for (let i = 0; i < rows.length; i++) {
      const box = rows[i].getBoundingClientRect();
      if (pointerY.current < box.top + box.height / 2) {
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
  // 화면 위·아래 끝 근처에서는 창을 굴린다(긴 목록).
  const scrollLoop = (id: string) => {
    const edge = 60;
    const y = pointerY.current;
    const speed = y < edge ? -Math.ceil((edge - y) / 4) : y > window.innerHeight - edge ? Math.ceil((y - window.innerHeight + edge) / 4) : 0;
    if (speed) {
      window.scrollBy(0, speed);
      place(id);
    }
    frame.current = requestAnimationFrame(() => scrollLoop(id));
  };
  const startDrag = (e: PointerEvent<HTMLButtonElement>, id: string) => {
    if (!editable || e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.focus(); // 눌러 둔 뒤 ↑↓ 키로도 옮길 수 있게(v1.31 확인 중 발견)
    const pointer = e.pointerId;
    pointerY.current = e.clientY;
    draftRef.current = order;
    setDraft(order);
    setDragging(id);
    setSort("");
    const move = (n: globalThis.PointerEvent) => {
      if (n.pointerId !== pointer) return;
      pointerY.current = n.clientY;
      place(id);
    };
    const detach = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      cancelAnimationFrame(frame.current);
      stopDrag.current = () => {};
    };
    const end = (n: globalThis.PointerEvent) => {
      if (n.pointerId !== pointer) return;
      detach();
      setDragging("");
      void commit(draftRef.current ?? ids);
    };
    stopDrag.current = detach;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    frame.current = requestAnimationFrame(() => scrollLoop(id));
  };
  const keyMove = (e: KeyboardEvent<HTMLButtonElement>, id: string) => {
    if (!editable) return;
    const i = order.indexOf(id);
    const to = ({ ArrowUp: i - 1, ArrowDown: i + 1, Home: 0, End: order.length - 1 } as Record<string, number>)[e.key];
    if (to === undefined) return;
    e.preventDefault();
    if (to < 0 || to >= order.length || to === i) return;
    const next = moveTo(order, id, to);
    setDraft(next);
    setSort("");
    // 여러 번 눌러도 한 번만 저장한다.
    window.clearTimeout(keyTimer.current);
    keyTimer.current = window.setTimeout(() => void commit(draftRef.current ?? next), 450);
    requestAnimationFrame(() => list.current?.querySelector<HTMLButtonElement>(`[data-track-id="${CSS.escape(id)}"] [data-grip]`)?.focus());
  };
  const typed = (id: string, value: string) => {
    setTyping(null);
    if (cancelTyping.current) {
      cancelTyping.current = false;
      return;
    }
    const n = Number.parseInt(value, 10);
    if (!Number.isFinite(n)) return;
    setSort("");
    void commit(moveTo(order, id, n - 1));
  };
  const sortTitles = () => {
    const dir = sort === "asc" ? "desc" : "asc";
    setSort(dir);
    void commit(sortByTitle(shown, dir));
  };

  const tool = "inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:bg-slate-900";
  const badgeCls = "w-9 shrink-0 rounded-md bg-slate-800 py-1 text-center text-[11px] font-bold tabular-nums text-slate-300";

  return (
    <>
      {editable && shown.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <span>번호를 눌러 자리를 입력하거나, ⠿ 손잡이를 끌어 순서를 바꾸세요.</span>
          <div className="ml-auto flex gap-1.5">
            {canUndo && (
              <button
                type="button"
                className={tool}
                onClick={() => {
                  setSort("");
                  if (undo) void commit(undo, false);
                }}
              >
                <Undo2 className="h-3.5 w-3.5" /> 되돌리기
              </button>
            )}
            <button type="button" className={tool} aria-pressed={!!sort} onClick={sortTitles}>
              {sort === "desc" ? <ArrowUpAZ className="h-3.5 w-3.5" /> : <ArrowDownAZ className="h-3.5 w-3.5" />}
              {sort === "asc" ? "제목 가나다순" : sort === "desc" ? "제목 거꾸로" : "제목순 정렬"}
            </button>
          </div>
        </div>
      )}
      <ul ref={list} className={`space-y-2 ${dragging ? "select-none" : ""}`}>
        {shown.map((t, i) => {
          const badge = !editable ? null : typing?.id === t.id ? (
            <input
              type="number"
              min={1}
              max={shown.length}
              autoFocus
              aria-label={`${t.title} 자리 입력`}
              value={typing.value}
              onChange={(e) => setTyping({ id: t.id, value: e.target.value })}
              onBlur={(e) => typed(t.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") {
                  e.preventDefault();
                  cancelTyping.current = true;
                  e.currentTarget.blur();
                }
              }}
              className={`${badgeCls} border border-emerald-400 outline-hidden`}
            />
          ) : (
            <button
              type="button"
              title="눌러서 자리 번호 입력"
              aria-label={`${i + 1}번째: ${t.title} — 눌러서 자리 입력`}
              onClick={() => {
                cancelTyping.current = false;
                setTyping({ id: t.id, value: String(i + 1) });
              }}
              className={`${badgeCls} hover:bg-slate-700`}
            >
              {label(i + 1)}
            </button>
          );
          const grip = editable ? (
            <button
              type="button"
              data-grip
              title="끌어서 순서 바꾸기 (↑↓ 키도 됨)"
              aria-label={`${t.title} 순서 옮기기 (↑↓ 키)`}
              onPointerDown={(e) => startDrag(e, t.id)}
              onKeyDown={(e) => keyMove(e, t.id)}
              className="shrink-0 cursor-grab touch-none rounded-md p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-200 active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          ) : null;
          return (
            <li key={t.id} data-track-id={t.id} className={`${rowClassName} ${dragging === t.id ? "border-emerald-400/70 opacity-80 shadow-lg shadow-emerald-500/10" : ""}`}>
              {renderRow(t, i, { badge, grip })}
            </li>
          );
        })}
      </ul>
    </>
  );
}
