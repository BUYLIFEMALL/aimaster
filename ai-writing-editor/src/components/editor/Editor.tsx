"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor as TiptapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import Placeholder from "@tiptap/extension-placeholder";
import { ArrowLeft, Check, ClipboardCopy, Download, FileText, Loader2, Wand2 } from "lucide-react";
import { FORMATS, LIMITS, type ActionId, type FormatId, type Source, type Suggestion } from "@/lib/we/types";
import { deriveTitle } from "@/lib/we/util";
import { findText, rangeText } from "@/lib/we/pmText";
import { BubbleToolbar } from "./BubbleToolbar";
import { RichToolbar } from "./RichToolbar";
import { SuggestionPanel } from "./SuggestionPanel";

type SaveState = "saved" | "dirty" | "saving" | "error";
const BLOCK = "\n\n";

function download(name: string, text: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** AI가 돌려준 마크다운을 ProseMirror 노드로 바꾼다. 한 문단이면 인라인 내용만 돌려줘 선택 범위 안에서 문단이 쪼개지지 않게 한다. */
function toNodes(editor: TiptapEditor, md: string) {
  const parsed = editor.markdown?.parse(md);
  const blocks = parsed?.content ?? [];
  if (blocks.length === 1 && blocks[0].type === "paragraph") return blocks[0].content ?? [];
  return blocks.length ? blocks : [{ type: "text", text: md }];
}

export function Editor({
  id, initialTitle, initialContent, format, sources, autoAnalyze,
}: {
  id: string;
  initialTitle: string;
  initialContent: string;
  format: FormatId;
  sources: Source[];
  autoAnalyze: boolean;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent); // 저장용 마크다운
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; needKey?: boolean } | null>(null);
  const [save, setSave] = useState<SaveState>("saved");
  const [panelOpen, setPanelOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState<"" | "rich" | "md">("");
  const [notice, setNotice] = useState("");
  const first = useRef(true);
  const ranAuto = useRef(false);
  const formatLabel = FORMATS.find((f) => f.id === format)?.label ?? "자유 형식";

  const editor = useEditor({
    immediatelyRender: false, // Next.js SSR과 하이드레이션 불일치를 막는다
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        underline: false, // 마크다운으로 저장되지 않는 서식은 쓰지 않는다
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noreferrer noopener", target: "_blank" } },
      }),
      Markdown.configure({ markedOptions: { gfm: true, breaks: true } }),
      Placeholder.configure({ placeholder: "여기에 글을 쓰거나 붙여 넣으세요. 문장을 드래그하면 AI 수정 툴바가 나타납니다." }),
    ],
    content: initialContent,
    contentType: "markdown",
    editorProps: {
      attributes: { class: "we-prose", "aria-label": "본문 편집기", "aria-multiline": "true", spellcheck: "false" },
    },
    onUpdate: ({ editor: e }) => setContent(e.getMarkdown()),
  });

  const stats = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      chars: e ? e.getText({ blockSeparator: BLOCK }).replace(/\s/g, "").length : 0,
      empty: e ? e.isEmpty : true,
    }),
  });

  // ---- 자동 저장(1.5초 디바운스) ----
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setSave("dirty");
    const t = setTimeout(async () => {
      setSave("saving");
      try {
        const res = await fetch("/api/documents", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, title: title.trim() || deriveTitle(content), content, format, sources }),
        });
        setSave(res.ok ? "saved" : "error");
      } catch { setSave("error"); }
    }, 1500);
    return () => clearTimeout(t);
  }, [id, title, content, format, sources]);

  function showError(message: string, needKey?: boolean) { setError({ message, needKey }); }

  // ---- 선택한 부분 수정 ----
  async function rewrite(payload: { action?: ActionId; instruction?: string }) {
    if (!editor || busy) return;
    const { from, to } = editor.state.selection;
    const doc = editor.state.doc;
    const text = rangeText(doc, from, to);
    if (!text.trim()) return;
    const size = doc.content.size;
    setBusy(true); setError(null); setNotice("");
    try {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selection: text, ...payload,
          before: rangeText(doc, Math.max(0, from - 400), from),
          after: rangeText(doc, to, Math.min(size, to + 400)),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.text !== "string") { showError(data.error ?? "수정하지 못했습니다.", !!data.needKey); return; }
      // 응답을 기다리는 동안 본문이 바뀌었을 수 있으므로 위치를 다시 확인한다
      const cur = editor.state.doc;
      const target = rangeText(cur, from, Math.min(to, cur.content.size)) === text ? { from, to } : findText(cur, text, from);
      if (!target) { showError("선택한 문장이 그 사이 바뀌어 적용하지 못했습니다. 다시 선택해 주세요."); return; }
      editor.chain().focus().insertContentAt(target, toNodes(editor, data.text)).run();
    } catch {
      showError("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally { setBusy(false); }
  }

  // ---- 전체 글 분석 ----
  const analyze = useCallback(async () => {
    if (!editor) return;
    const body = editor.getText({ blockSeparator: BLOCK });
    if (body.trim().length < 20) { setPanelOpen(true); setSuggestions([]); setNote("분석하려면 글이 20자 이상이어야 합니다."); return; }
    setPanelOpen(true); setAnalyzing(true); setError(null); setNote("");
    try {
      const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: body }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { showError(data.error ?? "분석하지 못했습니다.", !!data.needKey); setSuggestions([]); return; }
      setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
      setNote(data.truncated ? `긴 글이라 앞부분 ${LIMITS.analyze.toLocaleString("ko-KR")}자만 분석했습니다.` : data.note ?? "");
    } catch {
      showError("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally { setAnalyzing(false); }
  }, [editor]);

  useEffect(() => {
    if (autoAnalyze && editor && !ranAuto.current) {
      ranAuto.current = true;
      void analyze();
      window.history.replaceState(null, "", `/editor/${id}`);
    }
  }, [autoAnalyze, editor, analyze, id]);

  /** 제안 한 개를 본문의 현재 위치에서 찾아 바꾼다(서식은 그 자리의 서식을 이어받는다). 못 찾으면 false. */
  const applySuggestion = useCallback((s: Suggestion): boolean => {
    if (!editor) return false;
    const r = findText(editor.state.doc, s.originalText);
    if (!r) return false;
    editor.view.dispatch(editor.state.tr.insertText(s.suggestedText, r.from, r.to));
    return true;
  }, [editor]);

  function applyOne(s: Suggestion) {
    const ok = applySuggestion(s);
    setSuggestions((cur) => cur.filter((x) => x.originalText !== s.originalText));
    setNotice(ok ? "" : "본문에서 해당 문장을 찾지 못해 이 제안을 목록에서 뺐습니다(글이 바뀌었습니다).");
  }

  function applyMany(list: Suggestion[]) {
    let applied = 0;
    for (const s of list) if (applySuggestion(s)) applied += 1;
    const done = new Set(list.map((s) => s.originalText));
    setSuggestions((cur) => cur.filter((s) => !done.has(s.originalText)));
    const skipped = list.length - applied;
    setNotice(`${applied}개를 적용했습니다.${skipped ? ` 본문에서 찾지 못한 ${skipped}개는 건너뛰었습니다.` : ""}`);
  }

  function locate(s: Suggestion) {
    if (!editor) return;
    const r = findText(editor.state.doc, s.originalText);
    if (!r) { setNotice("본문에서 해당 문장을 찾지 못했습니다."); return; }
    editor.chain().focus().setTextSelection(r).scrollIntoView().run();
  }

  // ---- 복사·내보내기 ----
  async function copyRich() {
    if (!editor) return;
    const html = editor.getHTML();
    const text = editor.getText({ blockSeparator: BLOCK });
    try {
      await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([text], { type: "text/plain" }) })]);
    } catch {
      try { await navigator.clipboard.writeText(text); } catch { /* 복사 권한이 없으면 아래 안내 */ }
    }
    setCopied("rich");
    setTimeout(() => setCopied(""), 1800);
  }
  async function copyMarkdown() {
    if (!editor) return;
    try { await navigator.clipboard.writeText(editor.getMarkdown()); } catch { /* 권한 없음 */ }
    setCopied("md");
    setTimeout(() => setCopied(""), 1800);
  }

  const saveLabel = { saved: "✓ 저장됨", dirty: "● 저장 대기", saving: "저장 중…", error: "저장 실패 — 네트워크를 확인해 주세요" }[save];
  const safeName = (title.trim() || "글").replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 40);
  const hasText = !(stats?.empty ?? true);

  return (
    <div className={`we-editor ${panelOpen ? "with-panel" : ""}`}>
      <div className="we-main">
        <div className="we-bar">
          <a href="/dashboard" className="button"><ArrowLeft size={13} />새 글·홈</a>
          <input className="we-title" aria-label="문서 제목" value={title} maxLength={LIMITS.title} onChange={(e) => setTitle(e.target.value)} placeholder="제목 없는 글" />
          <span className="we-badge">{formatLabel}</span>
          <span className={`we-save ${save}`} role="status">{saveLabel}</span>
        </div>
        <div className="we-actions">
          <button type="button" onClick={copyRich} disabled={!hasText} title="서식을 유지한 채 복사(블로그·문서에 붙여 넣기)">
            {copied === "rich" ? <Check size={13} /> : <ClipboardCopy size={13} />}{copied === "rich" ? "복사 완료" : "서식 복사"}
          </button>
          <button type="button" onClick={copyMarkdown} disabled={!hasText}>
            {copied === "md" ? <Check size={13} /> : <FileText size={13} />}{copied === "md" ? "복사 완료" : "마크다운 복사"}
          </button>
          <button type="button" disabled={!hasText} onClick={() => editor && download(`${safeName}.md`, editor.getMarkdown(), "text/markdown;charset=utf-8")}><Download size={13} />.md</button>
          <button type="button" disabled={!hasText} onClick={() => editor && download(`${safeName}.html`, `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${escapeHtml(title || "글")}</title></head><body>${editor.getHTML()}</body></html>`, "text/html;charset=utf-8")}><Download size={13} />.html</button>
          <button type="button" disabled={!hasText} onClick={() => editor && download(`${safeName}.txt`, editor.getText({ blockSeparator: BLOCK }), "text/plain;charset=utf-8")}><Download size={13} />.txt</button>
          <button type="button" className="primary" disabled={analyzing || !hasText} onClick={() => void analyze()}>
            {analyzing ? <Loader2 size={13} className="we-spin" /> : <Wand2 size={13} />}글 분석
          </button>
          <span className="muted we-chars">{(stats?.chars ?? 0).toLocaleString("ko-KR")}자(공백 제외)</span>
        </div>
        {error && (
          <p role="alert" className="lp-alert">
            <span>{error.message}</span>
            {error.needKey && <a className="button" href="/settings">키 등록하러 가기</a>}
            <button type="button" aria-label="닫기" onClick={() => setError(null)}>×</button>
          </p>
        )}
        {notice && <p className="notice" role="status">{notice}</p>}
        <div className="we-sheet">
          {editor && <RichToolbar editor={editor} />}
          <div className="we-editor-wrap">
            <EditorContent editor={editor} />
            {editor && (
              <BubbleToolbar
                editor={editor}
                busy={busy}
                onAction={(a) => void rewrite({ action: a })}
                onInstruction={(t) => void rewrite({ instruction: t })}
              />
            )}
          </div>
        </div>
        {sources.length > 0 && (
          <details className="we-sources">
            <summary>참고한 출처 {sources.length}건</summary>
            <ul>{sources.map((s) => <li key={s.uri}><a href={s.uri} target="_blank" rel="noreferrer noopener">{s.title}</a></li>)}</ul>
          </details>
        )}
      </div>
      {panelOpen && (
        <SuggestionPanel
          suggestions={suggestions}
          analyzing={analyzing}
          note={note}
          hint="제안의 [적용]을 누르면 본문에서 그 문장을 다시 찾아 바꿉니다. 바꾼 뒤에는 Ctrl+Z로 되돌릴 수 있습니다."
          onApply={applyOne}
          onApplyAll={applyMany}
          onDismiss={(s) => setSuggestions((cur) => cur.filter((x) => x.originalText !== s.originalText))}
          onLocate={locate}
          onClose={() => setPanelOpen(false)}
          onRerun={() => void analyze()}
        />
      )}
    </div>
  );
}
