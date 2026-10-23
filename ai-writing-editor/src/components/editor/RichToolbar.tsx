"use client";
import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  AlignCenter, AlignLeft, AlignRight, Bold, Code, Eraser, Heading1, Heading2, Heading3, Highlighter, ImagePlus, Italic, Link2, List,
  ListOrdered, Loader2, Minus, Palette, Pilcrow, Quote, Redo2, Strikethrough, Table2, Underline, Undo2,
} from "lucide-react";

export const TEXT_COLORS = ["#111827", "#dc2626", "#ea580c", "#ca8a04", "#16a34a", "#2563eb", "#7c3aed", "#db2777", "#6b7280"];
export const HIGHLIGHT_COLORS = ["#fef08a", "#bbf7d0", "#bfdbfe", "#fbcfe8", "#fed7aa", "#e9d5ff"];

function safeUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  const withProto = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withProto);
    return u.protocol === "http:" || u.protocol === "https:" || u.protocol === "mailto:" ? u.toString() : null;
  } catch { return null; }
}

type Pop = "" | "link" | "color" | "highlight";

/** 서식 툴바: 제목·글자 서식·색·정렬·목록·인용·표·이미지·링크·구분선. 현재 위치의 서식은 눌린 상태로 표시한다. */
export function RichToolbar({ editor, onPickImage, uploading }: { editor: Editor; onPickImage: () => void; uploading: boolean }) {
  const [pop, setPop] = useState<Pop>("");
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
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      highlight: e.isActive("highlight"),
      color: (e.getAttributes("textStyle").color as string | undefined) ?? "",
      left: e.isActive({ textAlign: "left" }),
      center: e.isActive({ textAlign: "center" }),
      right: e.isActive({ textAlign: "right" }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      link: e.isActive("link"),
      table: e.isActive("table"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const run = (fn: (c: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>) => fn(editor.chain().focus()).run();
  const keep = (e: React.MouseEvent) => { if ((e.target as HTMLElement).tagName !== "INPUT") e.preventDefault(); }; // 버튼을 눌러도 에디터 선택이 풀리지 않게

  function toggleLink() {
    if (s.link) { run((c) => c.unsetLink()); return; }
    setUrl(""); setUrlError(""); setPop((v) => (v === "link" ? "" : "link"));
  }
  function applyLink(e: React.FormEvent) {
    e.preventDefault();
    const href = safeUrl(url);
    if (!href) { setUrlError("http(s) 주소를 입력해 주세요."); return; }
    const { empty } = editor.state.selection;
    if (empty) editor.chain().focus().insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] }).run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setPop("");
  }

  const B = ({ label, active, onClick, disabled, children }: { label: string; active?: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode }) => (
    <button type="button" aria-label={label} title={label} aria-pressed={!!active} disabled={disabled} onMouseDown={keep} onClick={onClick}>{children}</button>
  );
  const T = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button type="button" onMouseDown={keep} onClick={onClick}>{label}</button>
  );

  return (
    <div className="we-rich" role="toolbar" aria-label="서식 도구" onMouseDown={keep}>
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
        <B label="밑줄" active={s.underline} onClick={() => run((c) => c.toggleUnderline())}><Underline size={14} /></B>
        <B label="취소선" active={s.strike} onClick={() => run((c) => c.toggleStrike())}><Strikethrough size={14} /></B>
        <B label="코드" active={s.code} onClick={() => run((c) => c.toggleCode())}><Code size={14} /></B>
        <span className="we-sep" />
        <B label="글자 색" active={!!s.color || pop === "color"} onClick={() => setPop((v) => (v === "color" ? "" : "color"))}>
          <Palette size={14} style={s.color ? { color: s.color } : undefined} />
        </B>
        <B label="형광펜" active={s.highlight || pop === "highlight"} onClick={() => setPop((v) => (v === "highlight" ? "" : "highlight"))}><Highlighter size={14} /></B>
        <span className="we-sep" />
        <B label="왼쪽 정렬" active={s.left} onClick={() => run((c) => c.setTextAlign("left"))}><AlignLeft size={14} /></B>
        <B label="가운데 정렬" active={s.center} onClick={() => run((c) => c.setTextAlign("center"))}><AlignCenter size={14} /></B>
        <B label="오른쪽 정렬" active={s.right} onClick={() => run((c) => c.setTextAlign("right"))}><AlignRight size={14} /></B>
        <span className="we-sep" />
        <B label="글머리 기호 목록" active={s.bullet} onClick={() => run((c) => c.toggleBulletList())}><List size={14} /></B>
        <B label="번호 목록" active={s.ordered} onClick={() => run((c) => c.toggleOrderedList())}><ListOrdered size={14} /></B>
        <B label="인용" active={s.quote} onClick={() => run((c) => c.toggleBlockquote())}><Quote size={14} /></B>
        <span className="we-sep" />
        <B label="표 넣기" active={s.table} onClick={() => run((c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true }))}><Table2 size={14} /></B>
        <B label="이미지 넣기" disabled={uploading} onClick={onPickImage}>{uploading ? <Loader2 size={14} className="we-spin" /> : <ImagePlus size={14} />}</B>
        <B label="링크" active={s.link || pop === "link"} onClick={toggleLink}><Link2 size={14} /></B>
        <B label="구분선" onClick={() => run((c) => c.setHorizontalRule())}><Minus size={14} /></B>
        <B label="서식 지우기" onClick={() => run((c) => c.unsetAllMarks().clearNodes())}><Eraser size={14} /></B>
      </div>

      {pop === "color" && (
        <div className="we-palette" role="group" aria-label="글자 색 선택">
          {TEXT_COLORS.map((c) => (
            <button key={c} type="button" className="we-swatch" aria-label={`글자 색 ${c}`} style={{ background: c }} onMouseDown={keep} onClick={() => { run((ch) => ch.setColor(c)); setPop(""); }} />
          ))}
          <T label="기본색" onClick={() => { run((c) => c.unsetColor()); setPop(""); }} />
        </div>
      )}
      {pop === "highlight" && (
        <div className="we-palette" role="group" aria-label="형광펜 색 선택">
          {HIGHLIGHT_COLORS.map((c) => (
            <button key={c} type="button" className="we-swatch" aria-label={`형광펜 ${c}`} style={{ background: c }} onMouseDown={keep} onClick={() => { run((ch) => ch.setHighlight({ color: c })); setPop(""); }} />
          ))}
          <T label="형광펜 제거" onClick={() => { run((c) => c.unsetHighlight()); setPop(""); }} />
        </div>
      )}
      {pop === "link" && (
        <form className="we-link-row" onSubmit={applyLink}>
          <input autoFocus aria-label="링크 주소" value={url} placeholder="https://example.com" onChange={(e) => { setUrl(e.target.value); setUrlError(""); }} />
          <button type="submit" className="primary">적용</button>
          <button type="button" onClick={() => setPop("")}>취소</button>
          {urlError && <span className="error" role="alert">{urlError}</span>}
        </form>
      )}
      {s.table && (
        <div className="we-rich-row we-table-row" role="group" aria-label="표 편집">
          <span className="muted">표</span>
          <T label="위에 행 추가" onClick={() => run((c) => c.addRowBefore())} />
          <T label="아래에 행 추가" onClick={() => run((c) => c.addRowAfter())} />
          <T label="왼쪽에 열 추가" onClick={() => run((c) => c.addColumnBefore())} />
          <T label="오른쪽에 열 추가" onClick={() => run((c) => c.addColumnAfter())} />
          <T label="행 삭제" onClick={() => run((c) => c.deleteRow())} />
          <T label="열 삭제" onClick={() => run((c) => c.deleteColumn())} />
          <T label="머리글 행 전환" onClick={() => run((c) => c.toggleHeaderRow())} />
          <T label="표 삭제" onClick={() => run((c) => c.deleteTable())} />
        </div>
      )}
    </div>
  );
}
