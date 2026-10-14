"use client";
import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  Bold, Code, Eraser, Heading1, Heading2, Heading3, Italic, Link2, List, ListOrdered, Minus, Pilcrow, Quote, Redo2, Strikethrough, Undo2,
} from "lucide-react";

function safeUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  const withProto = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withProto);
    return u.protocol === "http:" || u.protocol === "https:" || u.protocol === "mailto:" ? u.toString() : null;
  } catch { return null; }
}

/** 서식 툴바: 제목·굵게·기울임·목록·인용·코드·링크·구분선·서식 지우기·실행 취소/다시 실행. 현재 위치의 서식은 눌린 상태로 표시한다. */
export function RichToolbar({ editor }: { editor: Editor }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");

  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h1: e.isActive("heading", { level: 1 }),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      p: e.isActive("paragraph"),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      link: e.isActive("link"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const run = (fn: (c: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>) => fn(editor.chain().focus()).run();
  const keep = (e: React.MouseEvent) => e.preventDefault(); // 버튼을 눌러도 에디터 선택이 풀리지 않게

  function toggleLink() {
    if (s.link) { run((c) => c.unsetLink()); return; }
    setUrl(""); setUrlError(""); setLinkOpen((v) => !v);
  }
  function applyLink(e: React.FormEvent) {
    e.preventDefault();
    const href = safeUrl(url);
    if (!href) { setUrlError("http(s) 주소를 입력해 주세요."); return; }
    const { empty } = editor.state.selection;
    if (empty) editor.chain().focus().insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] }).run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setLinkOpen(false);
  }

  const B = ({ label, active, onClick, disabled, children }: { label: string; active?: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode }) => (
    <button type="button" aria-label={label} title={label} aria-pressed={!!active} disabled={disabled} onMouseDown={keep} onClick={onClick}>{children}</button>
  );

  return (
    <div className="we-rich" role="toolbar" aria-label="서식 도구">
      <div className="we-rich-row">
        <B label="실행 취소" disabled={!s.canUndo} onClick={() => run((c) => c.undo())}><Undo2 size={14} /></B>
        <B label="다시 실행" disabled={!s.canRedo} onClick={() => run((c) => c.redo())}><Redo2 size={14} /></B>
        <span className="we-sep" />
        <B label="본문" active={s.p} onClick={() => run((c) => c.setParagraph())}><Pilcrow size={14} /></B>
        <B label="제목 1" active={s.h1} onClick={() => run((c) => c.toggleHeading({ level: 1 }))}><Heading1 size={14} /></B>
        <B label="제목 2" active={s.h2} onClick={() => run((c) => c.toggleHeading({ level: 2 }))}><Heading2 size={14} /></B>
        <B label="제목 3" active={s.h3} onClick={() => run((c) => c.toggleHeading({ level: 3 }))}><Heading3 size={14} /></B>
        <span className="we-sep" />
        <B label="굵게" active={s.bold} onClick={() => run((c) => c.toggleBold())}><Bold size={14} /></B>
        <B label="기울임" active={s.italic} onClick={() => run((c) => c.toggleItalic())}><Italic size={14} /></B>
        <B label="취소선" active={s.strike} onClick={() => run((c) => c.toggleStrike())}><Strikethrough size={14} /></B>
        <B label="코드" active={s.code} onClick={() => run((c) => c.toggleCode())}><Code size={14} /></B>
        <span className="we-sep" />
        <B label="글머리 기호 목록" active={s.bullet} onClick={() => run((c) => c.toggleBulletList())}><List size={14} /></B>
        <B label="번호 목록" active={s.ordered} onClick={() => run((c) => c.toggleOrderedList())}><ListOrdered size={14} /></B>
        <B label="인용" active={s.quote} onClick={() => run((c) => c.toggleBlockquote())}><Quote size={14} /></B>
        <B label="링크" active={s.link || linkOpen} onClick={toggleLink}><Link2 size={14} /></B>
        <B label="구분선" onClick={() => run((c) => c.setHorizontalRule())}><Minus size={14} /></B>
        <B label="서식 지우기" onClick={() => run((c) => c.unsetAllMarks().clearNodes())}><Eraser size={14} /></B>
      </div>
      {linkOpen && (
        <form className="we-link-row" onSubmit={applyLink}>
          <input autoFocus aria-label="링크 주소" value={url} placeholder="https://example.com" onChange={(e) => { setUrl(e.target.value); setUrlError(""); }} />
          <button type="submit" className="primary">적용</button>
          <button type="button" onClick={() => setLinkOpen(false)}>취소</button>
          {urlError && <span className="error" role="alert">{urlError}</span>}
        </form>
      )}
    </div>
  );
}
