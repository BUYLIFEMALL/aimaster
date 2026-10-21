"use client";
import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { Bold, Italic, Loader2, Send } from "lucide-react";
import { ACTIONS, LIMITS, type ActionId } from "@/lib/we/types";

/**
 * 문장을 선택하면 그 위에 뜨는 AI 수정 툴바(Tiptap BubbleMenu: 위치·뒤집기·가장자리 보정은 Floating UI가 처리).
 * 버튼을 눌러도 에디터 선택이 풀리지 않도록 mousedown을 막고, 지시문 입력칸만 포커스를 받는다.
 */
export function BubbleToolbar({
  editor, busy, onAction, onInstruction, onStyle,
}: {
  editor: Editor;
  busy: boolean;
  onAction: (a: ActionId) => void;
  onInstruction: (text: string) => void;
  onStyle?: () => void;
}) {
  const [custom, setCustom] = useState(false);
  const [text, setText] = useState("");
  const keep = (e: React.MouseEvent) => { if ((e.target as HTMLElement).tagName !== "INPUT") e.preventDefault(); };
  const submit = () => {
    const t = text.trim();
    if (!t || busy) return;
    onInstruction(t);
    setText("");
    setCustom(false);
  };

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: "top", offset: 8 }}
      shouldShow={({ state }) => {
        const { from, to, empty } = state.selection;
        if (empty || to - from > LIMITS.selection) return false;
        return state.doc.textBetween(from, to, " ").trim().length > 0;
      }}
    >
      <div className="we-toolbar" role="toolbar" aria-label="선택한 문장 수정" onMouseDown={keep}>
        <button type="button" aria-label="굵게" title="굵게" onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={13} /></button>
        <button type="button" aria-label="기울임" title="기울임" onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={13} /></button>
        <span className="we-sep" />
        {ACTIONS.map((a) => (
          <button key={a.id} type="button" disabled={busy} onClick={() => onAction(a.id)}>{a.label}</button>
        ))}
        <button type="button" aria-pressed={custom} disabled={busy} onClick={() => setCustom((v) => !v)}>직접 지시</button>
        {onStyle && <button type="button" disabled={busy} title="선택한 부분을 페르소나·슬라이더로 문체 바꾸기" onClick={onStyle}>🎚️ 문체</button>}
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
    </BubbleMenu>
  );
}
