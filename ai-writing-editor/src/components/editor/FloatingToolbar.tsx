"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { ACTIONS, LIMITS, type ActionId } from "@/lib/we/types";
import { getCaretCoords } from "./caret";

export interface SelectionInfo { start: number; end: number; text: string }

/**
 * 선택한 문장 위(또는 아래)에 뜨는 수정 툴바. 위치는 거울 요소로 캐럿 좌표를 구해 정하고
 * 에디터 가장자리에 걸리지 않게 보정한다. 버튼을 눌러도 텍스트 영역의 선택이 풀리지 않도록 mousedown을 막는다.
 */
export function FloatingToolbar({
  selection, editor, busy, onAction, onInstruction,
}: {
  selection: SelectionInfo | null;
  editor: HTMLTextAreaElement | null;
  busy: boolean;
  onAction: (a: ActionId) => void;
  onInstruction: (text: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [custom, setCustom] = useState(false);
  const [text, setText] = useState("");

  useLayoutEffect(() => {
    if (!selection || !editor || !ref.current) return;
    const tb = ref.current;
    const startC = getCaretCoords(editor, selection.start);
    const gap = 8;
    let top = startC.top - editor.scrollTop - tb.offsetHeight - gap;
    if (top < 0) {
      const endC = getCaretCoords(editor, selection.end);
      top = endC.top - editor.scrollTop + endC.height + gap;
    }
    const maxLeft = Math.max(8, editor.clientWidth - tb.offsetWidth - 8);
    const left = Math.min(Math.max(8, startC.left), maxLeft);
    setPos({ top: Math.max(0, top), left });
  }, [selection, editor, custom, busy]);

  if (!selection || !selection.text.trim()) return null;
  const submit = () => {
    const t = text.trim();
    if (!t || busy) return;
    onInstruction(t);
    setText("");
    setCustom(false);
  };

  return (
    <div
      ref={ref}
      className="we-toolbar"
      role="toolbar"
      aria-label="선택한 문장 수정"
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={(e) => { if ((e.target as HTMLElement).tagName !== "INPUT") e.preventDefault(); }}
    >
      {ACTIONS.map((a) => (
        <button key={a.id} type="button" disabled={busy} onClick={() => onAction(a.id)}>{a.label}</button>
      ))}
      <button type="button" aria-pressed={custom} disabled={busy} onClick={() => setCustom((v) => !v)}>직접 지시</button>
      {busy && <Loader2 size={14} className="we-spin" aria-label="수정 중" />}
      {custom && (
        <form className="we-toolbar-custom" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <input
            autoFocus
            value={text}
            maxLength={LIMITS.instruction}
            placeholder="예: 초등학생도 이해하게 쉽게"
            onChange={(e) => setText(e.target.value)}
            aria-label="수정 지시문"
          />
          <button type="submit" className="primary" disabled={busy || !text.trim()} aria-label="지시 실행"><Send size={13} /></button>
        </form>
      )}
    </div>
  );
}
