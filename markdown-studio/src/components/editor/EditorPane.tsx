"use client";
import { showToast } from "@/components/ui/Toast";
import { useRef, useState } from "react";
import {
  AlignCenter, AlignLeft, AlignRight, Bold, ChevronsRight, ChevronsLeft, Code, Columns3, Copy, Heading1, Heading2, Heading3,
  Image as ImageIcon, Italic, Link2, List, ListChecks, ListOrdered, Minus, Quote, Redo2, Rows3, Search, Smile, Strikethrough, Table, Undo2,
} from "lucide-react";
import * as C from "@/lib/editor/commands";
import { MarkdownEditor, type EditorHandle } from "./MarkdownEditor";

type Panel = "" | "link" | "image" | "code" | "table" | "symbols";
const MOD = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl+";

interface BtnProps { label: string; shortcut?: string; onClick: () => void; children: React.ReactNode; pressed?: boolean }
function Btn({ label, shortcut, onClick, children, pressed }: BtnProps) {
  const title = shortcut ? `${label} (${shortcut})` : label;
  return <button type="button" className="tool-button" title={title} aria-label={label} aria-pressed={pressed} onMouseDown={e => e.preventDefault()} onClick={onClick}>{children}</button>;
}

export function EditorPane({ docKey, value, onChange, onSave }: { docKey: string; value: string; onChange: (v: string) => void; onSave: () => void }) {
  const ed = useRef<EditorHandle>(null);
  const [panel, setPanel] = useState<Panel>("");
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  const [lang, setLang] = useState("");
  const [cols, setCols] = useState(3);
  const [rows, setRows] = useState(2);

  const run = (fn: (t: string, s: C.Sel) => C.Result | null, fail = "") => {
    setMessage("");
    const ok = ed.current?.run(fn);
    if (!ok && fail) setMessage(fail);
    return ok;
  };
  const inTable = "표 안에 커서를 두고 눌러 주세요.";
  const togglePanel = (p: Panel) => { setPanel(panel === p ? "" : p); setMessage(""); setUrl(""); };
  function submitUrl(kind: "link" | "image") {
    const ok = ed.current?.run((t, s) => (kind === "link" ? C.insertLink(t, s, url) : C.insertImage(t, s, url)));
    if (!ok) { setMessage("주소를 확인해 주세요. http(s)://, mailto:, 상대 경로만 사용할 수 있습니다."); return; }
    setPanel(""); setUrl(""); setMessage("");
  }
  async function copyText() {
    const text = ed.current?.text() ?? "";
    try { await navigator.clipboard.writeText(text); showToast("마크다운 원문을 클립보드에 복사했습니다."); }
    catch { showToast("브라우저가 복사를 허용하지 않았습니다. 원문을 직접 선택해 복사해 주세요.", "error"); }
  }

  return <div className="editor-pane">
    <div className="editor-toolbar" role="toolbar" aria-label="서식 도구 모음">
      <div className="tool-group">
        <Btn label="실행 취소" shortcut={`${MOD}Z`} onClick={() => ed.current?.undo()}><Undo2 size={15}/></Btn>
        <Btn label="다시 실행" shortcut={`${MOD}Shift+Z`} onClick={() => ed.current?.redo()}><Redo2 size={15}/></Btn>
        <Btn label="찾기·바꾸기" shortcut={`${MOD}F`} onClick={() => ed.current?.find()}><Search size={15}/></Btn>
      </div>
      <div className="tool-group">
        <Btn label="제목 1" onClick={() => run((t, s) => C.toggleHeading(t, s, 1))}><Heading1 size={15}/></Btn>
        <Btn label="제목 2" onClick={() => run((t, s) => C.toggleHeading(t, s, 2))}><Heading2 size={15}/></Btn>
        <Btn label="제목 3" onClick={() => run((t, s) => C.toggleHeading(t, s, 3))}><Heading3 size={15}/></Btn>
      </div>
      <div className="tool-group">
        <Btn label="굵게" shortcut={`${MOD}B`} onClick={() => run((t, s) => C.toggleWrap(t, s, "**"))}><Bold size={15}/></Btn>
        <Btn label="기울임" shortcut={`${MOD}I`} onClick={() => run((t, s) => C.toggleWrap(t, s, "*"))}><Italic size={15}/></Btn>
        <Btn label="취소선" onClick={() => run((t, s) => C.toggleWrap(t, s, "~~"))}><Strikethrough size={15}/></Btn>
      </div>
      <div className="tool-group">
        <Btn label="글머리 기호 목록" onClick={() => run((t, s) => C.setList(t, s, "bullet"))}><List size={15}/></Btn>
        <Btn label="숫자 목록" onClick={() => run((t, s) => C.setList(t, s, "number"))}><ListOrdered size={15}/></Btn>
        <Btn label="알파벳 목록" onClick={() => run((t, s) => C.setList(t, s, "alpha"))}><span className="tool-text">a.</span></Btn>
        <Btn label="체크리스트" onClick={() => run((t, s) => C.setList(t, s, "task"))}><ListChecks size={15}/></Btn>
      </div>
      <div className="tool-group">
        <Btn label="들여쓰기" shortcut="Tab" onClick={() => run(C.indentLines)}><ChevronsRight size={15}/></Btn>
        <Btn label="내어쓰기" shortcut="Shift+Tab" onClick={() => run(C.outdentLines)}><ChevronsLeft size={15}/></Btn>
        <Btn label="인용" onClick={() => run(C.toggleQuote)}><Quote size={15}/></Btn>
      </div>
      <div className="tool-group">
        <Btn label="코드 블록" onClick={() => togglePanel("code")} pressed={panel === "code"}><Code size={15}/></Btn>
        <Btn label="링크" shortcut={`${MOD}K`} onClick={() => togglePanel("link")} pressed={panel === "link"}><Link2 size={15}/></Btn>
        <Btn label="이미지" onClick={() => togglePanel("image")} pressed={panel === "image"}><ImageIcon size={15}/></Btn>
      </div>
      <div className="tool-group">
        <Btn label="표 삽입" onClick={() => togglePanel("table")} pressed={panel === "table"}><Table size={15}/></Btn>
        <Btn label="표 행 추가" onClick={() => run(C.tableAddRow, inTable)}><Rows3 size={15}/><span className="tool-badge">+</span></Btn>
        <Btn label="표 열 추가" onClick={() => run(C.tableAddColumn, inTable)}><Columns3 size={15}/><span className="tool-badge">+</span></Btn>
        <Btn label="표 행 삭제" onClick={() => run(C.tableDeleteRow, "삭제할 본문 행에 커서를 두세요. 머리글은 삭제할 수 없습니다.")}><Rows3 size={15}/><span className="tool-badge">−</span></Btn>
        <Btn label="표 열 삭제" onClick={() => run(C.tableDeleteColumn, "삭제할 열에 커서를 두세요. 마지막 열은 삭제할 수 없습니다.")}><Columns3 size={15}/><span className="tool-badge">−</span></Btn>
        <Btn label="열 왼쪽 정렬" onClick={() => run((t, s) => C.tableSetAlign(t, s, "left"), inTable)}><AlignLeft size={15}/></Btn>
        <Btn label="열 가운데 정렬" onClick={() => run((t, s) => C.tableSetAlign(t, s, "center"), inTable)}><AlignCenter size={15}/></Btn>
        <Btn label="열 오른쪽 정렬" onClick={() => run((t, s) => C.tableSetAlign(t, s, "right"), inTable)}><AlignRight size={15}/></Btn>
      </div>
      <div className="tool-group">
        <Btn label="구분선" onClick={() => run(C.insertRule)}><Minus size={15}/></Btn>
        <Btn label="특수 기호" onClick={() => togglePanel("symbols")} pressed={panel === "symbols"}><Smile size={15}/></Btn>
        <Btn label="원문 복사" onClick={copyText}><Copy size={15}/></Btn>
      </div>
    </div>
    {panel === "link" || panel === "image" ? <form className="tool-panel" onSubmit={e => { e.preventDefault(); submitUrl(panel); }}>
      <label>{panel === "link" ? "링크 주소" : "이미지 주소"}<input autoFocus value={url} onChange={e => setUrl(e.target.value)} placeholder="https://" inputMode="url" aria-label={panel === "link" ? "링크 주소" : "이미지 주소"}/></label>
      <button className="primary" type="submit">넣기</button><button type="button" onClick={() => setPanel("")}>닫기</button>
    </form> : null}
    {panel === "code" ? <form className="tool-panel" onSubmit={e => { e.preventDefault(); run((t, s) => C.insertCodeBlock(t, s, lang)); setPanel(""); }}>
      <label>코드 언어<select value={lang} onChange={e => setLang(e.target.value)} aria-label="코드 언어">{C.CODE_LANGUAGES.map(l => <option key={l} value={l}>{l || "지정 안 함"}</option>)}</select></label>
      <button className="primary" type="submit">코드 블록 넣기</button><button type="button" onClick={() => setPanel("")}>닫기</button>
    </form> : null}
    {panel === "table" ? <form className="tool-panel" onSubmit={e => { e.preventDefault(); run((t, s) => C.createTable(t, s, cols, rows)); setPanel(""); }}>
      <label>열 수<input type="number" min={1} max={12} value={cols} onChange={e => setCols(Number(e.target.value) || 1)} aria-label="표 열 수"/></label>
      <label>본문 행 수<input type="number" min={1} max={50} value={rows} onChange={e => setRows(Number(e.target.value) || 1)} aria-label="표 행 수"/></label>
      <button className="primary" type="submit">표 넣기</button><button type="button" onClick={() => setPanel("")}>닫기</button>
    </form> : null}
    {panel === "symbols" ? <div className="tool-panel symbols" role="group" aria-label="특수 기호">
      {C.SYMBOLS.map(s => <button type="button" key={s} aria-label={`기호 ${s}`} onMouseDown={e => e.preventDefault()} onClick={() => run((t, sel) => C.insertText(t, sel, s))}>{s}</button>)}
      <button type="button" onClick={() => setPanel("")}>닫기</button>
    </div> : null}
    {message ? <p className="tool-message" role="status">{message}</p> : null}
    <MarkdownEditor ref={ed} docKey={docKey} value={value} onChange={onChange} onSave={onSave} onLink={() => togglePanel("link")}/>
    <p className="muted tool-hint">Tab은 들여쓰기입니다. 키보드로 편집기를 벗어나려면 Esc를 누른 뒤 Tab을 누르세요.</p>
  </div>;
}
