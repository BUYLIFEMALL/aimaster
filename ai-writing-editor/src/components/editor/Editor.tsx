"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, ClipboardCopy, Download, Loader2, Undo2, Wand2 } from "lucide-react";
import { FORMATS, LIMITS, type ActionId, type FormatId, type Source, type Suggestion } from "@/lib/we/types";
import { applyAll, charCount, deriveTitle, findRange, pushHistory, replaceOnce } from "@/lib/we/util";
import { FloatingToolbar, type SelectionInfo } from "./FloatingToolbar";
import { SuggestionPanel } from "./SuggestionPanel";
import { scrollToIndex } from "./caret";

type SaveState = "saved" | "dirty" | "saving" | "error";

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
  const [content, setContent] = useState(initialContent);
  const [history, setHistory] = useState<string[]>([]);
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; needKey?: boolean } | null>(null);
  const [save, setSave] = useState<SaveState>("saved");
  const [panelOpen, setPanelOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const programmatic = useRef(false);
  const first = useRef(true);
  const ranAuto = useRef(false);
  const formatLabel = FORMATS.find((f) => f.id === format)?.label ?? "자유 형식";

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

  // ---- 선택 영역 추적 ----
  const syncSelection = useCallback(() => {
    if (programmatic.current) return;
    const ta = editorRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    if (s === e) { setSelection(null); return; }
    const text = value.slice(s, e);
    setSelection(text.length > LIMITS.selection ? null : { start: s, end: e, text });
  }, []);

  const setContentTracked = useCallback((next: string, prev: string) => {
    setHistory((h) => pushHistory(h, prev));
    setContent(next);
  }, []);

  const placeCursor = useCallback((index: number) => {
    setTimeout(() => {
      const ta = editorRef.current;
      if (!ta) return;
      programmatic.current = true;
      ta.focus({ preventScroll: true });
      ta.setSelectionRange(index, index);
      setTimeout(() => { programmatic.current = false; }, 0);
    }, 0);
  }, []);

  function showError(message: string, needKey?: boolean) { setError({ message, needKey }); }

  // ---- 선택한 부분 수정 ----
  async function rewrite(payload: { action?: ActionId; instruction?: string }) {
    if (!selection || busy) return;
    const sel = selection;
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selection: sel.text, ...payload,
          before: content.slice(Math.max(0, sel.start - 400), sel.start),
          after: content.slice(sel.end, sel.end + 400),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.text !== "string") { showError(data.error ?? "수정하지 못했습니다.", !!data.needKey); return; }
      const r = replaceOnce(content, sel.text, data.text, sel.start);
      if (!r) { showError("선택한 문장이 그 사이 바뀌어 적용하지 못했습니다. 다시 선택해 주세요."); return; }
      setContentTracked(r.content, content);
      setSelection(null);
      placeCursor(r.index + data.text.length);
    } catch {
      showError("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally { setBusy(false); }
  }

  // ---- 전체 글 분석 ----
  const analyze = useCallback(async (text?: string) => {
    const body = text ?? content;
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
  }, [content]);

  useEffect(() => {
    if (autoAnalyze && !ranAuto.current) {
      ranAuto.current = true;
      void analyze(initialContent);
      window.history.replaceState(null, "", `/editor/${id}`);
    }
  }, [autoAnalyze, analyze, initialContent, id]);

  function applyOne(s: Suggestion) {
    const r = replaceOnce(content, s.originalText, s.suggestedText);
    if (!r) {
      setSuggestions((cur) => cur.filter((x) => x.originalText !== s.originalText));
      setNotice("본문에서 해당 문장을 찾지 못해 이 제안을 목록에서 뺐습니다(글이 바뀌었습니다).");
      return;
    }
    setContentTracked(r.content, content);
    setSuggestions((cur) => cur.filter((x) => x.originalText !== s.originalText));
    setNotice("");
  }

  function applyMany(list: Suggestion[]) {
    const r = applyAll(content, list);
    if (r.applied.length) setContentTracked(r.content, content);
    const done = new Set(list.map((s) => s.originalText));
    setSuggestions((cur) => cur.filter((s) => !done.has(s.originalText)));
    setNotice(`${r.applied.length}개를 적용했습니다.${r.skipped.length ? ` 본문에서 찾지 못한 ${r.skipped.length}개는 건너뛰었습니다.` : ""}`);
  }

  function locate(s: Suggestion) {
    const ta = editorRef.current;
    if (!ta) return;
    const i = findRange(content, s.originalText);
    if (i < 0) { setNotice("본문에서 해당 문장을 찾지 못했습니다."); return; }
    programmatic.current = true;
    ta.focus({ preventScroll: true });
    ta.setSelectionRange(i, i + s.originalText.length);
    scrollToIndex(ta, i);
    setSelection(null);
    setTimeout(() => { programmatic.current = false; }, 50);
  }

  function undo() {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setContent(prev);
      setSelection(null);
      return h.slice(0, -1);
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      const t = document.createElement("textarea");
      t.value = content;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const chars = useMemo(() => charCount(content), [content]);
  const saveLabel = { saved: "✓ 저장됨", dirty: "● 저장 대기", saving: "저장 중…", error: "저장 실패 — 네트워크를 확인해 주세요" }[save];
  const safeName = (title.trim() || "글").replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 40);

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
          <button type="button" onClick={undo} disabled={history.length === 0}><Undo2 size={13} />되돌리기</button>
          <button type="button" onClick={copy} disabled={!content.trim()}>
            {copied ? <Check size={13} /> : <ClipboardCopy size={13} />}{copied ? "복사 완료" : "본문 복사"}
          </button>
          <button type="button" disabled={!content.trim()} onClick={() => download(`${safeName}.md`, content, "text/markdown;charset=utf-8")}><Download size={13} />.md</button>
          <button type="button" disabled={!content.trim()} onClick={() => download(`${safeName}.txt`, content, "text/plain;charset=utf-8")}><Download size={13} />.txt</button>
          <button type="button" className="primary" disabled={analyzing || !content.trim()} onClick={() => void analyze()}>
            {analyzing ? <Loader2 size={13} className="we-spin" /> : <Wand2 size={13} />}글 분석
          </button>
          <span className="muted we-chars">{chars.toLocaleString("ko-KR")}자(공백 제외)</span>
        </div>
        {error && (
          <p role="alert" className="lp-alert">
            <span>{error.message}</span>
            {error.needKey && <a className="button" href="/settings">키 등록하러 가기</a>}
            <button type="button" aria-label="닫기" onClick={() => setError(null)}>×</button>
          </p>
        )}
        {notice && <p className="notice" role="status">{notice}</p>}
        <div className="we-editor-wrap">
          <textarea
            ref={editorRef}
            className="we-textarea"
            aria-label="본문 편집기"
            value={content}
            maxLength={LIMITS.document}
            spellCheck={false}
            placeholder="여기에 글을 쓰거나 붙여 넣으세요. 문장을 드래그하면 AI 수정 툴바가 나타납니다."
            onChange={(e) => { setContent(e.target.value); }}
            onSelect={syncSelection}
            onMouseUp={syncSelection}
            onKeyUp={syncSelection}
            onBlur={() => { /* 툴바 버튼 클릭 시에도 선택을 유지한다(툴바가 mousedown을 막음) */ }}
          />
          <FloatingToolbar
            selection={selection}
            editor={editorRef.current}
            busy={busy}
            onAction={(a) => void rewrite({ action: a })}
            onInstruction={(t) => void rewrite({ instruction: t })}
          />
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
          hint="제안의 [적용]을 누르면 본문에서 그 문장을 다시 찾아 바꿉니다."
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
