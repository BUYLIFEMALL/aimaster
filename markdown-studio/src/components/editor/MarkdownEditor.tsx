"use client";
// CodeMirror 6 기반 마크다운 편집기. 서식 계산은 lib/editor/commands(순수 함수)가 하고, 여기서는 편집기에 반영만 한다.
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView, drawSelection, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, redo, undo } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { defaultHighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { openSearchPanel, search, searchKeymap } from "@codemirror/search";
import * as C from "@/lib/editor/commands";

export interface EditorHandle {
  run: (fn: (text: string, sel: C.Sel) => C.Result | null) => boolean;
  undo: () => void; redo: () => void; find: () => void; focus: () => void;
  selectedText: () => string; text: () => string;
}
interface Props { docKey: string; value: string; onChange: (value: string) => void; onSave: () => void; onLink: () => void }

const PHRASES: Record<string, string> = {
  Find: "찾기", Replace: "바꿀 내용", next: "다음", previous: "이전", all: "모두 선택", "match case": "대소문자 구분",
  regexp: "정규식", "by word": "단어 단위", replace: "바꾸기", "replace all": "모두 바꾸기", close: "닫기",
  "current match": "현재 일치", "on line": "줄", "replaced $ matches": "$개를 바꿨습니다", "replaced match on line $": "$번 줄을 바꿨습니다",
  "Go to line": "줄 이동", go: "이동",
};

function applyResult(view: EditorView, r: C.Result) {
  const old = view.state.doc.toString();
  const max = Math.min(old.length, r.text.length);
  let p = 0;
  while (p < max && old[p] === r.text[p]) p++;
  if (p > 0 && (old.charCodeAt(p - 1) & 0xfc00) === 0xd800) p--; // 서로게이트 쌍을 가르지 않음
  let so = old.length, sn = r.text.length;
  while (so > p && sn > p && old[so - 1] === r.text[sn - 1]) { so--; sn--; }
  if (so < old.length && (old.charCodeAt(so) & 0xfc00) === 0xdc00) { so++; sn++; }
  const len = r.text.length;
  view.dispatch({
    changes: { from: p, to: so, insert: r.text.slice(p, sn) },
    selection: EditorSelection.range(Math.min(r.sel.from, len), Math.min(r.sel.to, len)),
    scrollIntoView: true, userEvent: "input",
  });
  view.focus();
}
const normalize = (v: string) => v.replace(/\r\n?/g, "\n");

export const MarkdownEditor = forwardRef<EditorHandle, Props>(function MarkdownEditor({ docKey, value, onChange, onSave, onLink }, ref) {
  const host = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const cb = useRef({ onChange, onSave, onLink });
  const lastEmitted = useRef<string | null>(null);
  const keyRef = useRef(docKey);
  const tabEscape = useRef(false);
  useEffect(() => { cb.current = { onChange, onSave, onLink }; });

  const makeState = (doc: string) => {
    const act = (fn: (t: string, s: C.Sel) => C.Result | null) => (view: EditorView) => {
      const s = view.state.selection.main;
      const r = fn(view.state.doc.toString(), { from: s.from, to: s.to });
      if (r) applyResult(view, r);
      return true;
    };
    return EditorState.create({
      doc,
      extensions: [
        history(), drawSelection(), EditorView.lineWrapping,
        markdown({ addKeymap: false }), syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        search({ top: true }), EditorState.phrases.of(PHRASES),
        EditorView.contentAttributes.of({ "aria-label": "마크다운 원문", spellcheck: "false", autocorrect: "off", autocapitalize: "off" }),
        keymap.of([
          { key: "Enter", run: view => {
            const s = view.state.selection.main;
            if (!s.empty) return false;
            const r = C.listEnter(view.state.doc.toString(), s.head);
            if (!r) return false;
            applyResult(view, r); return true;
          } },
          { key: "Mod-b", run: act((t, s) => C.toggleWrap(t, s, "**")), preventDefault: true },
          { key: "Mod-i", run: act((t, s) => C.toggleWrap(t, s, "*")), preventDefault: true },
          { key: "Mod-k", run: () => { cb.current.onLink(); return true; }, preventDefault: true },
          { key: "Mod-s", run: () => { cb.current.onSave(); return true; }, preventDefault: true },
          { key: "Escape", run: () => { tabEscape.current = true; return false; } }, // Esc 다음 Tab으로 편집기를 빠져나감
          { key: "Tab", run: view => { if (tabEscape.current) { tabEscape.current = false; return false; } return act(C.indentLines)(view); } },
          { key: "Shift-Tab", run: view => { if (tabEscape.current) { tabEscape.current = false; return false; } return act(C.outdentLines)(view); } },
          ...searchKeymap, ...historyKeymap, ...defaultKeymap,
        ]),
        EditorView.updateListener.of(u => {
          if (u.docChanged) {
            tabEscape.current = false;
            const v = u.state.doc.toString();
            lastEmitted.current = v;
            cb.current.onChange(v);
          }
        }),
      ],
    });
  };

  useEffect(() => {
    const view = new EditorView({ state: makeState(normalize(value)), parent: host.current! });
    viewRef.current = view;
    return () => { view.destroy(); viewRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 문서가 바뀌거나 저장소가 본문을 바꾼 경우(이력 복원·충돌 불러오기)에만 편집기를 새로 만든다. 입력 중에는 건드리지 않는다.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const norm = normalize(value);
    const keyChanged = keyRef.current !== docKey;
    keyRef.current = docKey;
    if (!keyChanged && (norm === view.state.doc.toString() || value === lastEmitted.current)) return;
    lastEmitted.current = null;
    view.setState(makeState(norm));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, docKey]);

  useImperativeHandle(ref, () => ({
    run: fn => {
      const view = viewRef.current;
      if (!view) return false;
      const s = view.state.selection.main;
      const r = fn(view.state.doc.toString(), { from: s.from, to: s.to });
      if (!r) return false;
      applyResult(view, r);
      return true;
    },
    undo: () => { const v = viewRef.current; if (v) { undo(v); v.focus(); } },
    redo: () => { const v = viewRef.current; if (v) { redo(v); v.focus(); } },
    find: () => { const v = viewRef.current; if (v) { v.focus(); openSearchPanel(v); } },
    focus: () => viewRef.current?.focus(),
    selectedText: () => { const v = viewRef.current; if (!v) return ""; const s = v.state.selection.main; return v.state.sliceDoc(s.from, s.to); },
    text: () => viewRef.current?.state.doc.toString() ?? "",
  }), []);

  return <div className="cm-host" ref={host}/>;
});
